# Frontend Spec — Counter

Pair this with `API.md`. That file is the data contract; this one is the design and screens.
Don't restate API details here — read them there.

Name: **Counter**. Line: *Order from any shop. Watch it move.*

---

## 1. Stack

Next.js 15 (App Router, TS) · Tailwind v4 `@theme` · TanStack Query v5 · Zustand (cart + auth only)
· axios with refresh interceptor · `socket.io-client` · `motion/react` · `react-icons/lu` **only**
· react-hook-form + zod · sonner · recharts

```
NEXT_PUBLIC_API_URL=https://storefront-oms.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://storefront-oms.onrender.com
```

---

## 2. Design

### The idea

The one object that belongs to this product is the **order ticket** — it arrives, it moves, it's
done. It's the hero, the card, and the dashboard unit.

Two skins from one token set:
- **Shopper = paper.** Light, roomy, image-led. You're browsing.
- **Owner / admin = ink.** Dark, dense, high contrast, like a kitchen display. You're working.

Don't merge them. Browsing and operating are different jobs.

### Tokens

```css
@theme {
  --color-ink:        #092328;  /* dark surfaces; body text on paper */
  --color-ink-raised: #0E3037;  /* cards on dark */
  --color-ink-line:   #17454E;  /* borders, hover on dark */
  --color-paper:      #F2F2F2;  /* light background */
  --color-paper-card: #FFFFFF;

  --color-ember:      #EC5B38;  /* primary action + brand */
  --color-ember-lift: #FF7A55;  /* hover; ember TEXT on dark (contrast) */
  --color-ember-haze: #EC5B3826;

  --color-placed:     #EC5B38;
  --color-preparing:  #F2A93B;
  --color-completed:  #2FB08A;

  --color-muted-ink:   #6B8085; /* secondary text on paper */
  --color-muted-paper: #8FA6AA; /* secondary text on ink */
}
```

- **One ember action per screen.** Two ember buttons on one screen means one is wrong.
- Status colors are only ever used for status.
- No gradient text.

### "Glowy" — exactly three effects, nowhere else

1. **Hero wash** — one large blurred radial of `--color-ember-haze`. Landing page only.
2. **Lifted edge on ink cards** — `border-top: 1px solid rgba(255,255,255,.07)` +
   `inset 0 1px 0 rgba(255,255,255,.05)`. This is what makes dark surfaces read as expensive.
3. **Ember bloom on primary buttons** — `0 8px 24px -8px rgba(236,91,56,.55)`, wider on hover.

No glassmorphism, no neon outlines, no glow on cards.

### Type

- **Display: Bricolage Grotesque** 700/800 — logotype, hero, page titles only.
  `tracking-[-0.035em]`, `leading-[0.95]` at large sizes.
- **UI: Geist Sans** 400/500/600 — everything else.
- **Geist Mono** — order IDs and money in tables only, so digits align.

Scale `12/14/16/20/26/34/48/68/92`. Body 16, measure `max-w-[62ch]`.
Banned: all-caps labels, eyebrow text above headings, one word in a headline in a different color.

### Shape

Radii carry hierarchy, not uniformity: pills `9999px` (nav, chips, buttons), cards `20px`,
tickets `14px`, inputs `12px`. Landing gets a faint `64px` grid at `rgba(9,35,40,.05)`, masked
out below the fold. Nothing else uses the grid.

---

## 3. Routes

```
/                          landing
/login  /signup?as=user|owner
/stores  /stores/[id]  /orders  /account          USER
/dashboard  /menu  /store  /analytics             STORE_OWNER
/admin  /stores  /orders  /archive                ADMIN
```

```ts
export const ROLE_HOME = { USER: "/stores", STORE_OWNER: "/dashboard", ADMIN: "/admin" };
```

After login/signup → `router.replace(ROLE_HOME[user.role])`. Wrong role on a guarded route →
same redirect. While the session restores, render the skeleton, **not** a redirect — otherwise
a refresh on `/dashboard` bounces the owner to the landing page.

