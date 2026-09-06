# Backend Implementation Spec — Multi-Store Order Management System

> Hand this file to Claude Code as the single source of truth for the backend.
> Build **only** what is described here. If something is ambiguous, pick the simpler option
> and record the choice in `README.md → Assumptions`.

---

## 1. Goal

A multi-store order management backend with three roles, real-time order events, analytics,
and a data-archival job. Graded on: clean architecture, API design, validation, DB indexing,
query optimization, and scalability.

**Non-goals (do NOT build):** payments, delivery/logistics, inventory stock counts, image
uploads, email/OTP, admin approval workflows, refunds, reviews/ratings.

---

## 2. Tech stack (fixed)

| Concern | Choice |
|---|---|
| Runtime | Node.js 20+, ESM (`"type": "module"`) |
| Language | TypeScript (strict) |
| Framework | Express 4 |
| DB | Neon Postgres (serverless) |
| DB client | `pg` (node-postgres) with raw SQL — **no ORM** |
| Migrations | Plain `.sql` files + a tiny custom runner |
| Validation | Zod |
| Auth | JWT (access + refresh), `bcryptjs` |
| Realtime | Socket.IO v4 |
| Logging | `pino` + `pino-http` |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Dev | `tsx watch`, build with `tsc` |

**Why raw SQL, not an ORM:** the assessment explicitly grades indexing and query
optimization. Hand-written SQL makes the `EXPLAIN`-friendly queries visible in the repo.

### Dependencies

```
dependencies:  express cors helmet compression pino pino-http express-rate-limit
               pg zod jsonwebtoken bcryptjs socket.io dotenv node-cron
devDependencies: typescript tsx @types/node @types/express @types/pg
               @types/jsonwebtoken @types/bcryptjs @types/cors @types/compression
```

---

## 3. Roles & permission matrix

Three roles: `ADMIN`, `STORE_OWNER`, `USER`.

| Action | USER | STORE_OWNER | ADMIN |
|---|---|---|---|
| Register / login | ✅ | ✅ | seeded only |
| Browse stores & items | ✅ | ✅ | ✅ |
| Create store | ❌ | ✅ (own) | ✅ |
| Create / edit items | ❌ | ✅ (own store) | ✅ |
| Place order | ✅ | ❌ | ❌ |
| List orders | own only | own stores only | all |
| Update order status | ❌ | own store's orders | ✅ |
| Analytics | own order history only | scoped to own stores | all stores |
| Archive old orders | ❌ | ❌ | ✅ |

**Rule:** authorization is enforced in the **service layer**, not just middleware.
Middleware checks the role; the service checks *ownership* (does this store belong to this user?).
Never trust `store_id` from the request body for a write — always verify ownership first.

---

