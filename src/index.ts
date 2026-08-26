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

// Engines (run on intervals)
setInterval(runDcaEngine, 10000);
setInterval(runLimitEngine, 10000);
setInterval(runTpSlEngine, 10000);
setInterval(runHunter, 15000);

console.log('Bot is running...');
