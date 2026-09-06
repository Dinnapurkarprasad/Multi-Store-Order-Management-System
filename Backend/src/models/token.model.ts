import type { PoolClient } from "pg";
import { query } from "../db/pool.js";

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
}

export const findByHash = async (hash: string, client?: PoolClient) => {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run("SELECT * FROM refresh_tokens WHERE token_hash = $1", [hash]);
  return (rows[0] as RefreshTokenRow | undefined) ?? null;
};

export const insert = async (
  data: { userId: string; hash: string; expiresAt: Date },
  client?: PoolClient,
) => {
  const run = client ? client.query.bind(client) : query;
  await run(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [data.userId, data.hash, data.expiresAt],
  );
};

export const revokeByHash = async (hash: string, client?: PoolClient) => {
  const run = client ? client.query.bind(client) : query;
  const { rowCount } = await run(
    "UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
    [hash],
  );
  return rowCount ?? 0;
};

export const revokeAllForUser = async (userId: string, client?: PoolClient) => {
  const run = client ? client.query.bind(client) : query;
  await run(
    "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
    [userId],
  );
};