## 4. Folder structure (MVC + service layer)

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts                 # zod-validated process.env, exported as `env`
│   │   └── constants.ts           # ROLES, ORDER_STATUS, STATUS_TRANSITIONS, limits
│   ├── db/
│   │   ├── pool.ts                # pg Pool + query() + withTransaction()
│   │   ├── migrate.ts             # runs migrations/*.sql in order, tracks in _migrations
│   │   ├── seed.ts                # demo admin/owners/users/stores/items/orders
│   │   └── migrations/
│   │       ├── 001_init.sql
│   │       ├── 002_archive.sql
│   │       └── 003_views.sql
│   ├── models/                    # SQL only. No business rules, no req/res.
│   │   ├── user.model.ts
│   │   ├── token.model.ts
│   │   ├── store.model.ts
│   │   ├── item.model.ts
│   │   ├── order.model.ts
│   │   └── analytics.model.ts
│   ├── services/                  # business rules, transactions, socket emits
│   │   ├── auth.service.ts
│   │   ├── store.service.ts
│   │   ├── item.service.ts
│   │   ├── order.service.ts
│   │   ├── analytics.service.ts
│   │   └── archive.service.ts
│   ├── controllers/               # parse req -> call service -> send response. Thin.
│   │   ├── auth.controller.ts
│   │   ├── store.controller.ts
│   │   ├── item.controller.ts
│   │   ├── order.controller.ts
│   │   ├── analytics.controller.ts
│   │   └── archive.controller.ts
│   ├── routes/
│   │   ├── index.ts               # mounts everything under /api
│   │   ├── auth.routes.ts
│   │   ├── store.routes.ts
│   │   ├── item.routes.ts
│   │   ├── order.routes.ts
│   │   ├── analytics.routes.ts
│   │   └── archive.routes.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts     # requireAuth
│   │   ├── role.middleware.ts     # requireRole(...roles)
│   │   ├── validate.middleware.ts # validate({ body, query, params })
│   │   ├── error.middleware.ts    # errorHandler + notFound
│   │   └── rateLimit.middleware.ts
│   ├── validators/                # zod schemas only
│   │   ├── auth.schema.ts
│   │   ├── store.schema.ts
│   │   ├── item.schema.ts
│   │   ├── order.schema.ts
│   │   └── analytics.schema.ts
│   ├── realtime/
│   │   ├── socket.ts              # io init + JWT handshake auth + room joining
│   │   ├── rooms.ts               # room name builders
│   │   └── events.ts              # emitOrderCreated / emitOrderStatusUpdated
│   ├── types/
│   │   ├── index.ts               # domain types (User, Store, Item, Order...)
│   │   └── express.d.ts           # augments Request with `user`
│   ├── utils/
│   │   ├── ApiError.ts
│   │   ├── asyncHandler.ts
│   │   ├── response.ts            # ok() / fail() envelope helpers
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── cursor.ts              # encode/decode keyset cursor
│   │   └── logger.ts
│   ├── jobs/
│   │   └── archive.job.ts         # node-cron daily archival (toggle via env)
│   ├── app.ts                     # express app (no listen) — testable
│   └── server.ts                  # http server + socket.io + graceful shutdown
├── docs/
│   └── API.md                     # generated by hand from section 8
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── tsconfig.json
├── package.json
└── README.md
```

**Layer rule (enforce strictly):**
`routes → middleware → controller → service → model → db`.
A controller must never write SQL. A model must never touch `req`/`res` or emit sockets.

---

## 5. Environment

`.env.example`:

```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me_too
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGINS=http://localhost:3000
ARCHIVE_AFTER_DAYS=30
ARCHIVE_BATCH_SIZE=1000
ENABLE_ARCHIVE_CRON=false
```

`config/env.ts` validates all of this with Zod and **exits the process on failure**.
Nothing else in the codebase reads `process.env` directly.

**Neon notes:**
- Use the **pooled** connection string (host contains `-pooler`). Neon's pooler handles many short-lived connections; keep `pg` `max: 10`.
- `ssl: { rejectUnauthorized: false }` in the Pool config.
- Neon free tier auto-suspends; first query after idle can take ~1s. Set `connectionTimeoutMillis: 10000`.

---

## 6. Database schema

Money is `NUMERIC(12,2)`. `pg` returns `NUMERIC` as a **string** by default, so register a
type parser once in `db/pool.ts` and document it:

```ts
import pg from "pg";
// NUMERIC(1700) -> JS number, so JSON responses return 250.5 not "250.50"
pg.types.setTypeParser(1700, (v) => parseFloat(v));
```

### `001_init.sql`

```sql
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
```

### `002_archive.sql`

```sql
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
```

> Archive tables have **no foreign keys** on purpose — an archive must survive even if a
> store or item is later deleted. That is why `item_name` / `unit_price` are snapshotted.

### `003_views.sql`

```sql
-- Analytics must cover hot + archived data, otherwise revenue drops every time we archive.
CREATE OR REPLACE VIEW orders_all AS
  SELECT id, store_id, user_id, total_amount, status, created_at FROM orders
  UNION ALL
  SELECT id, store_id, user_id, total_amount, status, created_at FROM orders_archive;

CREATE OR REPLACE VIEW order_items_all AS
  SELECT order_id, item_id, item_name, unit_price, qty, line_total FROM order_items
  UNION ALL
  SELECT order_id, item_id, item_name, unit_price, qty, line_total FROM order_items_archive;
