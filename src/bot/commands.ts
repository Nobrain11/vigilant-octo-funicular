import TelegramBot from 'node-telegram-bot-api';
import { db, ensureUser, upsertSettings, saveWallet, getWallet } from '../db/repo.js';
import { createKeypair, encryptKeypair, keypairFromPrivateKeyBase58 } from '../solana/wallet.js';
import { buyKeyboard } from './keyboards.js';

export function registerCommands(bot: TelegramBot) {
  bot.onText(/^\/start(.*)$/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);
    const refParam = msg.matches?.[1]?.replace('?', '').split('=')[1];
    const refCode = refParam || '';
    await ensureUser(telegramId, refCode || `u_${telegramId}`, refParam ? `u_${refParam}` : undefined);
    await bot.sendMessage(chatId, 'Welcome! Use /wallet to create/import, /settings for defaults, /auto on|off, /buy <CA> or paste CA.');
  });

  bot.onText(/^\/wallet$/, async (msg) => {
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
    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);
    const user = await ensureUser(telegramId, `u_${telegramId}`);
    const w = await getWallet(user.id);
    if (!w) return bot.sendMessage(chatId, 'No wallet found. Create one with /wallet.');
    await bot.sendMessage(chatId, `⚠️ Private key (encrypted base58): ${w.encryptedPrivateKey}\n\nStore it offline and delete this message.`);
  });

  bot.onText(/^\/auto\s+(on|off)$/i, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);
    const user = await ensureUser(telegramId, `u_${telegramId}`);
    const state = msg.matches![1].toLowerCase() === 'on';
    await upsertSettings(user.id, { autoTradeEnabled: state });
    await bot.sendMessage(chatId, `Auto trade: ${state ? 'ON' : 'OFF'}`);
  });

  bot.onText(/^\/buy\s+([A-Za-z0-9]+)$/, async (msg) => {
    const chatId = msg.chat.id;
    const ca = msg.matches![1];
    await bot.sendMessage(chatId, `Token CA: ${ca}\nChoose buy size:`, { reply_markup: buyKeyboard(ca) });
  });

  bot.onText(/^([A-Za-z0-9]{32,44})$/, async (msg) => {
    const chatId = msg.chat.id;
    const ca = msg.text!;
    await bot.sendMessage(chatId, `Detected CA: ${ca}\nUse /buy ${ca} or tap Buy below.`, { reply_markup: buyKeyboard(ca) });
  });

  bot.on('callback_query', async (query) => {
    const data = query.data!;
    if (data.startsWith('buy_')) {
      const parts = data.split('_');
      const ca = parts[1];
      const size = parts[2];
      await bot.answerCallbackQuery(query.id, { text: `Selected ${size} SOL for ${ca}. Implement confirmation + swap next.` });
      // TODO: implement confirmation flow, then execute swap via Jupiter
    }
  });
}
