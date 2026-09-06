-- GET /api/stores pages with `WHERE is_active ORDER BY created_at DESC, id DESC`.
-- Without this the keyset comparison still works but Postgres sorts the whole filtered set;
-- only the orders table had a matching composite index.
CREATE INDEX idx_stores_active_created ON stores (created_at DESC, id DESC)
  WHERE is_active = true;