**No admin signup.** `/signup` offers two roles only, and the login page carries one quiet line:
*Admin? Use the credentials in the README.*

---

## 4. Data layer

```ts
queries: { staleTime: 30_000, refetchOnWindowFocus: false,
  retry: (n, e) => e?.response?.status >= 400 && e?.response?.status < 500 ? false : n < 3 }
```

Never retry 4xx; do retry network failures — the backend is on free hosting and the first
request after idle can take up to a minute.

Keys in one file: `me`, `stores(params)`, `store(id)`, `items(storeId)`, `orders(params)`,
`order(id)`, `analytics(kind, params)`.

Orders use `useInfiniteQuery`, `getNextPageParam: last => last.meta.hasMore ? last.meta.nextCursor : undefined`.

**Optimistic status update** on the owner rail: cancel in-flight order queries, snapshot, patch
status across cached pages, roll back on error. On `409` refetch — someone clicked first.

### Cold start

Ping `/ping` on mount. If no answer in 3s, show a full-screen state: **"Waking the server"** /
*Free hosting sleeps when idle. Up to a minute, first visit only.* Ember progress bar, no spinner.

---

## 5. Realtime

One socket, created after auth, destroyed on logout. `useOrderSocket()` mounts once in Providers:

- `order:created` → prepend to page 0 of any cached orders list. Toast on the owner console.
- `order:status_updated` → **slim payload, no `items`** — patch `status` + `updated_at` by id,
  never replace the object.
- `connect_error` + `UNAUTHORIZED` → refresh token, `socket.auth = { token }`, `socket.connect()`.
- On every `connect` after the first → `invalidateQueries(["orders"])` once. Missed events are gone.

`<ConnectionBadge/>` in the console header: 6px dot, jade connected, amber + *Reconnecting*
otherwise. Only always-visible status chrome in the app.

Build refetch-after-mutation first. Sockets are a speed-up layered on top, not the mechanism.

---

## 6. Screens

### Landing `/`

Floating pill nav → hero → live order chips → the split → how an order moves → footer.

```
        Order from any shop.
        Watch it move ▐in real time▌     ← capsule is a filled ink pill
   Browse local stores, place an order, and follow it
   from placed to ready.
        [ Start ordering ]   Open a store →

  ╭ 2× Masala Chai · Preparing ╮  ╭ #1042 ready ╮  ╭ Sunrise · 3 new ╮
        (rotated, overlapping, drifting 8–12s)
──────────────────────────────────────────────────────
│  I want to order  (paper) │  I run a store  (ink)  │  full-bleed 50/50,
│  [Create an account]      │  [Open your storefront]│  stacks on mobile
──────────────────────────────────────────────────────
   How an order moves   ①placed → ②preparing → ③ready
```

Hero centered; everything below left-aligned. The sequence section is the **only** place
numbered markers are allowed, because it's the only thing that's actually a sequence.

### Auth

Split screen: ink panel left (logotype, one line, three drifting tickets), paper form right,
`max-w-[380px]`. `?as=` preselects the role as a two-option segmented control, not a dropdown.

Map `error.details.fieldErrors` straight onto form fields. Errors are specific:
`That email is already registered. Sign in instead.`

### Shopper: browse `/stores`

Search field pinned, responsive grid 1/2/3. `StoreCard` = `image_url` on top (4:3, ember-haze
placeholder with the store initial when null), name in display face, description clamped to 2
lines. Whole card links. Infinite scroll.

Loading = 6 skeletons in the real card's shape. Empty = `No stores match "xyz"` + clear button.

### Shopper: store `/stores/[id]`

**One call** — items come with the store, already filtered to available.

```
Store name (display 48)  ·  N items          │  Your order   ← sticky right on desktop,
┌────────┐ ┌────────┐ ┌────────┐             │  2× Chai ₹80     bottom bar → drawer on mobile
│ image  │ │ image  │ │ image  │             │  1× Roll ₹120
│ ₹120   │ │ ₹80    │ │ ₹200   │             │  Total   ₹200
│  [ + ] │ │ [− 2 +]│ │  [ + ] │             │ [Place order]
```

