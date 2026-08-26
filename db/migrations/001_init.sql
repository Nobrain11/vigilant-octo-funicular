CREATE TABLE IF NOT EXISTS settings (
  userId              TEXT PRIMARY KEY REFERENCES users(id),
  autoTradeEnabled    BOOLEAN NOT NULL DEFAULT false,
  defaultBuySizeLamports TEXT NOT NULL DEFAULT '100000000',
  defaultSlippageBps INT NOT NULL DEFAULT 50,
  defaultTpPct       INT NOT NULL DEFAULT 20,
  defaultSlPct       INT NOT NULL DEFAULT 10,
  maxOpenPositions   INT NOT NULL DEFAULT 5,
  hunterFiltersJson  TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS positions (
  id            TEXT PRIMARY KEY,
  userId        TEXT NOT NULL REFERENCES users(id),
  tokenCa       TEXT NOT NULL,
  entryAvgLamports TEXT NOT NULL,
  sizeLamports  TEXT NOT NULL,
  dcaPlanJson   TEXT NOT NULL DEFAULT '[]',
  tpLevelsJson  TEXT NOT NULL DEFAULT '[]',
  slLevelPrice  TEXT,
  trailingSlPct INT,
  status        TEXT NOT NULL DEFAULT 'OPEN',
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id           TEXT PRIMARY KEY,
  userId       TEXT NOT NULL REFERENCES users(id),
  tokenCa      TEXT NOT NULL,
  type         TEXT NOT NULL,
  triggerPrice TEXT,
  sizeLamports TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'PENDING',
  createdAt    TIMESTAMPTZ NOT NULL DEFAULT now()
);
