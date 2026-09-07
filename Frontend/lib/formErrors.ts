import { ApiError } from "./api/client";

/**
 * Server validation mapped onto form fields. `details.fieldErrors` is already
 * keyed by field name (API.md §1), so this mostly just takes the first message
 * per field — a field showing three complaints at once is noise.
 *
 * 409 CONFLICT carries no `details`, but it is always about the email, so it
 * gets turned into a field error here rather than in each form.
 */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};

  if (error.code === "CONFLICT") {
    return { email: "That email is already registered. Sign in instead." };
  }

  const fields = error.fieldErrors;
  if (!fields) return {};

  return Object.fromEntries(
    Object.entries(fields)
      .map(([field, messages]) => [field, messages?.[0]])
      .filter(([, message]) => Boolean(message)) as [string, string][],
  );
}

/**
 * The message for any failed action outside the auth forms — used by every
 * error toast, so a screen never has to invent its own wording.
 */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";

  switch (error.code) {
    case "VALIDATION_ERROR": {
      // Prefer the specific field complaint over the generic "Invalid request".
      const first = Object.values(fieldErrorsOf(error))[0];
      return first ?? error.message;
    }

    case "RATE_LIMITED":
      return "Too many requests. Wait a moment and try again.";

    case "FORBIDDEN":
      return "You don't have access to that.";

    // 404 can mean "exists but isn't yours" — the API hides other people's ids
    // that way. Never say "forbidden" here (§9).
    case "NOT_FOUND":
      return "Not found.";

    case "INVALID_STATUS_TRANSITION":
      // Almost always a colleague who clicked first.
      return "That order already moved on. Refreshing.";

    case "UNAUTHORIZED":
    case "TOKEN_REUSE_DETECTED":
      return "Your session expired. Sign in again.";

    case "NETWORK_ERROR":
      return "Couldn't reach the server. It may still be waking up — try again in a moment.";

    default:
      return error.message || "Something went wrong. Try again.";
  }
}

/**
 * The one banner above a login or signup form. Returns null when the error was
 * fully explained by the fields, so there's no vague banner sitting on top of a
 * specific complaint.
 */
export function authErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";

  switch (error.code) {
    case "CONFLICT":
    case "VALIDATION_ERROR":
      // Already on the fields.
      return null;

    case "RATE_LIMITED":
      // 10 per 15 min per IP — reachable just by forgetting a password (§9).
      return "Too many attempts. Sign-in is limited to 10 tries every 15 minutes — wait a few minutes and try again.";

    case "UNAUTHORIZED":
      // The server returns the same error for an unknown email and a wrong
      // password, deliberately, so the endpoint can't be used to discover which
      // emails exist. The copy has to stay just as vague.
      return "That email and password don't match.";

    default:
      return errorMessage(error);
  }
}
