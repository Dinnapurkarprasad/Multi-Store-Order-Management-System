import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query, withTransaction } from "./pool.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function migrate() {
  await query(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );

  const { rows } = await query<{ name: string }>("SELECT name FROM _migrations");
  const applied = new Set(rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(dir, file), "utf8");
    await withTransaction(async (c) => {
      await c.query(sql);
      await c.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    });
    console.log(`applied ${file}`);
  }
  console.log(`migrations up to date (${files.length} total)`);
}

// Run directly: `npm run migrate`
migrate()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