```

Postgres pushes filters into each `UNION ALL` branch, so both branches still use their own
indexes. Mention this in the README under "Query optimization".

---

## 7. Auth flow (JWT)

```
register -> hash password (bcrypt, 10 rounds) -> insert user -> issue token pair
login    -> verify password -> issue token pair
access   -> 15m, payload { sub: userId, role, email }
refresh  -> 7d, payload { sub: userId, jti }, sha256(token) stored in refresh_tokens
refresh  -> verify + not revoked + not expired -> ROTATE (revoke old, issue new pair)
logout   -> revoke the presented refresh token
```

Rules:
- Never store the raw refresh token. Store `sha256(token)`.
- On rotation, if a **revoked** refresh token is presented again → revoke **all** of that
  user's tokens and return `401 TOKEN_REUSE_DETECTED`. Small code, big signal in review.
- Tokens are returned in the JSON body (the Next.js frontend is on a different origin, so
  cross-site cookies would need extra config). Document this trade-off in the README.
- `ADMIN` cannot be created via `/auth/register` — role is coerced to `USER` if someone
  tries. Admin comes from the seed script only.

`middlewares/auth.middleware.ts` reads `Authorization: Bearer <token>`, verifies, and sets
`req.user = { id, role, email }`.
`middlewares/role.middleware.ts` exports `requireRole('ADMIN', 'STORE_OWNER')`.

---

## 8. API contracts

Base path: `/api`. All responses use one envelope.

```jsonc
// success
{ "success": true, "data": { }, "meta": { } }
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

Error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

### 8.1 Auth — `/api/auth`

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/register` | – | `{ name, email, password, role: "USER"｜"STORE_OWNER" }` |
| POST | `/login` | – | `{ email, password }` |
| POST | `/refresh` | – | `{ refreshToken }` |
| POST | `/logout` | – | `{ refreshToken }` |
| GET | `/me` | any | – |

`login` / `register` response:
```json
{ "user": { "id": "...", "name": "...", "email": "...", "role": "USER" },
  "accessToken": "...", "refreshToken": "..." }
```
Rate limit `/login` and `/register`: 10 requests / 15 min / IP.

### 8.2 Stores — `/api/stores`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | any | list active stores. `?q=&limit=&cursor=` |
| GET | `/:id` | any | store + its available items |
| GET | `/mine` | STORE_OWNER | stores owned by caller |
| POST | `/` | STORE_OWNER, ADMIN | `{ name, description? }`. `owner_id` comes from the JWT, never the body |
| PATCH | `/:id` | owner, ADMIN | `{ name?, description?, is_active? }` |

### 8.3 Items

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/stores/:storeId/items` | any | `?available=true` |
| POST | `/api/stores/:storeId/items` | owner of store, ADMIN | `{ name, price }` |
| PATCH | `/api/items/:id` | owner, ADMIN | `{ name?, price?, is_available? }` |
| DELETE | `/api/items/:id` | owner, ADMIN | soft delete → `is_available = false` (hard delete would break order history) |

### 8.4 Orders — `/api/orders`

**`POST /api/orders`** — role `USER`.
```json
{ "store_id": "uuid", "items": [ { "item_id": "uuid", "qty": 2 } ] }
```
Optional header `Idempotency-Key: <uuid>`.

Server-side rules:
1. `total_amount` is **computed on the server** from the DB price. Never accept it from the client.
2. All `item_id`s must exist, belong to `store_id`, and be `is_available = true` → else `400`.
3. Duplicate `item_id` in the payload → merge the quantities before insert.
4. Limits: 1–50 distinct items, `qty` 1–100.
5. Whole thing runs in one transaction; emits `order:created` **after** commit.

Response `201`: full order object including `items[]`.

**`GET /api/orders`** — any authenticated role. Query:
```
store_id?  status?  from?  to?  limit=20 (max 100)  cursor?
```
Scoping (applied in the service, not optional):
- `USER` → forced `user_id = req.user.id`; `store_id` acts as an extra filter.
- `STORE_OWNER` → forced to stores they own. If `store_id` is passed and not theirs → `403`.
- `ADMIN` → no restriction.

Keyset pagination (not OFFSET — OFFSET gets slower as the table grows):
```sql
WHERE store_id = $1
  AND ($cursor IS NULL OR (created_at, id) < ($cursor_ts, $cursor_id))
ORDER BY created_at DESC, id DESC
LIMIT $limit + 1
```
The row-value comparison maps directly onto `idx_orders_store_created`.
Cursor = base64 of `"<iso_timestamp>|<uuid>"`. Response `meta`:
```json
{ "limit": 20, "hasMore": true, "nextCursor": "MjAyNS0..." }
```

