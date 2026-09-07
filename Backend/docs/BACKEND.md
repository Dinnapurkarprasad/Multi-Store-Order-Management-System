# Backend — Setup & Review Guide

Multi-store order management API. Node 20 + TypeScript + Express 4 + Neon Postgres, raw SQL
(no ORM), JWT auth, Socket.IO realtime.

**You do not need a Neon account.** A ready database is provided with this submission, already
migrated and seeded. Setup is: create `.env`, install, run.

- **Live API:** https://storefront-oms.onrender.com
- **Full endpoint contract:** [`API.md`](./API.md)
- **Original brief:** [`PRD.md`](./PRD.md)

---

## 1. Prerequisites

| | |
|---|---|
| Node.js | **20 or newer** (`node -v`) |
| npm | 9+ |
| Database | none to install — a hosted Neon URL is provided |

---

## 2. Setup

```bash
git clone <repo-url>
cd Backend
npm install
```

Create a file called `.env` in the `Backend` folder and paste in the values supplied with this
submission:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=<provided with the submission>
JWT_ACCESS_SECRET=<provided with the submission>
JWT_REFRESH_SECRET=<provided with the submission>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGINS=http://localhost:3000
ARCHIVE_AFTER_DAYS=30
ARCHIVE_BATCH_SIZE=1000
ENABLE_ARCHIVE_CRON=false
```

`.env.example` in the repo has the same keys with dummy values, for reference.

Start it:

```bash
npm run dev
```

You should see:

```
status ok — server is up on http://localhost:5000 (health: http://localhost:5000/health)
```

Confirm the database is reachable:

```bash
curl http://localhost:5000/health
# {"success":true,"data":{"status":"ok","db":"up","uptime":1.2}}
```

`"db":"up"` means you are done. That is the whole setup.

### Migrations and seeding — already done

The provided database is fully migrated and seeded, so **you can skip both steps.**

```bash
npm run migrate    # safe to run: idempotent, will just print "migrations up to date (5 total)"
```

> ⚠️ **Please do not run `npm run seed`.** It is destructive — it truncates every table and
> reloads demo data. The database is shared with the live deployment, so seeding would reset
> the data you and others are looking at. It is only needed when pointing at a fresh database.
> (It refuses to run if it finds any non-demo account, and refuses outright when
> `NODE_ENV=production`.)

---

## 3. Demo credentials

All three roles are seeded. Passwords are shared per role.

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@demo.com` | `Admin@123` |
| **Store owner** | `owner1@demo.com`, `owner2@demo.com`, `owner3@demo.com` | `Owner@123` |
| **Customer** | `user1@demo.com` … `user5@demo.com` | `User@123` |

Seeded data: **3 stores**, 8–10 items each, and **~400 orders spread over the last 90 days** so
pagination, the analytics charts and the archival job all have realistic data.

Admin cannot be registered through the API — `/api/auth/register` only accepts `USER` or
`STORE_OWNER`. The admin exists solely because the seed script created it.

---

## 4. Five-minute tour

Copy-paste these in order. Replace `$TOKEN` with the `accessToken` from the login response.

**1. Log in as admin**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"admin@demo.com","password":"Admin@123"}'
```

**2. Browse stores (public, no token needed)**

```bash
curl "http://localhost:5000/api/stores?limit=5"
```

**3. Store detail — items included in the same query, no N+1**

```bash
curl http://localhost:5000/api/stores/<store-id>
```

**4. Place an order as a customer** — note `total_amount` is deliberately wrong in the payload
and is ignored; the server computes it from database prices.

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "authorization: Bearer $USER_TOKEN" \
  -H "content-type: application/json" \
  -H "Idempotency-Key: 11111111-1111-1111-1111-111111111111" \
  -d '{"store_id":"<store-id>","total_amount":1,"items":[{"item_id":"<item-id>","qty":2}]}'
```

Send it twice — the second call returns the **same order** with `200` instead of creating a
duplicate.

**5. Illegal status transition → 409**

```bash
curl -X PATCH http://localhost:5000/api/orders/<order-id>/status \
  -H "authorization: Bearer $OWNER_TOKEN" \
  -H "content-type: application/json" \
  -d '{"status":"COMPLETED"}'
# 409 INVALID_STATUS_TRANSITION — PLACED must go to PREPARING first
```

**6. Analytics (admin sees all, owner is scoped to their own stores, customer gets 403)**

```bash
curl http://localhost:5000/api/analytics/summary          -H "authorization: Bearer $TOKEN"
curl http://localhost:5000/api/analytics/orders-per-day   -H "authorization: Bearer $TOKEN"
curl http://localhost:5000/api/analytics/revenue-per-store -H "authorization: Bearer $TOKEN"
curl "http://localhost:5000/api/analytics/top-items?limit=5" -H "authorization: Bearer $TOKEN"
```

**7. Archival preserves analytics** — the point of the `orders_all` view:

```bash
curl "http://localhost:5000/api/analytics/summary?from=2025-09-06&to=2026-09-06" -H "authorization: Bearer $ADMIN"
curl -X POST http://localhost:5000/api/archive-old-orders \
  -H "authorization: Bearer $ADMIN" -H "content-type: application/json" \
  -d '{"days":85,"batchSize":100}'
# revenue is identical before and after
```

> Archived orders leave `GET /api/orders` but remain in every analytics total. Use a large
> `days` value; `days: 30` would move most of the seeded data out of the order lists.

---

## 5. Automated checks

With the server running in another terminal:

```bash
npm run verify
```

Eight assertions against the running API, covering the things most likely to break:

