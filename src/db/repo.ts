import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database, InsertUser, UserRow, WalletRow, SettingsRow, PositionRow, OrderRow } from './schema.js';
import { config } from '../config.js';

const pool = new Pool({ connectionString: config.databaseUrl });
export const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });

export async function ensureUser(telegramId: string, refCode: string, referrerId?: string): Promise<UserRow> {
  const existing = await db.selectFrom('users').where('telegramId', '=', telegramId).selectAll().executeTakeFirst();
  if (existing) return existing;
  return await db.insertInto('users').values({ telegramId, refCode, referrerId }).returningAll().executeTakeFirstOrThrow();
}

export async function getWallet(userId: string): Promise<WalletRow | undefined> {
  return await db.selectFrom('wallets').where('userId', '=', userId).selectAll().executeTakeFirst();
}

export async function saveWallet(userId: string, pubkey: string, encryptedPrivateKey: string): Promise<void> {
  await db.insertInto('wallets').values({ userId, pubkey, encryptedPrivateKey }).execute();
}

export async function getSettings(userId: string): Promise<SettingsRow | undefined> {
  return await db.selectFrom('settings').where('userId', '=', userId).selectAll().executeTakeFirst();
}

export async function upsertSettings(userId: string, vals: Partial<Database['settings']>): Promise<SettingsRow> {
  const existing = await getSettings(userId);
  if (existing) {
    return await db.updateTable('settings').set(vals).where('userId', '=', userId).returningAll().executeTakeFirstOrThrow();
  }
  const base = {
    userId,
    autoTradeEnabled: false,
    defaultBuySizeLamports: '100000000',
    defaultSlippageBps: 50,
    defaultTpPct: 20,
    defaultSlPct: 10,
    maxOpenPositions: 5,
    hunterFiltersJson: '{}',
  };
  return await db.insertInto('settings').values({ ...base, ...vals } as any).returningAll().executeTakeFirstOrThrow();
}

export async function createPosition(p: {
  userId: string; tokenCa: string; entryAvgLamports: string; sizeLamports: string;
  dcaPlanJson: string; tpLevelsJson: string; slLevelPrice?: string; trailingSlPct?: number;
}): Promise<PositionRow> {
  return await db.insertInto('positions').values({ ...p, status: 'OPEN' }).returningAll().executeTakeFirstOrThrow();
}

export async function createOrder(o: {
  userId: string; tokenCa: string; type: 'LIMIT'|'DCA'|'SNIPE'; triggerPrice?: string; sizeLamports: string;
}): Promise<OrderRow> {
  return await db.insertInto('orders').values({ ...o, status: 'PENDING' }).returningAll().executeTakeFirstOrThrow();
}