**Avoiding N+1:** fetch orders **and** their line items in one round trip with a lateral join.

```sql
SELECT o.id, o.store_id, o.user_id, o.total_amount, o.status, o.created_at,
       s.name AS store_name,
       COALESCE(li.items, '[]'::json) AS items
FROM orders o
JOIN stores s ON s.id = o.store_id
LEFT JOIN LATERAL (
  SELECT json_agg(json_build_object(
           'item_id', oi.item_id, 'name', oi.item_name,
           'qty', oi.qty, 'unit_price', oi.unit_price, 'line_total', oi.line_total
         )) AS items
  FROM order_items oi WHERE oi.order_id = o.id
) li ON true
WHERE ...
ORDER BY o.created_at DESC, o.id DESC
LIMIT $n;
```

**`GET /api/orders/:id`** — same scoping rules; `404` if not visible to the caller
(return `404`, not `403`, so IDs can't be probed).

**`PATCH /api/orders/:id/status`** — `STORE_OWNER` (own store) or `ADMIN`.
```json
{ "status": "PREPARING" }
```
Allowed transitions only:
```
PLACED   -> PREPARING
PREPARING-> COMPLETED
```
Anything else → `409 INVALID_STATUS_TRANSITION`. Enforce atomically so two owners clicking
at once can't double-apply:
```sql
UPDATE orders SET status = $1, updated_at = now()
WHERE id = $2 AND status = $3
RETURNING *;
```
0 rows returned → someone else already changed it → `409`.

### 8.5 Analytics — `/api/analytics`

All accept `?from=&to=` (ISO dates, default: last 30 days).
`ADMIN` sees everything; `STORE_OWNER` is force-scoped to their own stores; `USER` gets `403`.

| Path | Returns |
|---|---|
| `GET /orders-per-day?store_id=` | `[{ day, orders, revenue }]`, gap-filled |
| `GET /revenue-per-store` | `[{ store_id, store_name, order_count, revenue }]` |
| `GET /top-items?store_id=&limit=5` | `[{ item_id, item_name, units_sold, revenue }]` |
| `GET /summary?store_id=` | `{ total_orders, total_revenue, avg_order_value, active_orders }` |

**Orders per day** (gap-filled so the chart has no holes):
```sql
SELECT d::date AS day,
       COUNT(o.id)                      AS orders,
       COALESCE(SUM(o.total_amount), 0) AS revenue
FROM generate_series($1::date, $2::date, '1 day') d
LEFT JOIN orders_all o
  ON o.created_at >= d AND o.created_at < d + INTERVAL '1 day'
 AND ($3::uuid IS NULL OR o.store_id = $3)
GROUP BY d
ORDER BY d;
```

**Revenue per store** (`LEFT JOIN` so a store with zero sales still shows up):
```sql
SELECT s.id AS store_id, s.name AS store_name,
       COUNT(o.id)                      AS order_count,
       COALESCE(SUM(o.total_amount), 0) AS revenue
FROM stores s
LEFT JOIN orders_all o
  ON o.store_id = s.id
 AND o.status = 'COMPLETED'
 AND o.created_at BETWEEN $1 AND $2
WHERE ($3::uuid IS NULL OR s.owner_id = $3)
GROUP BY s.id, s.name
ORDER BY revenue DESC;
```

**Top 5 selling items:**
```sql
SELECT oi.item_id, oi.item_name,
       SUM(oi.qty)        AS units_sold,
       SUM(oi.line_total) AS revenue
FROM order_items_all oi
JOIN orders_all o ON o.id = oi.order_id
WHERE o.created_at BETWEEN $1 AND $2
  AND ($3::uuid IS NULL OR o.store_id = $3)
GROUP BY oi.item_id, oi.item_name
ORDER BY units_sold DESC
LIMIT $4;
```

Add a `?days=` guard: reject ranges longer than 366 days with `400`.

### 8.6 Archival — `POST /api/archive-old-orders`

Role `ADMIN`. Optional body `{ "days": 30, "batchSize": 1000 }` (defaults from env).
Moves orders older than N days into the archive tables, **line items first**, in one
transaction per batch, looping until nothing is left.

```sql
BEGIN;

CREATE TEMP TABLE _to_archive ON COMMIT DROP AS
  SELECT id FROM orders
  WHERE created_at < now() - ($1 || ' days')::interval
  ORDER BY created_at
  LIMIT $2
  FOR UPDATE SKIP LOCKED;          -- safe if the cron and a manual call overlap

INSERT INTO order_items_archive (id, order_id, item_id, item_name, unit_price, qty, line_total)
SELECT oi.id, oi.order_id, oi.item_id, oi.item_name, oi.unit_price, oi.qty, oi.line_total
FROM order_items oi
WHERE oi.order_id IN (SELECT id FROM _to_archive)
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders_archive (id, store_id, user_id, total_amount, status, created_at, updated_at)
SELECT o.id, o.store_id, o.user_id, o.total_amount, o.status, o.created_at, o.updated_at
FROM orders o
WHERE o.id IN (SELECT id FROM _to_archive)
ON CONFLICT (id) DO NOTHING;

-- ON DELETE CASCADE removes the live order_items rows
DELETE FROM orders WHERE id IN (SELECT id FROM _to_archive);

COMMIT;
```

Response: `{ "archived": 1240, "batches": 2, "durationMs": 830 }`.
Batching matters: one giant `DELETE` would hold locks and blow up the WAL.

`jobs/archive.job.ts` runs the same service on a daily cron (`0 3 * * *`) when
`ENABLE_ARCHIVE_CRON=true`.

### 8.7 Health

`GET /health` → `{ status: "ok", db: "up", uptime }` (runs `SELECT 1`).

---

## 9. Realtime (Socket.IO)

### Connection & auth

Client connects with the access token in the handshake:
```ts
io("http://localhost:5000", { auth: { token: accessToken } });
```

`realtime/socket.ts`:
```ts
io.use(async (socket, next) => {
  try {
    const payload = verifyAccessToken(socket.handshake.auth.token);
    socket.data.user = payload;                 // { sub, role, email }
    next();
  } catch {
    next(new Error("UNAUTHORIZED"));            // client sees connect_error
  }
});
```

### Rooms

```ts
// realtime/rooms.ts
export const userRoom  = (userId: string)  => `user:${userId}`;
export const storeRoom = (storeId: string) => `store:${storeId}`;
export const ADMIN_ROOM = "admin";
```

On connect:
- every user joins `user:{id}` (their own order updates)
- `STORE_OWNER` → query their store ids, join `store:{id}` for each
- `ADMIN` → joins `admin`

Never let a client pick its own room via an emit. A `store:subscribe` event, if added, must
re-verify ownership server-side before `socket.join`.

### Events (server → client)

| Event | Rooms | Payload |
|---|---|---|
| `order:created` | `store:{store_id}`, `user:{user_id}`, `admin` | full order with `items[]` |
| `order:status_updated` | same three | `{ id, store_id, user_id, status, updated_at }` |

Emitted from `realtime/events.ts`, called by the service layer **after the transaction
commits** — never mid-transaction, or clients can see an order that then rolls back.

```ts
export function emitOrderCreated(order: OrderWithItems) {
  io.to(storeRoom(order.store_id))
    .to(userRoom(order.user_id))
    .to(ADMIN_ROOM)
    .emit("order:created", order);
}
```

`io` is created in `server.ts` and injected into `events.ts` via a `setIo(io)` initializer,
so services import a plain function and stay testable.

### Reconnect

- Socket.IO reconnects automatically with backoff — set
  `reconnectionAttempts: Infinity, reconnectionDelayMax: 5000` on the client.
- The handshake re-runs on every reconnect, so an **expired access token means the reconnect
  fails**. On `connect_error` with message `UNAUTHORIZED`, the client must refresh the token,
  set `socket.auth.token = newToken`, and call `socket.connect()`. Document this in `docs/API.md`.
- Rooms are rejoined by the server-side `connection` handler, so nothing to do client-side.
- After a gap, the client should refetch the orders list once (React Query `invalidateQueries`)
  because events fired while offline are lost. Sockets are for liveness, HTTP is the source of truth.

### Scalability note (for the README)

Single process is fine for this assessment. To scale horizontally:
`@socket.io/redis-adapter` + Redis pub/sub, so a `store:{id}` emit from any instance reaches
sockets on every instance; plus sticky sessions at the load balancer for the HTTP long-poll
upgrade. Broadcasting to rooms (not looping over sockets) is what makes that possible —
that is why no code ever holds a socket list in memory.

---

## 10. Key implementation snippets

**`db/pool.ts`**
```ts
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const query = <T extends QueryResultRow>(text: string, params?: unknown[]) =>
  pool.query<T>(text, params);

// Runs fn inside a transaction; rolls back on any throw.
export async function withTransaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

**`utils/ApiError.ts`**
```ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) { super(message); }

  static badRequest(msg: string, d?: unknown) { return new ApiError(400, "VALIDATION_ERROR", msg, d); }
  static unauthorized(msg = "Unauthorized")   { return new ApiError(401, "UNAUTHORIZED", msg); }
  static forbidden(msg = "Forbidden")         { return new ApiError(403, "FORBIDDEN", msg); }
  static notFound(msg = "Not found")          { return new ApiError(404, "NOT_FOUND", msg); }
  static conflict(code: string, msg: string)  { return new ApiError(409, code, msg); }
}
```

**`middlewares/validate.middleware.ts`**
```ts
// Validates and REPLACES req.body/query/params with the parsed (typed, coerced) values.
export const validate =
  (schemas: { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema }) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params) as any;
      if (schemas.query)  req.query  = schemas.query.parse(req.query) as any;
      if (schemas.body)   req.body   = schemas.body.parse(req.body);
      next();
    } catch (e) {
      if (e instanceof ZodError) return next(ApiError.badRequest("Invalid request", e.flatten()));
      next(e);
    }
  };