- Cart in Zustand, **one store at a time**. Adding from another store prompts:
  `Start a new order from <store>? Your current order will be cleared.`
- `QtyStepper` replaces `+` in place once qty > 0.
- Cart total is display only — read `total_amount` from the response as truth.
- `Idempotency-Key` = a `crypto.randomUUID()` generated when the cart is created, sent on
  `POST /orders`. Double-tap is then safe.
- On `400 "Some items are invalid or unavailable"` you can't tell which item failed — refetch
  the store and show `Some items are no longer available. Your order was updated.`

### Shopper: my orders `/orders`

Tabs `Active` (PLACED + PREPARING) · `Completed` · `All`. Default Active.

> There is no cancelled status in the API. Don't build that tab.

`OrderCard`: `store_name`, relative time, item lines, total in mono, and a **StatusTrail** —
three dots joined by a rule, filled to the current status. On a socket event the fill animates
and the next dot pulses once. That animation is the payoff of the realtime feature — use it
here and nowhere else.

Empty: `No orders yet.` + `Browse stores`.

> Archived orders vanish from `GET /orders` but stay in analytics. Don't promise "all your
> orders" in copy — say `Recent orders`.

### Owner: live rail `/dashboard`

Ink skin. **Fixed height, no page scroll:** `h-[calc(100vh-64px)] overflow-hidden`, three
columns scroll independently.

```
┌ Placed 3 ─────┬ Preparing 1 ──┬ Completed ────┐
│ #1042   2m    │ #1039   8m    │ #1031   41m   │
│ 2× Chai  ₹200 │ 1× Roll ₹120  │               │
│[Start preparing]│[Mark completed]│             │
```

- `OrderTicket`: ink-raised, lifted top edge, 3px status bar down the left, mono id, one action.
- Button derives from status: PLACED → `Start preparing`, PREPARING → `Mark completed`,
  COMPLETED → none.
- New ticket: slides in + one ember bloom decaying over 600ms. Status change: moves columns via
  `layoutId` so you see it travel.
- Empty column keeps a dashed outline + `Nothing here`, so the layout doesn't jump on the first order.
- Mobile: swipeable tabs, one column at a time.

**Owners can have several stores** (`GET /stores/mine`). Put a store switcher in the console
header; it sets `store_id` on the orders query and the analytics calls. If the array is empty,
the whole console becomes an onboarding screen: `Open your storefront` → `POST /stores`. Build
this first — a fresh owner signup hits it immediately.

### Owner: menu `/menu`

Table, not cards — it's data and owners scan it. Omit `?available` so hidden items still show
and can be re-enabled. Columns: image thumb, name, price, availability toggle, edit, hide.

- `price` must be sent as a **number**: `Number(value)` before submit.
- Edit form must distinguish *untouched* from *cleared*: omit `image_url` to leave it,
  send `null` to remove it.
- `DELETE` is a soft delete returning the updated item — patch the row, don't remove it.
- Empty: `Your menu is empty. Add your first item so people can order.`

### Owner: store `/store`

One form on `PATCH /stores/:id` — name, description, image_url, `is_active`. The active toggle
gets a plain-language label: *Visible to shoppers*, not "is_active".

### Owner / admin analytics

Four `StatCard`s from `/analytics/summary` (orders, revenue, avg order, **active now**), then:
- Orders per day — area chart, ember stroke, ember-haze fill. `day` is already `YYYY-MM-DD`;
  **pass it to recharts as-is**, don't run it through `new Date()`.
- Top items — horizontal bars, value labels at the bar end. Sorted by units, so bar length and
  revenue won't always agree — that's correct.

Range switcher `7d / 30d / 90d`. Skeletons at the exact chart height so nothing reflows.

