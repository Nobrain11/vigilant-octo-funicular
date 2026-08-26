export type User = {
  id: string;
  telegramId: string;
  refCode: string;
  referrerId?: string;
  createdAt: Date;
};

export type Wallet = {
  userId: string;
  pubkey: string;
  encryptedPrivateKey: string; // base64
  createdAt: Date;
};

export type Settings = {
  userId: string;
  autoTradeEnabled: boolean;
  defaultBuySizeLamports: string;
  defaultSlippageBps: number;
  defaultTpPct: number;
  defaultSlPct: number;
  maxOpenPositions: number;
  hunterFiltersJson: string; // JSON
};

export type Position = {
  id: string;
  userId: string;
  tokenCa: string;
  entryAvgLamports: string;
  sizeLamports: string;
  dcaPlanJson: string;
  tpLevelsJson: string;
  slLevelPrice?: string;
  trailingSlPct?: number;
  status: 'OPEN' | 'CLOSED' | 'STOPPED';
  createdAt: Date;
};

export type Order = {
  id: string;
  userId: string;
  tokenCa: string;
  type: 'LIMIT' | 'DCA' | 'SNIPE';
  triggerPrice?: string;
  sizeLamports: string;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
};

export type Referral = {
  referrerId: string;
  refereeId: string;
  tier: number;
  kickbackRate: number;
};

export type AuditLog = {
  id: string;
  userId: string;
  action: string;
  metadataJson: string;
  createdAt: Date;
};