```

**`middlewares/error.middleware.ts`**
```ts
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json(fail(err.code, err.message, err.details));
  }
  // Postgres unique violation -> 409 instead of a 500
  if ((err as any)?.code === "23505") {
    return res.status(409).json(fail("CONFLICT", "Resource already exists"));
  }
  req.log?.error({ err }, "unhandled error");
  res.status(500).json(fail("INTERNAL_ERROR", "Something went wrong"));
}
```

**`services/order.service.ts` — create (the important one)**
```ts
export async function createOrder(userId: string, input: CreateOrderInput) {
  const ids = [...new Set(input.items.map(i => i.item_id))];
  const qtyById = mergeQuantities(input.items);           // duplicates merged

  const order = await withTransaction(async (client) => {
    // 1. lock + read prices from the DB (client-sent prices are never trusted)
    const { rows: items } = await client.query(
      `SELECT id, name, price FROM items
       WHERE id = ANY($1::uuid[]) AND store_id = $2 AND is_available = true
       FOR SHARE`,
      [ids, input.store_id],
    );
    if (items.length !== ids.length) {
      throw ApiError.badRequest("Some items are invalid or unavailable for this store");
    }

    // 2. server-side total
    const total = items.reduce((sum, it) => sum + it.price * qtyById[it.id], 0);

    // 3. insert order + all lines (single multi-row insert, no loop)
    const { rows: [created] } = await client.query(
      `INSERT INTO orders (store_id, user_id, total_amount, idempotency_key)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.store_id, userId, total.toFixed(2), input.idempotencyKey ?? null],
    );
    await client.query(
      `INSERT INTO order_items (order_id, item_id, item_name, unit_price, qty)
       SELECT $1, u.item_id, u.item_name, u.unit_price, u.qty
       FROM UNNEST($2::uuid[], $3::text[], $4::numeric[], $5::int[])
         AS u(item_id, item_name, unit_price, qty)`,
      [created.id, ...columnsFrom(items, qtyById)],
    );
    return created;
  });

  const full = await orderModel.findByIdWithItems(order.id);
  emitOrderCreated(full);                                  // after commit, never inside
  return full;
}
```

---

## 11. Seed data (`npm run seed`)

- 1 admin — `admin@demo.com / Admin@123`
- 3 store owners — `owner1@demo.com … owner3@demo.com / Owner@123`
- 5 users — `user1@demo.com … user5@demo.com / User@123`
- 3 stores, 8–10 items each with realistic prices
- ~400 orders spread over the **last 90 days** (so archival and the analytics charts both
  have real data), random statuses, 1–4 line items each

Seed must be idempotent: `TRUNCATE ... RESTART IDENTITY CASCADE` first, guarded so it
refuses to run when `NODE_ENV=production`.

---

## 12. Code conventions

- TypeScript `strict: true`. No `any` except the two documented Express type escapes.
- Comments: **one short line, only where the "why" isn't obvious** (a lock, a transition
  rule, a trust boundary). Do not comment obvious code. No JSDoc blocks on every function.
- Every async controller wrapped in `asyncHandler` so nothing needs try/catch.
- Named exports only. One responsibility per file.
- SQL: parameterized always (`$1, $2`) — never string interpolation.
- Files under ~200 lines; split the service if it grows past that.
- `npm run` scripts: `dev`, `build`, `start`, `migrate`, `seed`, `typecheck`.

---

## 13. Build order (do these in sequence)

| # | Milestone | Done when |
|---|---|---|
| 0 | Scaffold: package.json, tsconfig, app.ts, server.ts, `/health`, error handler, env config | `GET /health` returns ok |
| 1 | DB: pool, migration runner, 3 migrations, seed | `npm run migrate && npm run seed` works on Neon |
| 2 | Auth: register/login/refresh/logout/me + auth & role middleware | can log in as all 3 roles |
| 3 | Stores + items CRUD with ownership checks | owner can't touch another owner's store |
| 4 | Orders: create (txn + server-side total), list (keyset + lateral join), get, status patch | scoping verified for all 3 roles |
| 5 | Socket.IO: handshake auth, rooms, both events wired into the order service | two browser tabs update live |
| 6 | Analytics (4 endpoints) + archive endpoint + cron job | archived orders still appear in revenue totals |
| 7 | `docs/API.md`, README, Dockerfile, docker-compose, deploy | fresh clone runs from README alone |

---

## 14. README must contain

1. What it is + a small architecture diagram (ASCII is fine)
2. Setup: clone → `.env` → `npm i` → `npm run migrate` → `npm run seed` → `npm run dev`
3. Seeded demo credentials for all three roles
4. Full API table (link to `docs/API.md`)
5. Socket events + payload shapes + the reconnect contract
6. **Design decisions** section, explicitly covering:
   - why `order_items` is a separate table instead of a JSON column (indexable joins → the top-selling-items aggregation is a plain `GROUP BY`, not a JSON scan)
   - the index list and which query each index serves
   - keyset vs OFFSET pagination
   - how N+1 is avoided (lateral join, one round trip)
   - why analytics read from the `orders_all` view
   - JWT rotation + reuse detection
   - Socket.IO rooms + the Redis-adapter path to horizontal scale
7. **Assumptions** section (money as `NUMERIC(12,2)`, single currency, no stock tracking,
   archival only moves orders older than 30 days regardless of status, etc.)
8. `curl` examples for the main flows

---

## 15. Docker

`Dockerfile`: multi-stage (`node:20-alpine` build → prune → runtime), non-root user,
`EXPOSE 5000`, `CMD ["node", "dist/server.js"]`.
`docker-compose.yml`: the API service reading `.env` (DB is Neon, so no postgres service
needed — optionally add one behind a `local` profile for offline dev).

---

## 16. Acceptance checklist

- [ ] All 3 spec endpoints exist and behave: `POST /orders`, `GET /orders?store_id=` (paginated), `PATCH /orders/:id/status`
- [ ] Indexes on `store_id` and `created_at` exist and are actually used (`EXPLAIN ANALYZE` output pasted into the README)
- [ ] `total_amount` is never trusted from the client
- [ ] Invalid status transition returns 409, not 200
- [ ] A `USER` cannot read another user's orders; an owner cannot read another store's orders
- [ ] Both socket events fire and only reach the correct rooms
- [ ] `POST /archive-old-orders` moves orders + their line items, and analytics totals stay unchanged after archiving
- [ ] All inputs validated with Zod; no unhandled promise rejection crashes the server
- [ ] Fresh clone → README steps → working server, no undocumented step
