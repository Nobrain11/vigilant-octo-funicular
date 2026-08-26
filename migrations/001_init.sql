CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL UNIQUE,
  ref_code    TEXT NOT NULL UNIQUE,
  referrer_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id               TEXT PRIMARY KEY REFERENCES users(id),
  pubkey                TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  user_id               TEXT PRIMARY KEY REFERENCES users(id),
  auto_trade_enabled    BOOLEAN NOT NULL DEFAULT false,
  default_buy_size      TEXT NOT NULL DEFAULT '100000000', -- lamports
  default_slippage_bps  INT NOT NULL DEFAULT 50,
  default_tp_pct        INT NOT NULL DEFAULT 20,
  default_sl_pct        INT NOT NULL DEFAULT 10,
  max_open_positions    INT NOT NULL DEFAULT 5,
  hunter_filters        TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS positions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id),
  token_ca         TEXT NOT NULL,
  entry_avg        TEXT NOT NULL,
  size_lamports    TEXT NOT NULL,
  dca_plan         TEXT NOT NULL DEFAULT '[]',
  tp_levels        TEXT NOT NULL DEFAULT '[]',
  sl_level_price   TEXT,
  trailing_sl_pct  INT,
  status           TEXT NOT NULL DEFAULT 'OPEN',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  token_ca      TEXT NOT NULL,
  type          TEXT NOT NULL, -- LIMIT | DCA | SNIPE
  trigger_price TEXT,
  size_lamports TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  referrer_id   TEXT NOT NULL REFERENCES users(id),
  referee_id    TEXT NOT NULL REFERENCES users(id),
  tier          INT NOT NULL DEFAULT 1,
  kickback_rate NUMERIC NOT NULL DEFAULT 0.10,
  PRIMARY KEY (referrer_id, referee_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  metadata    TEXT NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
