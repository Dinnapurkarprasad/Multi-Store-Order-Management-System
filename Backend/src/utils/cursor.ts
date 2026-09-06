import { ApiError } from "./ApiError.js";

// Keyset cursor: base64("<iso_timestamp>|<uuid>"). Opaque to the client on purpose.
export const encodeCursor = (createdAt: Date | string, id: string) =>
  Buffer.from(`${new Date(createdAt).toISOString()}|${id}`).toString("base64url");

export function decodeCursor(cursor: string): { ts: string; id: string } {
  const [ts, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  if (!ts || !id || Number.isNaN(Date.parse(ts))) throw ApiError.badRequest("Malformed cursor");
  return { ts, id };
}

// Splits a `limit + 1` fetch into the page plus its next cursor.
export function toPage<T extends { created_at: string; id: string }>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    rows: page,
    meta: {
      limit,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null,
    },
  };
}
