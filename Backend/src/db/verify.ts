import assert from "node:assert/strict";

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

  // 4. keyset paging walks every order exactly once
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < 5; page++) {
    const url: string = `/api/orders?limit=7${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const res: any = await call(url, { token: admin.token });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    for (const o of res.body.data) {
      assert.ok(!seen.has(o.id), `order ${o.id} returned twice across pages`);
      seen.add(o.id);
    }
    cursor = res.body.meta.nextCursor;
    if (!cursor) break;
  }
  assert.ok(seen.size >= 21, `expected several full pages, got ${seen.size}`);
  console.log(`ok 4 — keyset paging, ${seen.size} distinct orders, no repeats`);

  // 5. a USER cannot read another user's order — 404, not 403, so ids can't be probed
  const probe = await call(`/api/orders/${order.id}`, { token: user2.token });
  assert.equal(probe.status, 404, "another user's order must be invisible");
  assert.equal((await call(`/api/orders/${order.id}`, { token: user1.token })).status, 200);
  console.log("ok 5 — cross-user order access blocked");

  console.log("\nall checks passed");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
