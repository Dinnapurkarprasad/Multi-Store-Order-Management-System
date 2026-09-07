# Counter — Frontend

*Order from any shop. Watch it move.*

Multi-store order management. Shoppers browse stores and follow their orders live;
store owners work a realtime order rail; admins get platform analytics and archival.

Backend and API contract: [`../Backend`](../Backend) · [`../Backend/docs/API.md`](../Backend/docs/API.md)

---

## Tech stack

| | |
|---|---|
| **Framework** | Next.js 15.5 (App Router, Turbopack) · React 19 · TypeScript 5 |
| **Styling** | Tailwind CSS v4 (`@theme` tokens, no config file) |
| **Server state** | TanStack Query v5 — caching, cursor pagination, optimistic updates |
| **Client state** | Zustand v5 — cart, auth tokens, console selection only |
| **HTTP** | axios — one client with a single-flight refresh interceptor |
| **Realtime** | socket.io-client v4 |
| **Forms** | react-hook-form + zod v4 (`@hookform/resolvers`) |
| **Motion** | motion v13 (`motion/react`) |
| **Charts** | recharts v3 |
| **Toasts** | sonner v2 |
| **Icons** | react-icons v5 (`react-icons/lu` only) |
| **Fonts** | Space Grotesk (display) · Geist Sans (UI) · Geist Mono (ids, money) |

No UI component library — the primitives in `components/ui/` are hand-rolled, and
dialogs use the native `<dialog>` element.

---

## Environment

Create a **`.env.local`** file in this folder. It's gitignored, so it isn't in the repo:

```bash
NEXT_PUBLIC_API_URL=https://storefront-oms.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://storefront-oms.onrender.com
```

Those point at the **deployed backend**, so there's nothing to run locally to use the app.

- `NEXT_PUBLIC_API_URL` includes the `/api` prefix. The `/ping` health check sits
  outside it and is derived from this value.
- `NEXT_PUBLIC_SOCKET_URL` is the bare origin — Socket.IO connects there, not to `/api`.

> The backend is on free hosting and sleeps when idle. The first request after a
> while can take up to a minute, and the app shows a *Waking the server* screen
> while it does. That's expected, not a hang.

To run against a local backend instead, use `http://localhost:5000/api` and
`http://localhost:5000`, and make sure `http://localhost:3000` is in the backend's
`CORS_ORIGINS` (no trailing slash — the socket uses the same allow-list).

---

## Installation

Requires **Node 20+** (developed on 24).

```bash
git clone <repo-url>
cd Frontend
npm install
```

Add `.env.local` as above, then:

```bash
npm run dev
```

Open **http://localhost:3000**.

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |

> Don't run `npm run build` while `npm run dev` is running — they share `.next`, and
> the build pulls the manifests out from under the dev server, which then returns 500
> on every route until you restart it.

---

## Deploying to Vercel

- **Root Directory:** `Frontend` — this repo holds `Backend/` and `Frontend/` side by side.
- **Framework preset:** Next.js. Leave the build command and output directory at their
  defaults.
- **Environment variables:** add both `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL`
  from the section above under Project Settings → Environment Variables. `.env.local` is
  gitignored, so the deployment doesn't inherit it — miss this and every request goes to
  `undefined/...`.
- **CORS:** add the deployed origin (e.g. `https://your-app.vercel.app`, **no trailing
  slash**) to the backend's `CORS_ORIGINS`. The same allow-list covers the socket, so
  without it both the API calls and the live updates fail.

---

## Demo accounts

Seeded on the deployed backend. There is no admin signup — the API rejects the role.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo.com` | `Admin@123` |
| Store owner | `owner1@demo.com` (also `owner2`, `owner3`) | `Owner@123` |
| Shopper | `user1@demo.com` … `user5@demo.com` | `User@123` |

Login redirects by role — shopper → `/stores`, owner → `/dashboard`, admin → `/admin`.

You can also **sign up your own shopper or store owner account** at `/signup` — pick
*I want to order* or *I run a store* (or go straight to `/signup?as=owner`). A brand-new
owner lands on an onboarding screen to open their storefront. Admin is the only role
you can't create; use the seeded credentials above.

Sign-in is rate limited to 10 attempts per 15 minutes per IP.

**To see the realtime part:** open two browsers, sign in as a shopper in one and
`owner1` in the other. Place an order — it appears on the owner's rail with no
reload, and advancing it there animates the shopper's status trail.
