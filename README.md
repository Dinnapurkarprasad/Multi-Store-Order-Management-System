# Counter — Multi-Store Order Management System

*Order from any shop. Watch it move.*

Shoppers browse stores and follow their orders live. Store owners work a realtime order rail.
Admins get platform-wide analytics and a data archival job.

| | |
|---|---|
| **Live app** | https://storefront-plum-seven.vercel.app/ |
| **Live API** | https://storefront-oms.onrender.com |
| **API reference** | [`Backend/docs/API.md`](./Backend/docs/API.md) |
| **Backend guide** | [`Backend/README.md`](./Backend/docs/Backend.md) |
| **Frontend guide** | [`Frontend/README.md`](./Frontend/README.md) |

> The API is on free hosting and sleeps when idle. The first request after a while can take up
> to a minute — the app shows a *Waking the server* screen while it starts.

---

## What's implemented

**Task 1 — Multi-store order management.** `POST /orders`, `GET /orders?store_id=` with keyset
pagination, `PATCH /orders/:id/status`. Zod validation on every endpoint, indexes on `store_id`
and `created_at`, `order_items` as a real table so line data stays queryable. `total_amount` is
computed server-side from database prices in one transaction; a client-supplied value is
ignored. Status transitions are restricted to `PLACED → PREPARING → COMPLETED` and guarded by a
compare-and-swap, so concurrent updates return 409 instead of both applying.

**Task 2 — Realtime notifications.** Socket.IO emits `order:created` and `order:status_updated`
after the transaction commits. Rooms are derived from the JWT on every handshake —
`user:{id}`, `store:{id}` per owned store, `admin` — so a client cannot subscribe to another
store's orders. Reconnect is handled including token refresh on an expired handshake, and the
list is refetched once on reconnect since missed events aren't queued.

**Task 3 — Archival and analytics.** `POST /archive-old-orders` moves orders and their line
items into archive tables in batches, one transaction each. Analytics read `UNION ALL` views
over the live and archived tables, so archiving shrinks the hot table without changing a single
reported figure. Four aggregation endpoints: daily orders (gap-filled), revenue per store, top
5 selling items, and a summary.

**Beyond the brief.** Three roles with ownership enforced in the service layer, JWT refresh
rotation with reuse detection, idempotent order creation, soft-deleted items so order history
stays intact, and a full Next.js frontend for all three roles.

---

## Tech stack

**Backend** — Node 20 · TypeScript · Express 4 · Neon Postgres with raw SQL (no ORM) · Zod ·
JWT (access + rotating refresh) · Socket.IO · pino · Deployed on Render

**Frontend** — Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · TanStack Query
v5 · Zustand · axios · socket.io-client · react-hook-form + Zod · motion · recharts · sonner ·
react-icons

Raw SQL over an ORM was deliberate: the brief grades indexing and query optimization, and
hand-written queries keep the index usage and query plans visible in the repo.

---

## Repo layout

```
.
├── Backend/     Express API, migrations, seed, docs/API.md
├── Frontend/    Next.js app
└── README.md
```

---

## Setup

Requires **Node 20+**. No database to install — a hosted, already-migrated and seeded Neon
database is provided with this submission.

### 1. Backend

```bash
cd Backend
npm install
```

```bash
cp .env.example .env
```

Then set one value in `Backend/.env` — everything else in the example file already works:

```env
DATABASE_URL=postgresql://neondb_owner:npg_NqtLr8MzEhH5@ep-young-cloud-axitcqrr-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

> **Nothing else to set up.** That points at a hosted Neon database that is already migrated
> and seeded — no Neon account, no local Postgres, no keys to generate. The JWT secrets in
> `.env.example` are review values; they only need to stay consistent within a single run, so
> substitute your own if you prefer.

```bash
npm run dev
curl http://localhost:5000/health   # {"success":true,"data":{"status":"ok","db":"up",...}}
```

`"db":"up"` means setup is complete. Migrations and seeding are already done — `npm run migrate`
is safe to run but unnecessary, and **`npm run seed` should not be run**: it truncates every
table and the database is shared with the live deployment.

### 2. Frontend

In a second terminal:

```bash
cd Frontend
npm install
```

Create `Frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

```bash
npm run dev
```

Open **http://localhost:3000**.

To skip the backend entirely and use the deployed API, point those two variables at
`https://storefront-oms.onrender.com/api` and `https://storefront-oms.onrender.com`.

---

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo.com` | `Admin@123` |
| Store owner | `owner1@demo.com`, `owner2@demo.com`, `owner3@demo.com` | `Owner@123` |
| Shopper | `user1@demo.com` … `user5@demo.com` | `User@123` |

Login redirects by role: shopper → `/stores`, owner → `/dashboard`, admin → `/admin`.
Shopper and store owner accounts can also be created at `/signup`. Admin cannot — the API
rejects that role, so it exists only via the seed.

Seeded data: 3 stores, 8–10 items each, ~400 orders across the last 90 days, so pagination,
the charts and the archival job all have realistic data.

**To see the realtime part:** open two browsers, sign in as a shopper in one and `owner1` in
the other. Place an order — it appears on the owner's rail with no reload, and advancing it
there animates the shopper's status trail.

---

## Verification

```bash
cd Backend && npm run verify     # 8 assertions against a running server
cd Frontend && npm run verify    # typecheck + production build
```

The backend checks cover server-side totals, merged duplicate items, illegal status
transitions, keyset pagination returning every order exactly once, cross-user isolation,
socket handshake rejection, room delivery, and role-scoped analytics.
