import type { PoolClient } from "pg";
import { query } from "../db/pool.js";
import type { Role } from "../config/constants.js";
import type { User } from "../types/index.js";
import { buildSet } from "../utils/sql.js";
import type { UpdateProfileInput } from "../validators/auth.schema.js";

interface UserRow extends User {
  password_hash: string;
}

const PUBLIC_COLUMNS = "id, name, email, role, image_url, created_at";

export const findByEmail = async (email: string) =>
  (await query<UserRow>("SELECT * FROM users WHERE email = $1", [email])).rows[0] ?? null;

export const findById = async (id: string) =>
  (await query<User>(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id])).rows[0] ?? null;

export const insert = async (
  data: { name: string; email: string; passwordHash: string; role: Role },
  client?: PoolClient,
) => {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [data.name, data.email, data.passwordHash, data.role],
  );
  return rows[0] as User;
};

export async function update(id: string, data: UpdateProfileInput) {
  const params: unknown[] = [id];
  const { rows } = await query<User>(
    `UPDATE users SET ${buildSet(data, params)} WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`,
    params,
  );
  return rows[0] as User;
}
