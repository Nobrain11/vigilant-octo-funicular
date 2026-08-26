import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import type {
  Database,
  UserRow,
  WalletRow,
  SettingsRow,
  PositionRow,
  OrderRow
} from './schema.js';
import { config } from '../config.js';

const pool = new Pool({
  connectionString: config.databaseUrl
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool
  })
});

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (schemaReady) {
    return schemaReady;
  }

  schemaReady = (async () => {
    await sql`
      CREATE EXTENSION IF NOT EXISTS pgcrypto
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "telegramId" TEXT NOT NULL UNIQUE,
        "refCode" TEXT NOT NULL,
        "referrerId" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS wallets (
        "userId" UUID PRIMARY KEY
          REFERENCES users(id) ON DELETE CASCADE,
        pubkey TEXT NOT NULL UNIQUE,
        "encryptedPrivateKey" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        "userId" UUID PRIMARY KEY
          REFERENCES users(id) ON DELETE CASCADE,
        "autoTradeEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
        "defaultBuySizeLamports" TEXT NOT NULL DEFAULT '100000000',
        "defaultSlippageBps" INTEGER NOT NULL DEFAULT 50,
        "defaultTpPct" INTEGER NOT NULL DEFAULT 20,
        "defaultSlPct" INTEGER NOT NULL DEFAULT 10,
        "maxOpenPositions" INTEGER NOT NULL DEFAULT 5,
        "hunterFiltersJson" TEXT NOT NULL DEFAULT '{}'
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL
          REFERENCES users(id) ON DELETE CASCADE,
        "tokenCa" TEXT NOT NULL,
        "entryAvgLamports" TEXT NOT NULL,
        "sizeLamports" TEXT NOT NULL,
        "dcaPlanJson" TEXT NOT NULL DEFAULT '[]',
        "tpLevelsJson" TEXT NOT NULL DEFAULT '[]',
        "slLevelPrice" TEXT,
        "trailingSlPct" DOUBLE PRECISION,
        status TEXT NOT NULL DEFAULT 'OPEN',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT positions_status_check
          CHECK (
            status IN (
              'OPEN',
              'CLOSED',
              'STOPPED'
            )
          )
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL
          REFERENCES users(id) ON DELETE CASCADE,
        "tokenCa" TEXT NOT NULL,
        type TEXT NOT NULL,
        "triggerPrice" TEXT,
        "sizeLamports" TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        CONSTRAINT orders_type_check
          CHECK (
            type IN (
              'LIMIT',
              'DCA',
              'SNIPE'
            )
          ),
        CONSTRAINT orders_status_check
          CHECK (
            status IN (
              'PENDING',
              'FILLED',
              'CANCELLED'
            )
          )
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS referrals (
        "referrerId" UUID NOT NULL
          REFERENCES users(id) ON DELETE CASCADE,
        "refereeId" UUID NOT NULL
          REFERENCES users(id) ON DELETE CASCADE,
        tier INTEGER NOT NULL,
        "kickbackRate" DOUBLE PRECISION NOT NULL,
        PRIMARY KEY (
          "referrerId",
          "refereeId"
        )
      )
    `.execute(db);

    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL
          REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        "metadataJson" TEXT NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_positions_user
      ON positions ("userId")
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_positions_status
      ON positions (status)
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_user
      ON orders ("userId")
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_status
      ON orders (status)
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user
      ON audit_logs ("userId")
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created
      ON audit_logs ("createdAt")
    `.execute(db);
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

export async function ensureUser(
  telegramId: string,
  refCode: string,
  referrerId?: string
): Promise<UserRow> {
  await ensureSchema();

  const existing = await db
    .selectFrom('users')
    .where(
      'telegramId',
      '=',
      telegramId
    )
    .selectAll()
    .executeTakeFirst();

  if (existing) {
    return existing;
  }

  return await db
    .insertInto('users')
    .values({
      telegramId,
      refCode,
      referrerId
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getWallet(
  userId: string
): Promise<WalletRow | undefined> {
  await ensureSchema();

  return await db
    .selectFrom('wallets')
    .where(
      'userId',
      '=',
      userId
    )
    .selectAll()
    .executeTakeFirst();
}

export async function saveWallet(
  userId: string,
  pubkey: string,
  encryptedPrivateKey: string
): Promise<void> {
  await ensureSchema();

  await db
    .insertInto('wallets')
    .values({
      userId,
      pubkey,
      encryptedPrivateKey
    })
    .execute();
}

export async function getSettings(
  userId: string
): Promise<SettingsRow | undefined> {
  await ensureSchema();

  return await db
    .selectFrom('settings')
    .where(
      'userId',
      '=',
      userId
    )
    .selectAll()
    .executeTakeFirst();
}

export async function upsertSettings(
  userId: string,
  vals: Partial<Database['settings']>
): Promise<SettingsRow> {
  await ensureSchema();

  const existing = await getSettings(userId);

  if (existing) {
    return await db
      .updateTable('settings')
      .set(vals)
      .where(
        'userId',
        '=',
        userId
      )
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  const base = {
    userId,
    autoTradeEnabled: false,
    defaultBuySizeLamports: '100000000',
    defaultSlippageBps: 50,
    defaultTpPct: 20,
    defaultSlPct: 10,
    maxOpenPositions: 5,
    hunterFiltersJson: '{}'
  };

  return await db
    .insertInto('settings')
    .values({
      ...base,
      ...vals
    } as any)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createPosition(
  p: {
    userId: string;
    tokenCa: string;
    entryAvgLamports: string;
    sizeLamports: string;
    dcaPlanJson: string;
    tpLevelsJson: string;
    slLevelPrice?: string;
    trailingSlPct?: number;
  }
): Promise<PositionRow> {
  await ensureSchema();

  return await db
    .insertInto('positions')
    .values({
      ...p,
      status: 'OPEN'
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createOrder(
  o: {
    userId: string;
    tokenCa: string;
    type: 'LIMIT' | 'DCA' | 'SNIPE';
    triggerPrice?: string;
    sizeLamports: string;
  }
): Promise<OrderRow> {
  await ensureSchema();

  return await db
    .insertInto('orders')
    .values({
      ...o,
      status: 'PENDING'
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}