1. `total_amount` is computed server-side and ignores the client value
2. duplicate `item_id`s in one order are merged, not duplicated
3. `PLACED → COMPLETED` is rejected 409; `PLACED → PREPARING → COMPLETED` succeeds
4. keyset pagination returns every order exactly once — no repeats **and no skips**
5. a customer cannot read another customer's order (404, not 403)
6. the socket handshake rejects an invalid token
7. `order:created` reaches both the customer's room and the store owner's room
8. analytics are role-scoped and `day` is a calendar-safe `YYYY-MM-DD` string

```bash
npm run typecheck   # strict TypeScript, zero errors
npm run build       # compiles to dist/ and copies the .sql migrations
```

---

## 6. Scripts

| Script | Does |
|---|---|
| `npm run dev` | dev server with reload (`tsx watch`) |
| `npm run build` | `tsc` → `dist/`, plus copies `src/db/migrations/*.sql` |
| `npm start` | runs the compiled build (`node dist/server.js`) |
| `npm run migrate` | applies pending migrations, tracked in `_migrations` |
| `npm run seed` | **destructive** — truncates and reloads demo data |
| `npm run verify` | the 8 checks above, against a running server |
| `npm run typecheck` | `tsc --noEmit` |

---

## 7. Architecture

Strict one-way layering — a controller never writes SQL, a model never touches `req`/`res`:

```
routes → middleware → controller → service → model → db
```

```
src/
├── config/        env (zod-validated, exits on failure), constants
├── db/            pool, migration runner, seed, verify, migrations/*.sql
├── models/        SQL only
├── services/      business rules, transactions, socket emits
├── controllers/   thin req → service → res
├── routes/        route tables + middleware wiring
├── middlewares/   auth, role, validate, error, rateLimit
├── validators/    zod schemas
├── realtime/      socket server, rooms, events
├── jobs/          archival cron
├── app.ts         express app (no listen — testable)
└── server.ts      http + socket.io + graceful shutdown
```

**Authorisation is enforced in the service layer, not just middleware.** Middleware checks the
*role*; the service checks *ownership* via a single `assertStoreAccess()` gate. A `store_id` in
a request body never decides access — ownership is always re-read from the database.

---

## 8. Design decisions worth reviewing

**Keyset pagination, not `OFFSET`.** `WHERE (created_at, id) < ($ts, $id) ORDER BY created_at
DESC, id DESC LIMIT n+1`. The row-value comparison maps directly onto
`idx_orders_store_created (store_id, created_at DESC, id DESC)`, so page 500 costs the same as
page 1. The cursor keeps Postgres' **microsecond** precision — a millisecond-truncated cursor
silently skips rows that fall inside the truncated interval.

**No N+1.** Orders and their line items come back in one round trip via a `LEFT JOIN LATERAL`
with `json_agg`. Same technique for a store and its items.

**`order_items` is a real table, not a JSON column.** That makes "top selling items" a plain
indexed `GROUP BY` instead of a JSON scan, and lets `line_total` be a generated column.

**Snapshots on order lines.** `item_name` and `unit_price` are copied at order time, so
renaming an item or changing its price never rewrites history.

**Analytics read the `orders_all` / `order_items_all` views**, which `UNION ALL` the live and
archived tables. Postgres pushes filters into each branch so both still use their own indexes.
This is why archiving never changes a revenue number.

**Money is `NUMERIC(12,2)`** with a `pg` type parser registered for OID 1700 → JS number, and
OID 20 (`bigint`) → JS number, so `COUNT(*)` returns `139` rather than `"139"`.

**Concurrency.** Order creation reads prices under `FOR SHARE` inside one transaction and
computes the total server-side. Status changes use a compare-and-swap
(`UPDATE ... WHERE id = $1 AND status = $2`); zero rows affected means someone else won the
race → `409`. Archival batches use `FOR UPDATE SKIP LOCKED` so a manual call and the cron can
safely overlap.

**Socket rooms are derived from the JWT**, never from a client message, so no one can subscribe
to another store's orders. Emits happen only *after* the transaction commits.

**JWT refresh rotation with reuse detection.** Only `sha256(token)` is stored. Replaying a
revoked refresh token revokes every session for that user and returns `TOKEN_REUSE_DETECTED`.

Full index list and the reasoning behind each one is in [`API.md`](./API.md) and `001_init.sql`.

---

## 9. Troubleshooting

**First request is slow, or fails once then works.**
Neon's free tier auto-suspends when idle and takes about a second to wake; the hosted API on
Render sleeps too and can take up to a minute on the first hit. Retry once. The server runs a
warm-up query on boot to reduce this.

**Everything returns 401 after a few minutes.**
Access tokens live 15 minutes by design. Log in again, or call `POST /api/auth/refresh`.

**429 on login.**
Login and register are rate limited to 10 per 15 minutes per IP in production (100 in
development, so the check script can be re-run).

**`db":"down"` in `/health`.**
`DATABASE_URL` is missing or mistyped in `.env`. It is a long string — copy it whole, including
the `?sslmode=require&channel_binding=require` at the end.

**`tsc: not found` when building.**
`npm install` skipped devDependencies because `NODE_ENV=production` was set. Use
`npm install --include=dev`.

---

## 10. Deployment notes

Hosted on Render (free tier), Root Directory `Backend`, build
`npm install --include=dev && npm run build`, start `npm start`, health check `/health`.

Two env differences in production: `NODE_ENV=production` (required — the dev logger pulls in
`pino-pretty`, a devDependency), and no `PORT` (Render injects it). `ENABLE_ARCHIVE_CRON` stays
`false` because a free instance that sleeps cannot be relied on to wake at 03:00 — the admin
endpoint is the intended trigger.

`GET /ping` is a database-free liveness endpoint for uptime monitoring, kept separate from
`/health` so pinging it does not hold the database awake.
