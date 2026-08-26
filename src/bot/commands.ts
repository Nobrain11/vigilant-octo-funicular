import TelegramBot from 'node-telegram-bot-api';
import { db, ensureUser, getWallet, upsertSettings, createPosition } from '../db/repo.js';
import { decryptKeypair } from '../solana/wallet.js';
import { buyToken } from '../solana/executor.js';
import { checkTokenSafety } from '../solana/token.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { config } from '../config.js';

const connection = new Connection(config.rpcUrl, 'confirmed');
const LAMPORTS_PER_SOL = 1_000_000_000;

export function registerCommands(bot: TelegramBot) {
  // ... existing /start, /wallet, /export, /auto, /buy handlers ...

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

      // Safety check
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

      // Ask for confirmation before spending
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
      const wallet = await getWallet(user.id)!;
      const kp = decryptKeypair(wallet.encryptedPrivateKey);
      const settings = await upsertSettings(user.id, {});

      await bot.editMessageText(`Executing buy of ${Number(sizeLamports) / LAMPORTS_PER_SOL} SOL for ${ca}...`, {
        chat_id: chatId, message_id: query.message!.message_id
      });

      try {
        const sig = await buyToken(kp, ca, Number(sizeLamports), settings.defaultSlippageBps);
        await createPosition({
          userId: user.id, tokenCa: ca,
          entryAvgLamports: '0', // TODO: derive from quote
          sizeLamports, dcaPlanJson: '[]', tpLevelsJson: '[]'
        });
        await bot.sendMessage(chatId, `✅ Bought ${ca}\nTx: ${sig}\n\nUse /tp and /sl to set exits.`);
      } catch (e: any) {
        await bot.sendMessage(chatId, `❌ Buy failed: ${e.message}`);
      }
    }
  });
}
