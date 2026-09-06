export const ok = <T>(data: T, meta?: Record<string, unknown>) =>
  meta ? { success: true as const, data, meta } : { success: true as const, data };

export const fail = (code: string, message: string, details?: unknown) => ({
  success: false as const,
  error: details === undefined ? { code, message } : { code, message, details },
});
