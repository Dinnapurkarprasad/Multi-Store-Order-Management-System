import { ApiError } from "./ApiError.js";

/**
 * Keyset cursor: base64("<timestamp>|<uuid>"). Opaque to the client on purpose.
 *
 * The timestamp MUST keep Postgres' microsecond precision. `pg` parses timestamptz into a JS
 * Date, which only holds milliseconds — encoding that truncated value makes the next page
 * exclude rows that fall between the truncated and real timestamp, silently losing them.
 * So list queries select a `_cursor` column built with to_char(..., '...US"Z"') and we encode
 * that string verbatim.
 */
export const encodeCursor = (createdAt: string, id: string) =>
  Buffer.from(`${createdAt}|${id}`).toString("base64url");

export function decodeCursor(cursor: string): { ts: string; id: string } {
  const [ts, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  if (!ts || !id || Number.isNaN(Date.parse(ts))) throw ApiError.badRequest("Malformed cursor");
  return { ts, id };
}

/** Full-precision cursor column added by list queries; never sent to the client. */
export const CURSOR_COLUMN = `to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export interface Paginated {
  id: string;
  created_at: string;
  _cursor?: string;
}

/** Removes the internal cursor column before a row is serialised. */
export function stripCursor<T extends Paginated>(row: T): T {
  delete row._cursor;
  return row;
}

/** Splits a `limit + 1` fetch into the page plus its next cursor. */
export function toPage<T extends Paginated>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor(last._cursor ?? new Date(last.created_at).toISOString(), last.id)
      : null;

  return { rows: page.map(stripCursor), meta: { limit, hasMore, nextCursor } };
}
