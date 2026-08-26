import TelegramBot from 'node-telegram-bot-api';
import { Connection, PublicKey } from '@solana/web3.js';
import { db, ensureUser, getWallet, upsertSettings, createPosition } from '../db/repo.js';
import { createKeypair, encryptKeypair, decryptKeypair, saveWallet } from '../solana/wallet.js';
import { buyToken } from '../solana/executor.js';
import { checkTokenSafety } from '../solana/token.js';
import { buyKeyboard } from './keyboards.js';
import { config } from '../config.js';

const connection = new Connection(config.rpcUrl, 'confirmed');
const LAMPORTS_PER_SOL = 1_000_000_000;

export function registerCommands(bot: TelegramBot) {
  bot.onText(/^\/start(.*)$/, async (msg, match) => {
    if (!msg.from) return;
    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);
    const refParam = match?.[1]?.replace('?', '').split('=')[1];
    const refCode = refParam || `u_${telegramId}`;
    await ensureUser(telegramId, refCode, refParam ? `u_${refParam}` : undefined);
    await bot.sendMessage(chatId, 'Welcome! Use /wallet, /settings, /auto on|off, or paste a CA to buy.');
  });

  bot.onText(/^\/wallet$/, async (msg) => {
    if (!msg.from) return;
    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);
    const user = await ensureUser(telegramId, `u_${telegramId}`);
    const existing = await getWallet(user.id);
    if (existing) {
      await bot.sendMessage(chatId, `Your wallet: ${existing.pubkey}\nUse /export to backup private key.`);
      return;
    }
    const kp = createKeypair();
    const enc = encryptKeypair(kp);
    await saveWallet(user.id, kp.publicKey.toBase58(), enc);
    await bot.sendMessage(chatId, `New wallet created: ${kp.publicKey.toBase58()}\n⚠️ Backup your private key now with /export. Never import your main wallet.`);
  });

  bot.onText(/^\/export$/, async (msg) => {
    if (!msg.from) return;
    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);
    const user = await ensureUser(telegramId, `u_${telegramId}`);
    const w = await getWallet(user.id);
    if (!w) return bot.sendMessage(chatId, 'No wallet found. Create one with /wallet.');
    await bot.sendMessage(chatId, `⚠️ Private key (encrypted base58): ${w.encryptedPrivateKey}\n\nStore it offline and delete this message.`);
  });

  bot.onText(/^\/auto\s+(on|off)$/i, async (msg, match) => {
    if (!msg.from) return;
    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);
    const user = await ensureUser(telegramId, `u_${telegramId}`);
    const state = match![1].toLowerCase() === 'on';
    await upsertSettings(user.id, { autoTradeEnabled: state });
    await bot.sendMessage(chatId, `Auto trade: ${state ? 'ON' : 'OFF'}`);
  });

  bot.onText(/^\/buy\s+([A-Za-z0-9]+)$/, async (msg, match) => {
    if (!msg.from) return;
    const chatId = msg.chat.id;
    const ca = match![1];
    await bot.sendMessage(chatId, `Token CA: ${ca}\nChoose buy size:`, { reply_markup: buyKeyboard(ca) });
  });

  bot.onText(/^([A-Za-z0-9]{32,44})$/, async (msg) => {
    if (!msg.from) return;
    const chatId = msg.chat.id;
    const ca = msg.text!;
    await bot.sendMessage(chatId, `Detected CA: ${ca}\nTap Buy below.`, { reply_markup: buyKeyboard(ca) });
  });

  bot.on('callback_query', async (query) => {
    const data = query.data!;
    const chatId = query.message!.chat.id;
    const telegramId = String(query.from.id);

    if (data.startsWith('buy_')) {
      const parts = data.split('_');
      const ca = parts[1];
      const sizeLabel = parts[2];

      if (sizeLabel === 'cancel') {
        await bot.editMessageText('Buy cancelled.', { chat_id: chatId, message_id: query.message!.message_id });
        return;
      }

      const user = await ensureUser(telegramId, `u_${telegramId}`);
      const wallet = await getWallet(user.id);
      if (!wallet) {
        await bot.answerCallbackQuery(query.id, { text: 'Create a wallet first with /wallet' });
        return;
      }

      const safety = await checkTokenSafety(connection, new PublicKey(ca));
      if (!safety.ok) {
        await bot.editMessageText(`⚠️ Safety check failed for ${ca}:\n- ${safety.reasons.join('\n- ')}`, {
          chat_id: chatId, message_id: query.message!.message_id
        });
        return;
      }

      const sizeSol = sizeLabel === 'custom' ? 0.1 : parseFloat(sizeLabel);
      const sizeLamports = Math.floor(sizeSol * LAMPORTS_PER_SOL);
      const settings = await upsertSettings(user.id, {});
      const slippage = settings.defaultSlippageBps;

      const confirmMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: `✅ Confirm Buy ${sizeSol} SOL`, callback_data: `confirm_${ca}_${sizeLamports}` }],
          [{ text: 'Cancel', callback_data: `cancel_${ca}` }]
        ]
      };
      await bot.editMessageText(`Buy ${sizeSol} SOL of ${ca}?\nSlippage: ${slippage / 100}%`, {
        chat_id: chatId, message_id: query.message!.message_id, reply_markup: confirmMarkup
      });
    }

    if (data.startsWith('confirm_')) {
      const [, ca, sizeLamports] = data.split('_');
      const user = await ensureUser(telegramId, `u_${telegramId}`);
      const wallet = await getWallet(user.id);
      if (!wallet) {
        await bot.answerCallbackQuery(query.id, { text: 'No wallet found' });
        return;
      }
      const kp = decryptKeypair(wallet.encryptedPrivateKey);
      const settings = await upsertSettings(user.id, {});

      await bot.editMessageText(`Executing buy of ${Number(sizeLamports) / LAMPORTS_PER_SOL} SOL for ${ca}...`, {
        chat_id: chatId, message_id: query.message!.message_id
      });

      try {
        const sig = await buyToken(kp, ca, Number(sizeLamports), settings.defaultSlippageBps);
        await createPosition({
          userId: user.id, tokenCa: ca,
          entryAvgLamports: '0', sizeLamports,
          dcaPlanJson: '[]', tpLevelsJson: '[]'
        });
        await bot.sendMessage(chatId, `✅ Bought ${ca}\nTx: ${sig}\n\nUse /tp and /sl to set exits.`);
      } catch (e: any) {
        await bot.sendMessage(chatId, `❌ Buy failed: ${e.message}`);
      }
    }
  });
}
