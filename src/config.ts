import 'dotenv/config';

export const config = {
  tgBotToken: process.env.TG_BOT_TOKEN!,
  rpcUrl: process.env.RPC_URL!,
  databaseUrl: process.env.DATABASE_URL!,
  encKey: process.env.JWT_SECRET_OR_ENC_KEY!,
};
