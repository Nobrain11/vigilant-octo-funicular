import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { registerCommands } from './bot/commands.js';
import { registerHandlers } from './bot/handlers.js';
import { runDcaEngine } from './engine/dca.js';
import { runLimitEngine } from './engine/limits.js';
import { runTpSlEngine } from './engine/tpSl.js';
import { runHunter } from './engine/hunter.js';

const bot = new TelegramBot(config.tgBotToken, { polling: true });

registerCommands(bot);
registerHandlers(bot);

function safe(fn: () => Promise<void>) {
  return async () => {
    try { await fn(); } catch (e) { console.error('Engine error:', e); }
  };
}

setInterval(safe(runDcaEngine), 10_000);
setInterval(safe(runLimitEngine), 10_000);
setInterval(safe(runTpSlEngine), 10_000);
setInterval(safe(runHunter), 15_000);

console.log('Bot is running...');
