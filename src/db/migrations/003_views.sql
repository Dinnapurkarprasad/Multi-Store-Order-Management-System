-- Analytics must cover hot + archived data, otherwise revenue drops every time we archive.
-- Postgres pushes filters into each UNION ALL branch, so both branches use their own indexes.
CREATE OR REPLACE VIEW orders_all AS
  SELECT id, store_id, user_id, total_amount, status, created_at FROM orders
  UNION ALL
  SELECT id, store_id, user_id, total_amount, status, created_at FROM orders_archive;

CREATE OR REPLACE VIEW order_items_all AS
  SELECT order_id, item_id, item_name, unit_price, qty, line_total FROM order_items
  UNION ALL
  SELECT order_id, item_id, item_name, unit_price, qty, line_total FROM order_items_archive;
