import { Generated, Insertable, Selectable, Updateable } from 'kysely';
import type { Position, Order, User, Wallet, Settings, Referral, AuditLog } from '../types.js';

export interface Database {
  users: {
    id: Generated<string>;
    telegramId: string;
    refCode: string;
    referrerId?: string;
    createdAt: Generated<Date>;
  };
  wallets: {
    userId: string;
    pubkey: string;
    encryptedPrivateKey: string;
    createdAt: Generated<Date>;
  };
  settings: {
    userId: string;
    autoTradeEnabled: boolean;
    defaultBuySizeLamports: string;
    defaultSlippageBps: number;
    defaultTpPct: number;
    defaultSlPct: number;
    maxOpenPositions: number;
    hunterFiltersJson: string;
  };
  positions: {
    id: Generated<string>;
    userId: string;
    tokenCa: string;
    entryAvgLamports: string;
    sizeLamports: string;
    dcaPlanJson: string;
    tpLevelsJson: string;
    slLevelPrice?: string;
    trailingSlPct?: number;
    status: 'OPEN' | 'CLOSED' | 'STOPPED';
    createdAt: Generated<Date>;
  };
  orders: {
    id: Generated<string>;
    userId: string;
    tokenCa: string;
    type: 'LIMIT' | 'DCA' | 'SNIPE';
    triggerPrice?: string;
    sizeLamports: string;
    status: 'PENDING' | 'FILLED' | 'CANCELLED';
  };
  referrals: {
    referrerId: string;
    refereeId: string;
    tier: number;
    kickbackRate: number;
  };
  audit_logs: {
    id: Generated<string>;
    userId: string;
    action: string;
    metadataJson: string;
    createdAt: Generated<Date>;
  };
}

export type UserRow = Selectable<Database['users']>;
export type InsertUser = Insertable<Database['users']>;
export type WalletRow = Selectable<Database['wallets']>;
export type SettingsRow = Selectable<Database['settings']>;
export type PositionRow = Selectable<Database['positions']>;
export type OrderRow = Selectable<Database['orders']>;
