export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }

  static badRequest(msg: string, d?: unknown) {
    return new ApiError(400, "VALIDATION_ERROR", msg, d);
  }
  static unauthorized(msg = "Unauthorized", code = "UNAUTHORIZED") {
    return new ApiError(401, code, msg);
  }
  static forbidden(msg = "Forbidden") {
    return new ApiError(403, "FORBIDDEN", msg);
  }
  static notFound(msg = "Not found") {
    return new ApiError(404, "NOT_FOUND", msg);
  }
  static conflict(code: string, msg: string) {
    return new ApiError(409, code, msg);
  }
}
