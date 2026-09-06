import assert from "node:assert/strict";
import { io as ioClient, type Socket } from "socket.io-client";

// End-to-end checks against a running server (`npm run dev` in another terminal).
// Deliberately not a test framework — five assertions on the logic that can actually break.
const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:5000";

async function call(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  });
  return { status: res.status, body: (await res.json()) as any };
}

const connectSocket = (token: string) =>
  new Promise<Socket>((resolve, reject) => {
    const socket = ioClient(BASE, { auth: { token }, reconnection: false });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => {
      socket.close(); // else the dangling handle keeps node alive at exit
      reject(new Error(err.message));
    });
  });

const waitForEvent = <T>(socket: Socket, event: string, ms = 10_000) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for "${event}"`)), ms);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const login = async (email: string, password: string) => {
  const { status, body } = await call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  assert.equal(status, 200, `login ${email} failed: ${JSON.stringify(body)}`);
  return { token: body.data.accessToken as string, id: body.data.user.id as string };
};

async function main() {
  const admin = await login("admin@demo.com", "Admin@123");
  const user1 = await login("user1@demo.com", "User@123");
  const user2 = await login("user2@demo.com", "User@123");
  const owners = await Promise.all(
    [1, 2, 3].map((i) => login(`owner${i}@demo.com`, "Owner@123")),
  );

  const stores = (await call("/api/stores?limit=5", { token: user1.token })).body.data;
  const store = stores[0];
  const ownerToken = owners.find((o) => o.id === store.owner_id)!.token;
  const items = (await call(`/api/stores/${store.id}/items?available=true`, { token: user1.token }))
    .body.data;
  const [a, b] = items;

  // 1. total_amount is computed server-side and ignores whatever the client sends
  const placed = await call("/api/orders", {
    method: "POST",
    token: user1.token,
    body: JSON.stringify({
      store_id: store.id,
      total_amount: 1,
      items: [{ item_id: a.id, qty: 2 }, { item_id: b.id, qty: 1 }],
    }),
  });
  assert.equal(placed.status, 201, JSON.stringify(placed.body));
  const order = placed.body.data;
  const expected = order.items.reduce((s: number, l: any) => s + l.unit_price * l.qty, 0);
  assert.equal(order.total_amount, expected, "total_amount must come from DB prices");
  assert.notEqual(order.total_amount, 1);
  console.log("ok 1 — server-side total");

  // 2. duplicate item_id in the payload merges into one line
  const merged = await call("/api/orders", {
    method: "POST",
    token: user1.token,
    body: JSON.stringify({
      store_id: store.id,
      items: [{ item_id: a.id, qty: 2 }, { item_id: a.id, qty: 3 }],
    }),
  });
  assert.equal(merged.status, 201, JSON.stringify(merged.body));
  assert.equal(merged.body.data.items.length, 1, "duplicate item_ids must merge");
  assert.equal(merged.body.data.items[0].qty, 5);
  console.log("ok 2 — duplicate lines merged");

  // 3. status transitions: PLACED -> COMPLETED is a 409, PLACED -> PREPARING -> COMPLETED is fine
  const patch = (status: string) =>
    call(`/api/orders/${order.id}/status`, {
      method: "PATCH",
      token: ownerToken,
      body: JSON.stringify({ status }),
    });
  const skip = await patch("COMPLETED");
  assert.equal(skip.status, 409, "PLACED -> COMPLETED must be rejected");
  assert.equal(skip.body.error.code, "INVALID_STATUS_TRANSITION");
  assert.equal((await patch("PREPARING")).status, 200);
  assert.equal((await patch("COMPLETED")).status, 200);
  console.log("ok 3 — status transitions enforced");

  // 4. keyset paging returns every order exactly once — no repeats AND no skips.
  // Walking in small pages must yield exactly the same ids as one big page. Comparing the
  // sets is what catches a dropped row at a page boundary; a duplicate check alone cannot.
  const PAGES = 6;
  const SMALL = 5;
  const paged: string[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < PAGES; page++) {
    const url: string = `/api/orders?limit=${SMALL}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const res: any = await call(url, { token: admin.token });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    paged.push(...res.body.data.map((o: any) => o.id));
    cursor = res.body.meta.nextCursor;
    if (!cursor) break;
  }
  assert.equal(new Set(paged).size, paged.length, "an order was returned on two pages");

  const oneShot = await call(`/api/orders?limit=${PAGES * SMALL}`, { token: admin.token });
  assert.equal(oneShot.status, 200);
  const oneShotIds: string[] = oneShot.body.data.map((o: any) => o.id);
  assert.deepEqual(
    paged.slice(0, oneShotIds.length),
    oneShotIds,
    "small pages disagree with one big page — rows are being skipped or reordered",
  );
  assert.ok(paged.length >= PAGES * SMALL - SMALL, `expected full pages, got ${paged.length}`);

  // cursors must not leak internals
  assert.ok(!("_cursor" in oneShot.body.data[0]), "_cursor column leaked into the response");
  console.log(`ok 4 — keyset paging, ${paged.length} orders, no repeats and no skips`);

  // 5. a USER cannot read another user's order — 404, not 403, so ids can't be probed
  const probe = await call(`/api/orders/${order.id}`, { token: user2.token });
  assert.equal(probe.status, 404, "another user's order must be invisible");
  assert.equal((await call(`/api/orders/${order.id}`, { token: user1.token })).status, 200);
  console.log("ok 5 — cross-user order access blocked");

  // 6. socket handshake rejects a bad token
  await assert.rejects(
    () => connectSocket("not-a-real-token"),
    /UNAUTHORIZED/,
    "socket must reject an invalid token",
  );
  console.log("ok 6 — socket rejects invalid token");

  // 7. a new order reaches both the customer's room and the store owner's room
  const customerSocket = await connectSocket(user1.token);
  const ownerSocket = await connectSocket(ownerToken);
  const customerEvent = waitForEvent<{ id: string; items: unknown[] }>(customerSocket, "order:created");
  const ownerEvent = waitForEvent<{ id: string }>(ownerSocket, "order:created");

  const live = await call("/api/orders", {
    method: "POST",
    token: user1.token,
    body: JSON.stringify({ store_id: store.id, items: [{ item_id: a.id, qty: 1 }] }),
  });
  assert.equal(live.status, 201, JSON.stringify(live.body));

  const [toCustomer, toOwner] = await Promise.all([customerEvent, ownerEvent]);
  assert.equal(toCustomer.id, live.body.data.id, "customer got the wrong order");
  assert.equal(toOwner.id, live.body.data.id, "owner got the wrong order");
  assert.ok(Array.isArray(toCustomer.items) && toCustomer.items.length > 0, "payload must include items");
  customerSocket.close();
  ownerSocket.close();
  console.log("ok 7 — order:created delivered to customer and store owner rooms");

  // 8. analytics: role scoping and the archive-safe totals
  const adminSummary = await call("/api/analytics/summary", { token: admin.token });
  const ownerSummary = await call("/api/analytics/summary", { token: ownerToken });
  const userSummary = await call("/api/analytics/summary", { token: user1.token });
  assert.equal(adminSummary.status, 200);
  assert.equal(userSummary.status, 403, "USER must not reach analytics");
  assert.ok(
    adminSummary.body.data.total_orders >= ownerSummary.body.data.total_orders,
    "admin totals must be at least the owner's scoped totals",
  );
  const day = (await call("/api/analytics/orders-per-day", { token: admin.token })).body.data[0];
  assert.match(day.day, /^\d{4}-\d{2}-\d{2}$/, "day must be plain YYYY-MM-DD, not a timestamp");
  console.log("ok 8 — analytics scoped by role, day format is calendar-safe");

  console.log("\nall checks passed");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
