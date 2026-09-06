# API Contract — Multi-Store Order Management

Everything a frontend needs. Generated from the actual route definitions, not from the spec.

- **Local:** `http://localhost:5000`
- **Production:** `https://storefront-oms.onrender.com`
- All API routes are under `/api`. `/ping` and `/health` are not.

**Status: the whole API is live** — auth, stores, items, orders, analytics, archival and
Socket.IO realtime. Nothing in this document is aspirational; every response body below was
copied from a real call against the deployed database.

---

## 1. Response envelope

Every response, success or failure, uses one of two shapes. Never anything else.

**Success**

```json
{ "success": true, "data": { } }
```

**Success with pagination**

```json
{ "success": true, "data": [ ], "meta": { "limit": 20, "hasMore": true, "nextCursor": "MjAyNi0..." } }
```

**Error**

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": { } }
}
```

`details` is only present on validation errors. Write one API client that unwraps `data` and
throws on `success: false`, and no screen has to think about this again.

### Error codes

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | body/query/params failed validation, or invalid items in an order |
| 401 | `UNAUTHORIZED` | missing, malformed or expired token |
| 401 | `TOKEN_REUSE_DETECTED` | a revoked refresh token was replayed — **all sessions killed**, force re-login |
| 403 | `FORBIDDEN` | wrong role, or you don't own this store |
| 404 | `NOT_FOUND` | missing, **or exists but not yours** (see [scoping](#5-orders)) |
| 409 | `CONFLICT` | email already registered |
| 409 | `INVALID_STATUS_TRANSITION` | illegal order status change |
| 429 | `RATE_LIMITED` | too many requests |
| 500 | `INTERNAL_ERROR` | unhandled server error |

### Validation error shape

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "name": ["String must contain at least 2 character(s)"],
        "email": ["Invalid email"]
      }
    }
  }
}
```

`details.fieldErrors` is keyed by field name — map it straight onto your form fields.

---

## 2. Auth

### Token model

| Token | Lifetime | Where it goes |
|---|---|---|
| `accessToken` | **15 minutes** | `Authorization: Bearer <token>` on every protected request |
| `refreshToken` | **7 days** | request body of `/api/auth/refresh` only |

Both come back in the JSON body. There are **no cookies** — the API and frontend are on
different origins, so you store the tokens yourself.

**Refresh tokens rotate.** Every call to `/refresh` returns a *new* refresh token and revokes
the old one. You must overwrite the stored value. If you send an already-used refresh token,
the server assumes it leaked, revokes **every** session for that user, and returns
`401 TOKEN_REUSE_DETECTED`. Treat that code as "wipe local state, redirect to login".

### The refresh flow your API client needs

```
request → 401 UNAUTHORIZED
        → POST /api/auth/refresh { refreshToken }
        → 200: store the NEW accessToken + NEW refreshToken, retry the original request once
        → 401: clear storage, redirect to /login
```

Queue concurrent 401s behind a single refresh call. Two parallel refreshes with the same token
will trip reuse detection and log the user out.

---

### `POST /api/auth/register`

Public. Rate limited: 10 per 15 min per IP in production.

```json
{
  "name": "Prasad",
  "email": "prasad@gmail.com",
  "password": "Prasad@123",
  "role": "STORE_OWNER"
}
```

| Field | Rules |
|---|---|
| `name` | required, 2–80 chars, trimmed |
| `email` | required, valid email, **lowercased by the server** |
| `password` | required, 8–72 chars |
| `role` | optional, `"USER"` or `"STORE_OWNER"`. Defaults to `"USER"` |

**`201`**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "552408d2-ac3f-4d89-b080-652e22556e5c",
      "name": "Prasad",
      "email": "prasad@gmail.com",
      "role": "STORE_OWNER",
      "image_url": null,
      "created_at": "2026-09-06T07:17:07.898Z"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

Errors: `400 VALIDATION_ERROR`, `409 CONFLICT` (email taken), `429 RATE_LIMITED`.

