import { ORDER_STATUS } from "../config/constants.js";
import { env } from "../config/env.js";
import { hashPassword } from "../utils/password.js";
import { pool, query, withTransaction } from "./pool.js";

if (env.NODE_ENV === "production") {
  console.error("refusing to seed in production");
  process.exit(1);
}

const CATALOG: Record<string, [string, number][]> = {
  "Bombay Bistro": [
    ["Paneer Tikka", 249], ["Butter Chicken", 349], ["Garlic Naan", 69],
    ["Veg Biryani", 279], ["Dal Makhani", 229], ["Gulab Jamun", 99],
    ["Masala Chai", 49], ["Chicken 65", 299], ["Jeera Rice", 149],
  ],
  "Kettle & Crumb": [
    ["Flat White", 180], ["Cold Brew", 220], ["Almond Croissant", 190],
    ["Blueberry Muffin", 160], ["Avocado Toast", 320], ["Chocolate Chip Cookie", 90],
    ["Espresso", 120], ["Banana Bread", 150],
  ],
  "Green Bowl": [
    ["Caesar Salad", 289], ["Quinoa Bowl", 349], ["Falafel Wrap", 259],
    ["Hummus Platter", 219], ["Smoothie Bowl", 269], ["Lentil Soup", 179],
    ["Grilled Veg Panini", 239], ["Kombucha", 140], ["Chia Pudding", 160],
  ],
};

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(arr: T[]): T => arr[rand(arr.length)]!;

const DEMO_EMAILS = [
  "admin@demo.com",
  "owner1@demo.com", "owner2@demo.com", "owner3@demo.com",
  "user1@demo.com", "user2@demo.com", "user3@demo.com", "user4@demo.com", "user5@demo.com",
];

/**
 * Refuses to wipe a database that has real signups in it. The live site and local dev share
 * one Neon database, so a stray `npm run seed` would otherwise delete real users.
 */
async function assertNoRealUsers() {
  const { rows } = await query<{ email: string }>(
    "SELECT email FROM users WHERE email <> ALL($1::text[]) LIMIT 5",
    [DEMO_EMAILS],
  );
  if (rows.length === 0) return;

  console.error("refusing to seed: this database has real (non-demo) accounts:");
  for (const r of rows) console.error(`  - ${r.email}`);
  console.error("Seeding would DELETE them. Drop the accounts manually if you really mean to.");
  process.exit(1);
}

async function seed() {
  await assertNoRealUsers();
  // The archive tables must be cleared too. They have no foreign keys, so CASCADE does not
  // reach them — leaving them would keep old archived orders pointing at deleted stores, and
  // the orders_all view would report ghost revenue on top of the fresh seed.
  await query(`TRUNCATE users, refresh_tokens, stores, items, orders, order_items,
                        orders_archive, order_items_archive RESTART IDENTITY CASCADE`);

  const [adminPw, ownerPw, userPw] = await Promise.all([
    hashPassword("Admin@123"),
    hashPassword("Owner@123"),
    hashPassword("User@123"),
  ]);

  const people = [
    { name: "Admin", email: "admin@demo.com", hash: adminPw, role: "ADMIN" },
    ...[1, 2, 3].map((i) => ({
      name: `Owner ${i}`, email: `owner${i}@demo.com`, hash: ownerPw, role: "STORE_OWNER",
    })),
    ...[1, 2, 3, 4, 5].map((i) => ({
      name: `User ${i}`, email: `user${i}@demo.com`, hash: userPw, role: "USER",
    })),
  ];

  const { rows: users } = await query<{ id: string; role: string; email: string }>(
    `INSERT INTO users (name, email, password_hash, role)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[])
     RETURNING id, role, email`,
    [people.map((p) => p.name), people.map((p) => p.email), people.map((p) => p.hash), people.map((p) => p.role)],
  );

  const owners = users.filter((u) => u.role === "STORE_OWNER");
  const customers = users.filter((u) => u.role === "USER");
  const storeNames = Object.keys(CATALOG);

  const { rows: stores } = await query<{ id: string; name: string }>(
    `INSERT INTO stores (owner_id, name, description)
     SELECT * FROM UNNEST($1::uuid[], $2::text[], $3::text[])
     RETURNING id, name`,
    [
      owners.map((o) => o.id),
      storeNames,
      storeNames.map((n) => `${n} — seeded demo store`),
    ],
  );

  const itemsByStore = new Map<string, { id: string; price: number; name: string }[]>();
  for (const store of stores) {
    const catalog = CATALOG[store.name]!;
    const { rows } = await query<{ id: string; price: number; name: string }>(
      `INSERT INTO items (store_id, name, price)
       SELECT $1, * FROM UNNEST($2::text[], $3::numeric[])
       RETURNING id, name, price`,
      [store.id, catalog.map((c) => c[0]), catalog.map((c) => c[1])],
    );
    itemsByStore.set(store.id, rows);
  }

  // ~400 orders spread over the last 90 days so archival and the analytics charts have real data
  const DAY = 86_400_000;
  let created = 0;
  for (let batch = 0; batch < 8; batch++) {
    await withTransaction(async (c) => {
      for (let i = 0; i < 50; i++) {
        const store = pick(stores);
        const catalog = itemsByStore.get(store.id)!;
        const lines = new Map<string, number>();
        for (let n = 0; n < 1 + rand(4); n++) {
          const item = pick(catalog);
          lines.set(item.id, (lines.get(item.id) ?? 0) + 1 + rand(3));
        }
        const chosen = [...lines].map(([id, qty]) => ({ ...catalog.find((x) => x.id === id)!, qty }));
        const total = chosen.reduce((s, x) => s + Number(x.price) * x.qty, 0);
        const at = new Date(Date.now() - rand(90) * DAY - rand(DAY)).toISOString();

        const { rows: [order] } = await c.query<{ id: string }>(
          `INSERT INTO orders (store_id, user_id, total_amount, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`,
          [store.id, pick(customers).id, total.toFixed(2), pick([...ORDER_STATUS]), at],
        );
        await c.query(
          `INSERT INTO order_items (order_id, item_id, item_name, unit_price, qty)
           SELECT $1, * FROM UNNEST($2::uuid[], $3::text[], $4::numeric[], $5::int[])`,
          [order!.id, chosen.map((x) => x.id), chosen.map((x) => x.name), chosen.map((x) => x.price), chosen.map((x) => x.qty)],
        );
        created++;
      }
    });
  }

  console.log(`seeded ${users.length} users, ${stores.length} stores, ${created} orders`);
  console.log("  admin@demo.com / Admin@123 | owner1@demo.com / Owner@123 | user1@demo.com / User@123");
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
