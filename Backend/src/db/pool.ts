import pg from "pg";
import type { PoolClient, QueryResultRow } from "pg";
import { env } from "../config/env.js";

// NUMERIC(1700) -> JS number, so JSON responses return 250.5 not "250.50"
pg.types.setTypeParser(1700, (v) => parseFloat(v));
// BIGINT/int8(20) -> JS number, so COUNT(*) in analytics returns 400 not "400".
// Safe here: row counts never approach 2^53.
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  // Neon free tier auto-suspends; first query after idle can take ~1s
  connectionTimeoutMillis: 10_000,
});

// Neon drops idle connections when it auto-suspends. Without this listener the resulting
// error event on a pooled client is unhandled and takes the whole process down.
pool.on("error", (err) => {
  console.error("idle postgres client error:", err.message);
});

/** Runs SELECT 1 so the first real request doesn't pay Neon's cold-start cost. */
export const warmUp = async () => {
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    console.error("db warm-up failed:", (err as Error).message);
  }
};

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
