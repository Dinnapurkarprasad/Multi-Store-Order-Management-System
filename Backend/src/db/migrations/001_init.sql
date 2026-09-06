CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- users ----------
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,          -- always stored lowercased by the app
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('ADMIN','STORE_OWNER','USER')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- refresh tokens ----------
CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,             -- sha256 of the token, never the raw token
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);

-- ---------- stores ----------
CREATE TABLE stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stores_owner ON stores(owner_id);

-- ---------- items ----------
CREATE TABLE items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  price        NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  image_url    TEXT,                              -- optional, set by the store owner
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_items_store ON items(store_id);

-- ---------- orders ----------
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  total_amount    NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  status          TEXT NOT NULL DEFAULT 'PLACED'
                    CHECK (status IN ('PLACED','PREPARING','COMPLETED')),
  idempotency_key TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- order_items ----------
CREATE TABLE order_items (
  id         BIGSERIAL PRIMARY KEY,
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id    UUID NOT NULL REFERENCES items(id),
  item_name  TEXT NOT NULL,                     -- snapshot: item may be renamed later
  unit_price NUMERIC(12,2) NOT NULL,            -- snapshot: price may change later
  qty        INTEGER NOT NULL CHECK (qty > 0),
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (unit_price * qty) STORED
);

-- ---------- indexes ----------
-- main list query: WHERE store_id = $1 ORDER BY created_at DESC, id DESC  (keyset paging)
CREATE INDEX idx_orders_store_created ON orders (store_id, created_at DESC, id DESC);
-- required by the spec + used by the archival scan (created_at < now() - 30 days)
CREATE INDEX idx_orders_created       ON orders (created_at);
-- "my orders" page for a normal user
CREATE INDEX idx_orders_user_created  ON orders (user_id, created_at DESC, id DESC);
-- store owner's live queue: only ~few rows, partial index keeps it tiny
CREATE INDEX idx_orders_active        ON orders (store_id, created_at DESC)
  WHERE status <> 'COMPLETED';
-- join from order -> lines, and the "top selling items" aggregation
CREATE INDEX idx_order_items_order    ON order_items (order_id);
CREATE INDEX idx_order_items_item     ON order_items (item_id);
-- one line per item per order (qty gets merged instead of duplicated)
CREATE UNIQUE INDEX uq_order_items    ON order_items (order_id, item_id);
-- idempotent order creation
CREATE UNIQUE INDEX uq_orders_idem    ON orders (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
