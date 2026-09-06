/**
 * Builds a SET clause from the keys actually present, appending to `params`.
 * Unlike COALESCE this can set a column back to NULL, so an image can be removed.
 * Keys come from Zod-parsed objects (unknown keys stripped), never raw input.
 */
export function buildSet(data: Record<string, unknown>, params: unknown[]) {
  return Object.entries(data)
    .map(([col, value]) => {
      params.push(value);
      return `${col} = $${params.length}`;
    })
    .join(", ");
}
