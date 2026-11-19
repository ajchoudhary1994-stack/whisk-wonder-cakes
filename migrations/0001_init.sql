-- Whisk & Wonder rewards store (Cloudflare D1).
CREATE TABLE IF NOT EXISTS orders (
  id         TEXT PRIMARY KEY,
  status     TEXT NOT NULL CHECK (status IN ('pending', 'paid')),
  data       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_status ON orders (status);

CREATE TABLE IF NOT EXISTS reward_codes (
  code       TEXT PRIMARY KEY,
  status     TEXT NOT NULL CHECK (status IN ('unused', 'used')),
  order_id   TEXT,
  phone      TEXT,
  amount     INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  used_at    TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key   TEXT PRIMARY KEY,
  hour  INTEGER NOT NULL,
  count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_hour ON rate_limits (hour);
