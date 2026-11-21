-- The current Pages Function uses a single key/value table with etags for atomic compare-and-swap.
-- The older orders/reward_codes/rate_limits tables from 0001 are legacy and are not read by the function.
CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL,
  etag INTEGER NOT NULL DEFAULT 1,
  t INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS kv_t ON kv (t);
