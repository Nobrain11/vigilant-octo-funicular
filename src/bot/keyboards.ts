import TelegramBot from 'node-telegram-bot-api';

export function buyKeyboard(ca: string): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Buy 0.1 SOL', ucallback_data: `buy_${ca}_0.1` }],
      [{ text: 'Buy 0.5 SOL', callback_data: `buy_${ca}_0.5` }],
      [{ text: 'Custom', callback_data: `buy_${ca}_custom` }],
      [{ text: 'Cancel', callback_data: `buy_${ca}_cancel` }]
    ]
  };
}