> `revenue-per-store` counts COMPLETED only; `summary.total_revenue` counts every status. They
> are meant to differ. Label them differently — `Earned revenue` vs `Order value` — instead of
> making them look like the same number twice.

### Admin `/admin`

Same ink skin, wider tables. Platform stat cards + revenue-per-store table (the main artifact)
+ orders-per-day across all stores. Build on the unscoped endpoints — `/stores/mine` is empty
for an admin, and admins can't place orders.

`/archive` is one card: `days` input defaulted to 30, `Archive old orders`, confirm dialog
spelling out *Moves orders older than 30 days into the archive. Analytics totals stay the same.*
Then the result: `Archived 21 orders in 1 batch`. This screen is how a reviewer sees Task 3
without Postman — treat it as a demo surface.

> **Don't run it during development.** Seed data spans 90 days; a 30-day archive empties two
> thirds of your order screens. Demo it last.

### Account `/account`

`PATCH /auth/me` — name and image_url. Small, but it's the only place a user's avatar comes
from, so the nav has something to show.

---

## 7. Layout & motion

- Console: header `h-16`, body `h-[calc(100vh-64px)] overflow-hidden`, only inner panes scroll.
  Shop and marketing pages scroll normally.
- Container `max-w-[1280px] mx-auto px-5 md:px-8`. Check every screen at 375px.
- Sidebar → bottom tab bar under `lg`.

Four kinds of motion, that's all:

| Moment | Motion |
|---|---|
| Landing load | one orchestrated sequence: nav drops, headline masks up per line, chips stagger 60ms |
| Order chips | continuous ±6px float, 8–12s, landing only |
| Ticket arrives / moves | slide + `layoutId`, spring `{ stiffness: 320, damping: 30 }` |
| Status trail fills | width 400ms + one pulse on the newly reached dot |

Everything else is a CSS transition at 150–200ms. **No fade-and-slide-up on every section as
you scroll** — that single pattern is the fastest way to look generated.
`useReducedMotion()` → duration 0 on every variant.

---

## 8. Icons

`react-icons/lu` only, `strokeWidth` 1.75, 16 inline / 20 buttons / 24 nav. Fixed mapping:
`LuStore` `LuReceipt` `LuClock` (placed) `LuChefHat` (preparing) `LuCircleCheck` (completed)
`LuPlus` `LuMinus` `LuShoppingBag` `LuChartNoAxesColumn` `LuArchive` `LuUser` `LuLogOut`
`LuSearch` `LuWifi` `LuWifiOff`. Never an icon alone in a primary button.

---

## 9. Quality floor

- Visible focus ring on everything interactive: `ring-2 ring-ember ring-offset-2`.
- Every list ships loading / empty / error before the happy path. Errors name what failed and
  offer `Try again`.
- **Ember text on ink fails contrast — use `--color-ember-lift` there.** Ember on paper is fine.
- A `404` on an order means *not found*, never *forbidden* — that's how the API hides other
  people's ids.
- Money is a JS number (`250.5`); format to `₹1,240.00` in one place.
- Rate limit is 10 logins per 15 min — the login screen needs a real message for `429`.
- CORS: the deployed frontend origin must be in the backend's `CORS_ORIGINS`, no trailing slash.
  Same list covers the socket.

---

## 10. Build order

0. Tokens, fonts, `ui/` primitives (Button, Input, Card, Badge, Skeleton, Dialog, EmptyState)
1. `lib/api.ts` + refresh interceptor + queued 401s, authStore, RoleGuard, cold-start screen
2. Login / signup / role redirect — verify all three seeded roles land right
3. Shopper: browse → store → cart → place order → my orders
4. Owner: empty-state onboarding → create store → live rail → optimistic status → menu
5. **Sockets: two tabs, order in one, rail updates in the other.** The demo moment.
6. Analytics + admin + archive
7. Landing page
8. Responsive 375/768/1280, reduced motion, README + a side-by-side GIF of step 5

If time runs out, cut analytics polish before cutting step 5.