> **`role: "ADMIN"` is rejected with 400.** There is no way to create an admin through the API.
> Your signup screen should offer exactly two choices: *start shopping* → `USER`,
> *open your store* → `STORE_OWNER`.

---

### `POST /api/auth/login`

Public. Rate limited: 10 per 15 min per IP in production.

```json
{ "email": "admin@demo.com", "password": "Admin@123" }
```

**`200`** — identical body to register (`user`, `accessToken`, `refreshToken`).

Errors: `400`, `401 UNAUTHORIZED` (wrong email *or* wrong password — deliberately the same
message so the endpoint can't be used to discover which emails exist), `429`.

---

### `POST /api/auth/refresh`

Public.

```json
{ "refreshToken": "eyJhbGciOi..." }
```

**`200`** — `user`, a new `accessToken`, and a **new `refreshToken`**. Replace both.

Errors: `401 UNAUTHORIZED` (unknown / expired), `401 TOKEN_REUSE_DETECTED`.

---

### `POST /api/auth/logout`

Public (the token itself is the credential).

```json
{ "refreshToken": "eyJhbGciOi..." }
```

**`200`** → `{ "success": true, "data": { "loggedOut": true } }`

Idempotent — an unknown or already-revoked token still returns 200. Clear local storage
regardless of the outcome.

---

### `GET /api/auth/me`

Any logged-in role.

**`200`**

```json
{
  "success": true,
  "data": {
    "id": "15c0355a-...",
    "name": "Admin",
    "email": "admin@demo.com",
    "role": "ADMIN",
    "image_url": null,
    "created_at": "2026-09-06T06:57:45.980Z"
  }
}
```

Use this on app boot to restore the session and decide which dashboard to show.

---

### `PATCH /api/auth/me`

Any logged-in role. Edit your own profile.

```json
{ "name": "Owner One", "image_url": "https://example.com/me.jpg" }
```

| Field | Rules |
|---|---|
| `name` | optional, 2–80 chars |
| `image_url` | optional, valid URL, max 2048 chars. **`null` removes the picture** |

At least one field is required. **`200`** returns the updated user object.

`email` and `role` are intentionally not editable here.

---

## 3. Stores

### `GET /api/stores`

**Public.** Lists active stores only. Cursor paginated.

| Query | Rules |
|---|---|
| `q` | optional, 1–80 chars. Case-insensitive match on store name |
| `limit` | optional, 1–100, default 20 |
| `cursor` | optional, from `meta.nextCursor` |

**`200`**

```json
{
  "success": true,
  "data": [
    {
      "id": "0bfef738-69df-45bf-9c96-3982b420aa11",
      "owner_id": "f5ac5b41-...",
      "name": "Bombay Bistro",
      "description": "Now with a photo",
      "image_url": "https://example.com/store.jpg",
      "is_active": true,
      "created_at": "2026-09-06T06:57:46.250Z"
    }
  ],
  "meta": { "limit": 20, "hasMore": false, "nextCursor": null }
}
```

Inactive stores never appear here.

---

### `GET /api/stores/:id`

**Public.** Store detail **plus its available items in one request** — do not make a second
call for items.

**`200`**

```json
{
  "success": true,
  "data": {
    "id": "0bfef738-...",
    "owner_id": "f5ac5b41-...",
    "name": "Bombay Bistro",
    "description": "Now with a photo",
    "image_url": "https://example.com/store.jpg",
    "is_active": true,
    "created_at": "2026-09-06T06:57:46.250Z",
    "items": [
      {
        "id": "9c1e...",
        "name": "Butter Chicken",
        "price": 349,
        "image_url": null,
        "is_available": true,
        "created_at": "2026-09-06T06:57:46.4Z"
      }
    ]
  }
}
```

`items` only contains `is_available: true` rows, sorted by name. It is `[]`, never `null`.

Errors: `400` (id not a UUID), `404`.

---

### `GET /api/stores/mine`

Roles: `STORE_OWNER`, `ADMIN`.

**`200`** → a **plain array** of the caller's stores, newest first. No `meta`, not paginated.
Includes inactive stores, unlike the public list.

> For an `ADMIN` this returns only stores the admin personally owns — usually `[]`.
> Admin store management should use `GET /api/stores` instead.

---

### `POST /api/stores`

Roles: `STORE_OWNER`, `ADMIN`.

```json
{ "name": "Bombay Bistro", "description": "North Indian classics", "image_url": "https://..." }
```

| Field | Rules |
|---|---|
| `name` | required, 2–120 chars |
| `description` | optional, max 500 chars |
| `image_url` | optional, valid URL, max 2048 |

**`201`** → the created store.

> `owner_id` is taken from your token. There is no way to create a store for someone else.

---

### `PATCH /api/stores/:id`

Roles: `STORE_OWNER` (own store only), `ADMIN` (any). This is the "edit store info" endpoint.

```json
{ "name": "...", "description": "...", "image_url": "https://...", "is_active": false }
```

All four fields optional, at least one required. `description` and `image_url` accept `null`
to clear them. `is_active: false` hides the store from the public list.

**`200`** → the updated store. Errors: `400`, `401`, `403` (not your store), `404`.

---

## 4. Items

### `GET /api/stores/:storeId/items`

**Public.**

| Query | Rules |
|---|---|
| `available` | optional, `"true"` or `"false"`. Omit for **all** items |

**`200`** → a plain array of items sorted by name. Not paginated.

Customer-facing menus should pass `?available=true`. An owner's management screen should omit
it, so soft-deleted items are still visible and can be re-enabled.

---

### `POST /api/stores/:storeId/items`

Roles: `STORE_OWNER` (own store), `ADMIN`.

```json
{ "name": "Butter Chicken", "price": 349, "image_url": "https://..." }
```

| Field | Rules |
|---|---|
| `name` | required, 1–120 chars |
| `price` | required, **JSON number**, 0 – 9,999,999 |
| `image_url` | optional, valid URL, max 2048 |

**`201`** → the created item. Errors: `400`, `401`, `403`, `404` (store not found).

> `price` must be a number: `349` or `349.5`. Sending `"349"` is a 400. If your form input
> gives you a string, convert with `Number(value)` before sending.

---

### `PATCH /api/items/:id`

Roles: `STORE_OWNER` (owner of the item's store), `ADMIN`.

```json
{ "name": "...", "price": 379, "image_url": "https://...", "is_available": true }
```

All optional, at least one required. `image_url: null` removes the picture.
**`200`** → the updated item.

Ownership is resolved from the item's own `store_id` in the database, so you cannot move an
item between stores or edit someone else's item.

---

### `DELETE /api/items/:id`

Roles: `STORE_OWNER` (own), `ADMIN`.

**Soft delete.** Sets `is_available = false` and returns **`200`** with the updated item — it
does not return 204, and the row is never removed. Hard deletion would break order history.

Re-enable with `PATCH /api/items/:id` `{ "is_available": true }`.

---

## 5. Orders

**All order endpoints require authentication.**

### Role scoping (enforced server-side, not a filter you can bypass)

| Role | Sees |
|---|---|
| `USER` | only their own orders. `store_id` acts as an extra filter |
| `STORE_OWNER` | only orders for stores they own. Passing someone else's `store_id` → **403** |
| `ADMIN` | everything |

> An order that exists but is not yours returns **`404`, not `403`** — so IDs cannot be probed.
> Do not show "access denied" for a 404 on an order; show "not found".

### Order object

```json
{
  "id": "a1b2...",
  "store_id": "0bfef738-...",
  "user_id": "26076bd8-...",
  "total_amount": 1047,
  "status": "PLACED",
  "created_at": "2026-09-06T07:20:00.000Z",
  "updated_at": "2026-09-06T07:20:00.000Z",
  "store_name": "Bombay Bistro",
  "items": [
    { "item_id": "9c1e...", "name": "Butter Chicken", "qty": 3, "unit_price": 349, "line_total": 1047 }
  ]
}
```

`store_name` is joined in for you — no extra store lookup needed to render a list.
Money fields are **numbers**, not strings.

---

### `POST /api/orders`

Role: **`USER` only.** Store owners and admins get `403`.

Optional header: `Idempotency-Key: <any unique string>`

```json
{
  "store_id": "0bfef738-69df-45bf-9c96-3982b420aa11",
  "items": [
    { "item_id": "9c1e...", "qty": 3 },
    { "item_id": "7f3a...", "qty": 1 }
  ]
}
```

| Field | Rules |
|---|---|
| `store_id` | required, UUID |
| `items` | required, 1–50 entries |
| `items[].item_id` | required, UUID |
| `items[].qty` | required, integer 1–100 |

**`201`** → the full order object above.
**`200`** → same body, when an `Idempotency-Key` was replayed (order already existed).

Rules the server enforces, which shape your UI:

1. **Never send `total_amount`.** It is computed from database prices and any value you send is
   ignored. Compute your cart subtotal client-side for display only, and re-read
   `total_amount` from the response as the truth.
2. Every `item_id` must exist, belong to `store_id`, and be available — otherwise
   `400 VALIDATION_ERROR: "Some items are invalid or unavailable for this store"`. This is one
   combined error, so you cannot tell *which* item failed. Refetch the store's items and
   reconcile the cart.
3. **One store per order.** No cross-store carts. Scope the cart to a store.
4. Duplicate `item_id`s are **merged**, not rejected — `qty 2` + `qty 3` becomes one line of 5.

Errors: `400`, `401`, `403` (not a `USER`), `404` (store not found).

> Send an `Idempotency-Key` (a UUID generated when the checkout screen mounts) on every order.
> It makes a double-tapped Place Order button safe — the second call returns the same order
> with `200` instead of creating a duplicate.

---

### `GET /api/orders`

Any logged-in role. Cursor paginated.

| Query | Rules |
|---|---|
| `store_id` | optional, UUID |
| `status` | optional, `PLACED` \| `PREPARING` \| `COMPLETED` |
| `from` | optional, ISO date/datetime |
| `to` | optional, ISO date/datetime |
| `limit` | optional, 1–100, default 20 |
| `cursor` | optional, from `meta.nextCursor` |

**`200`** → array of full order objects (each with its `items[]`) plus `meta`.

Same endpoint powers all three screens — the server scopes it by role:
a user's "my orders", an owner's incoming queue (`?status=PLACED`), and the admin's full list.

---

### `GET /api/orders/:id`

Any logged-in role, subject to scoping. **`200`** → one full order object.

Errors: `400` (not a UUID), `401`, `404` (missing **or** not yours).

---

### `PATCH /api/orders/:id/status`

Roles: `STORE_OWNER` (own store's orders), `ADMIN`.

```json
{ "status": "PREPARING" }
```

**Only these transitions are legal:**

```
PLACED  →  PREPARING  →  COMPLETED
```

Anything else — skipping a step, going backwards, or touching a `COMPLETED` order — returns
**`409 INVALID_STATUS_TRANSITION`**.

**`200`** → the full updated order.

Errors: `400`, `401`, `403` (not your store), `404`, `409`.

> Derive the button from the current status rather than hardcoding it: show *Start preparing*
> for `PLACED`, *Mark completed* for `PREPARING`, and nothing for `COMPLETED`. A 409 can still
> happen if a colleague clicked first — refetch the order and re-render.

---

## 6. Analytics

Roles: `ADMIN`, `STORE_OWNER`. **`USER` gets `403 FORBIDDEN`** on all four.

Shared query params:

| Query | Rules |
|---|---|
| `from` | optional ISO date. Defaults to **30 days ago** |
| `to` | optional ISO date. Defaults to **now** |
| `store_id` | optional UUID |

Scoping, applied in the service:

- `ADMIN` — all stores, or just `store_id` if given.
- `STORE_OWNER` — only stores they own. Passing a `store_id` they don't own → **`403`**.

Guards: `from` after `to` → `400`. A range longer than **366 days** → `400`.

> All four read the `orders_all` / `order_items_all` views, which union the live and archived
> tables. **Archiving never changes an analytics number** — verified: total revenue was
> `347435` before archiving 21 orders and `347435` after.

---

### `GET /api/analytics/summary`

Four headline numbers for a dashboard.

```json
{
  "success": true,
  "data": {
    "total_orders": 139,
    "total_revenue": 117719,
    "avg_order_value": 846.9,
    "active_orders": 100
  }
}
```

`active_orders` counts orders not yet `COMPLETED` — the owner's live workload.
All four are numbers, not strings.

---

### `GET /api/analytics/orders-per-day`

Time series for a line/bar chart. **Gap-filled** — every day in the range is present, with
zeros where there were no orders, so the chart has no holes.

```json
{
  "success": true,
  "data": [
    { "day": "2026-08-07", "orders": 5, "revenue": 5227 },
    { "day": "2026-08-08", "orders": 6, "revenue": 5347 },
    { "day": "2026-08-09", "orders": 1, "revenue": 826 }
  ]
}
```

`day` is a plain `YYYY-MM-DD` **string**, deliberately not a timestamp. Feed it to your chart
as-is. Do not run it through `new Date()` and reformat unless you handle timezones — that is
exactly how points end up plotted a day early.

---

### `GET /api/analytics/revenue-per-store`

Sorted by revenue, highest first. Counts **`COMPLETED` orders only** — this is earned revenue,
so it will not match `summary.total_revenue`, which counts every status.

```json
{
  "success": true,
  "data": [
    { "store_id": "6059cce8-...", "store_name": "Green Bowl",     "order_count": 19, "revenue": 20469 },
    { "store_id": "5fa7fa5c-...", "store_name": "Kettle & Crumb", "order_count": 11, "revenue": 10080 }
  ]
}
```

A store with no completed orders still appears, with `order_count: 0` and `revenue: 0`.

---

### `GET /api/analytics/top-items`

Extra param: `limit`, 1–50, **default 5**.

```json
{
  "success": true,
  "data": [
    { "item_id": "c1720a7c-...", "item_name": "Chocolate Chip Cookie", "units_sold": 35, "revenue": 3150 },
    { "item_id": "cc3d9320-...", "item_name": "Quinoa Bowl",           "units_sold": 32, "revenue": 11168 }
  ]
}
```

Sorted by `units_sold`, not revenue — so the top seller by volume can earn less than the item
below it, as above. `item_name` is the name snapshotted at order time, so a renamed item keeps
its historical label.

---

## 7. Archival

### `POST /api/archive-old-orders`

Role: **`ADMIN` only.** Body is optional.

```json
{ "days": 30, "batchSize": 1000 }
```

| Field | Rules |
|---|---|
| `days` | optional int 1–3650. Defaults to the server's `ARCHIVE_AFTER_DAYS` (30) |
| `batchSize` | optional int 1–10000. Defaults to `ARCHIVE_BATCH_SIZE` (1000) |

**`200`**

```json
{ "success": true, "data": { "archived": 21, "batches": 1, "durationMs": 2391 } }
```

Moves orders older than `days` — with their line items — into the archive tables, in batches,
one transaction per batch. Safe to call twice: a second run returns `archived: 0`.

**What this does to your UI:** archived orders leave the live `orders` table, so they
**disappear from `GET /api/orders`** and from `GET /api/orders/:id`. They remain in every
analytics number. So a customer's "my orders" list only ever shows recent orders.

> Do not run this with `days: 30` while building or demoing. The seeded data spans 90 days, so
> a 30-day archive would move roughly two thirds of it out of the orders list and leave your
> screens looking empty. Demo it deliberately, at the end.

There is also a daily cron at 03:00 that runs the same code, enabled only when
`ENABLE_ARCHIVE_CRON=true`. It is `false` in deployment, because a free-tier instance that
sleeps cannot be relied on to wake at 3am — trigger it from this endpoint instead.

---

## 8. Realtime (Socket.IO)

Live order updates. **HTTP stays the source of truth** — sockets only tell you something
changed sooner than a poll would.

### Connecting

```js
import { io } from "socket.io-client";

const socket = io("https://storefront-oms.onrender.com", {
  auth: { token: accessToken },        // the ACCESS token, not the refresh token
  reconnectionAttempts: Infinity,
  reconnectionDelayMax: 5000,
});
```

The token is verified during the handshake. An invalid or expired one fails the connection with
`connect_error`, message **`UNAUTHORIZED`** — the socket never opens.

### Rooms — you do not choose them

On connect the server reads your JWT and joins you to:

| Role | Rooms joined |
|---|---|
| every user | `user:{yourId}` |
| `STORE_OWNER` | plus `store:{id}` for **each store they own** |
| `ADMIN` | plus `admin` |

There is no client-side subscribe event. A client cannot ask to join a room, so nobody can
listen to another store's orders. This is why room membership is derived from the token.

### Events (server → client)

Both fire **after** the database transaction commits, so anything you receive is durable.

**`order:created`** — payload is the **full order object**, identical to `POST /api/orders`:

```json
{
  "id": "a1b2...", "store_id": "0bfef738-...", "user_id": "26076bd8-...",
  "total_amount": 1047, "status": "PLACED",
  "created_at": "...", "updated_at": "...", "store_name": "Bombay Bistro",
  "items": [ { "item_id": "9c1e...", "name": "Butter Chicken", "qty": 3, "unit_price": 349, "line_total": 1047 } ]
}
```

Delivered to: the customer who ordered, the store's owner, and all admins.

**`order:status_updated`** — a **slim** payload, not the full order:

```json
{ "id": "a1b2...", "store_id": "0bfef738-...", "user_id": "26076bd8-...", "status": "PREPARING", "updated_at": "..." }
```

Delivered to the same three. Patch the order in your local cache by `id`; there is no `items`
array here, so do not overwrite the whole object with this payload.

### The reconnect contract

This is the part that breaks apps if ignored.

The handshake **re-runs on every reconnect**. Access tokens live 15 minutes, so a socket that
drops after that fails to reconnect. Handle it:

```js
socket.on("connect_error", async (err) => {
  if (err.message === "UNAUTHORIZED") {
    const fresh = await refreshAccessToken();   // your existing refresh call
    socket.auth = { token: fresh };
    socket.connect();
  }
});
```

Rooms are rejoined server-side on every connection, so there is nothing to redo client-side.

**After any gap, refetch the list once.** Events fired while you were disconnected are gone
forever — they are not queued. In React Query terms, `invalidateQueries(['orders'])` inside
`socket.on("connect")`.

### Suggested wiring

| Screen | Listen for | Do |
|---|---|---|
| Owner order queue | `order:created` | prepend the order, badge/sound |
| Owner order queue | `order:status_updated` | patch that row by `id` |
| Customer order detail | `order:status_updated` | update the status stepper |
| Customer "my orders" | `order:created` | prepend (covers a second tab) |
| Admin dashboard | both | patch the live list |

Everything must still work with sockets disabled. Build refetch-after-mutation first, then
layer sockets on top as the speed-up.

---

## 9. Cursor pagination

There are **no page numbers**. `limit`/`offset` gets slower as the table grows, so the API uses
keyset cursors.

```json
"meta": { "limit": 20, "hasMore": true, "nextCursor": "MjAyNi0wOS0wNlQwNzoxNzowNy44OThafGMxZTQ..." }
```

- `hasMore: false` / `nextCursor: null` → you are at the end.
- Pass `nextCursor` back as `?cursor=` for the next page. URL-encode it.
- The cursor is opaque. Do not parse it or build one yourself.

This suits **infinite scroll / Load more**, not a numbered pager. You cannot jump to page 5.
Order is always newest first.

---

## 10. Health

| Method | Path | Returns |
|---|---|---|
| `GET` | `/ping` | `{ "status": "ok", "uptime": 3.5 }` — process only, no DB |
| `GET` | `/health` | `{ "status": "ok", "db": "up", "uptime": 3.5 }` — runs `SELECT 1` |

Both are outside `/api` and need no auth. `/health` returns `db: "down"` rather than a 500 when
the database is unreachable.

---

## 11. Rate limits

| Scope | Limit |
|---|---|
| all `/api/*` | 300 per 15 min per IP |
| `/api/auth/login`, `/api/auth/register` | 10 per 15 min per IP (production) |

Exceeding either gives `429 RATE_LIMITED`. Worth a friendly message on the login screen —
10 attempts goes quickly if someone forgets their password.

---

## 12. Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo.com` | `Admin@123` |
| Store owner | `owner1@demo.com`, `owner2@demo.com`, `owner3@demo.com` | `Owner@123` |
| User | `user1@demo.com` … `user5@demo.com` | `User@123` |

Seeded data: 3 stores, 8–10 items each, ~400 orders spread over the last 90 days.

---

## 13. Screen-by-screen flows

### Signup / login

```
Landing → "Start shopping"    → POST /api/auth/register { role: "USER" }        → user dashboard
        → "Open your store"   → POST /api/auth/register { role: "STORE_OWNER" } → owner dashboard
        → "Login"             → POST /api/auth/login                            → route by data.user.role
```

Route by `user.role` after auth. There is no admin signup — admin logs in with seeded
credentials and lands on the admin dashboard.

### Customer (`USER`)

```
Browse       GET  /api/stores?q=&limit=20&cursor=
Store page   GET  /api/stores/:id                     ← includes available items, one call
Cart         (client-side only, scoped to one store)
Checkout     POST /api/orders  + Idempotency-Key
My orders    GET  /api/orders?limit=20&cursor=        ← auto-scoped to this user
Order detail GET  /api/orders/:id
Profile      GET  /api/auth/me  ·  PATCH /api/auth/me
```

### Store owner (`STORE_OWNER`)

```
My stores      GET    /api/stores/mine                     ← plain array, no meta
Create store   POST   /api/stores
Edit store     PATCH  /api/stores/:id                       ← name, description, image_url, is_active
Manage items   GET    /api/stores/:storeId/items            ← omit ?available to see hidden ones
Add item       POST   /api/stores/:storeId/items            ← price is a NUMBER
Edit item      PATCH  /api/items/:id                        ← incl. image_url
Hide item      DELETE /api/items/:id                        ← soft delete, returns 200 + item
Order queue    GET    /api/orders?status=PLACED             ← auto-scoped to owned stores
Advance order  PATCH  /api/orders/:id/status
Profile        PATCH  /api/auth/me
Dashboard      GET    /api/analytics/summary                ← auto-scoped to owned stores
               GET    /api/analytics/orders-per-day
               GET    /api/analytics/top-items?limit=5
               GET    /api/analytics/revenue-per-store      ← only their own stores
Live           socket order:created, order:status_updated   ← store:{id} rooms, auto-joined
```

### Admin (`ADMIN`)

```
All stores   GET   /api/stores
All orders   GET   /api/orders?limit=50
Any order    PATCH /api/orders/:id/status
Any store    PATCH /api/stores/:id
Any item     PATCH /api/items/:id
Analytics    GET   /api/analytics/summary                 ← every store
             GET   /api/analytics/revenue-per-store       ← the admin's main table
             GET   /api/analytics/orders-per-day
             GET   /api/analytics/top-items
Archive      POST  /api/archive-old-orders                ← admin-only maintenance action
Live         socket order:created, order:status_updated   ← "admin" room, all orders
```

Admin cannot place orders (`POST /api/orders` is `USER`-only) and `/api/stores/mine` will be
empty for admin. Build the admin screens on the unscoped list endpoints.

---

## 14. Frontend gotchas

Ranked by how much time each one costs if missed.

1. **`price` is a number, not a string.** `Number(input.value)` before sending, or you get a 400.
2. **`image_url: null` clears an image**; omitting the key leaves it unchanged. Two different
   things — your edit form must distinguish "untouched" from "cleared".
3. **Access token expires in 15 minutes.** Without a refresh interceptor your app breaks after
   15 minutes of use, which is long enough to look random.
4. **Refresh tokens rotate.** Store the new one every time. Never fire two refreshes at once.
5. **404 on an order can mean "not yours".** Say "not found", never "forbidden".
6. **No page numbers.** Design for Load more / infinite scroll.
7. **One store per cart.** Enforce it in cart state, or checkout fails.
8. **Money is a plain JS number** (`250.5`, not `"250.50"`). Format for display yourself.
9. **`meta` is absent** on non-paginated endpoints (`/api/stores/mine`, item lists,
   single-object responses). Do not assume it is there.
10. **Free-tier cold start.** The first request after ~15 minutes idle can take up to a minute,
    or occasionally fail once and work on retry. Show a real loading state, and retry once on
    network failure.
11. **CORS.** Your deployed frontend origin must be listed in the backend's `CORS_ORIGINS`
    env var, with no trailing slash. This applies to the socket connection too — it uses the
    same allow-list.
12. **`analytics/orders-per-day` returns `day` as a string.** Do not reformat it through
    `new Date()` without handling timezones, or points land on the wrong day.
13. **`order:status_updated` is a slim payload** — no `items`. Patch by `id`; never replace the
    cached order object with it.
14. **Sockets re-authenticate on every reconnect.** A 15-minute-old access token fails the
    handshake. Handle `connect_error` / `UNAUTHORIZED` by refreshing and reconnecting.
15. **Events during a disconnect are lost.** Refetch once on `connect`.
16. **`revenue-per-store` counts `COMPLETED` only**, but `summary.total_revenue` counts every
    status. They are supposed to differ — do not "fix" it in the UI.

---

## Endpoint index

| Method | Path | Auth |
|---|---|---|
| `GET` | `/ping` | – |
| `GET` | `/health` | – |
| `POST` | `/api/auth/register` | – |
| `POST` | `/api/auth/login` | – |
| `POST` | `/api/auth/refresh` | – |
| `POST` | `/api/auth/logout` | – |
| `GET` | `/api/auth/me` | any |
| `PATCH` | `/api/auth/me` | any |
| `GET` | `/api/stores` | – |
| `GET` | `/api/stores/mine` | owner, admin |
| `GET` | `/api/stores/:id` | – |
| `POST` | `/api/stores` | owner, admin |
| `PATCH` | `/api/stores/:id` | owner (own), admin |
| `GET` | `/api/stores/:storeId/items` | – |
| `POST` | `/api/stores/:storeId/items` | owner (own), admin |
| `PATCH` | `/api/items/:id` | owner (own), admin |
| `DELETE` | `/api/items/:id` | owner (own), admin |
| `GET` | `/api/orders` | any (scoped) |
| `GET` | `/api/orders/:id` | any (scoped) |
| `POST` | `/api/orders` | user |
| `PATCH` | `/api/orders/:id/status` | owner (own), admin |
| `GET` | `/api/analytics/summary` | owner, admin |
| `GET` | `/api/analytics/orders-per-day` | owner, admin |
| `GET` | `/api/analytics/revenue-per-store` | owner, admin |
| `GET` | `/api/analytics/top-items` | owner, admin |
| `POST` | `/api/archive-old-orders` | admin |
| socket | `order:created`, `order:status_updated` | any (room-scoped) |
