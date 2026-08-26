CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  telegramId TEXT NOT NULL UNIQUE,
  refCode    TEXT NOT NULL UNIQUE,
  referrerId TEXT,
  createdAt  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  userId              TEXT PRIMARY KEY REFERENCES users(id),
  pubkey              TEXT NOT NULL,
  encryptedPrivateKey TEXT NOT NULL,
  createdAt           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  userId                 TEXT PRIMARY KEY REFERENCES users(id),
  autoTradeEnabled       BOOLEAN NOT NULL DEFAULT false,
  defaultBuySizeLamports TEXT NOT NULL DEFAULT '100000000',
  defaultSlippageBps     INT NOT NULL DEFAULT 50,
  defaultTpPct           INT NOT NULL DEFAULT 20,
  defaultSlPct           INT NOT NULL DEFAULT 10,
  maxOpenPositions       INT NOT NULL DEFAULT 5,
  hunterFiltersJson      TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS positions (
  id               TEXT PRIMARY KEY,
  userId           TEXT NOT NULL REFERENCES users(id),
  tokenCa          TEXT NOT NULL,
  entryAvgLamports TEXT NOT NULL,
  sizeLamports     TEXT NOT NULL,
  dcaPlanJson      TEXT NOT NULL DEFAULT '[]',
  tpLevelsJson     TEXT NOT NULL DEFAULT '[]',
  slLevelPrice     TEXT,
  trailingSlPct    INT,
  status           TEXT NOT NULL DEFAULT 'OPEN',
  createdAt        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id           TEXT PRIMARY KEY,
  userId       TEXT NOT NULL REFERENCES users(id),
  tokenCa      TEXT NOT NULL,
  type         TEXT NOT NULL, -- LIMIT | DCA | SNIPE
  triggerPrice TEXT,
  sizeLamports TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'PENDING',
  createdAt    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  referrerId   TEXT NOT NULL REFERENCES users(id),
  refereeId    TEXT NOT NULL REFERENCES users(id),
  tier         INT NOT NULL DEFAULT 1,
  kickbackRate NUMERIC NOT NULL DEFAULT 0.10,
  PRIMARY KEY (referrerId, refereeId)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id           TEXT PRIMARY KEY,
  userId       TEXT NOT NULL REFERENCES users(id),
  action       TEXT NOT NULL,
  metadataJson TEXT NOT NULL DEFAULT '{}',
  createdAt    TIMESTAMPTZ NOT NULL DEFAULT now()
);
