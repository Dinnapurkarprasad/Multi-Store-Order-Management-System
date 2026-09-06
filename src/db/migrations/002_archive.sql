-- No foreign keys on purpose: an archive must survive a later store/item deletion.
-- That is why item_name / unit_price are snapshotted.
CREATE TABLE orders_archive (
  id           UUID PRIMARY KEY,
  store_id     UUID NOT NULL,
  user_id      UUID NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  status       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL,
  archived_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_arch_orders_store_created ON orders_archive (store_id, created_at DESC);
CREATE INDEX idx_arch_orders_created       ON orders_archive (created_at);
CREATE INDEX idx_arch_orders_user_created  ON orders_archive (user_id, created_at DESC);

CREATE TABLE order_items_archive (
  id         BIGINT PRIMARY KEY,
  order_id   UUID NOT NULL,
  item_id    UUID NOT NULL,
  item_name  TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  qty        INTEGER NOT NULL,
  line_total NUMERIC(12,2) NOT NULL
);
CREATE INDEX idx_arch_items_order ON order_items_archive (order_id);
CREATE INDEX idx_arch_items_item  ON order_items_archive (item_id);
