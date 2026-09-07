import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuth } from "@/store/auth";
import type { AuthSession, Envelope, FieldErrors, Page } from "../types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// /ping and /health sit OUTSIDE /api, so the cold-start check needs the bare
// origin. Derived rather than read from NEXT_PUBLIC_SOCKET_URL so it can't
// drift from whatever API_URL points at.
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

/** Every failure reaches a screen as this, whether it came from HTTP, the
 *  envelope, or a dead network. `status` is 0 when the request never landed. */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: FieldErrors;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Map straight onto form fields — keyed by field name (API.md §1). */
  get fieldErrors() {
    return this.details?.fieldErrors;
  }
}

export const api = axios.create({ baseURL: API_URL });

// ── request: attach the access token ──────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError(0, "UNKNOWN", (error as Error)?.message ?? "Unknown error");
  }
  const body = error.response?.data as Envelope<unknown> | undefined;
  if (body && body.success === false) {
    return new ApiError(
      error.response!.status,
      body.error.code,
      body.error.message,
      body.error.details,
    );
  }
  // No envelope means the request never reached the app — dead network, CORS,
  // or a proxy. status 0 keeps it retryable.
  return new ApiError(
    error.response?.status ?? 0,
    error.response ? "INTERNAL_ERROR" : "NETWORK_ERROR",
    error.message,
  );
}

function hardLogout() {
  useAuth.getState().clear();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// ── the refresh, single-flight ────────────────────────────────────────────
// Two parallel refreshes send the same refresh token twice, the server reads
// that as a leak, and it revokes EVERY session for the user (API.md §2). So
// concurrent 401s all await this one promise instead of each starting their own.
let inFlight: Promise<string> | null = null;

/**
 * Exported for the socket: its handshake re-runs on every reconnect, so a
 * 15-minute-old access token fails with connect_error UNAUTHORIZED and it has
 * to refresh too. It must come through THIS function rather than calling
 * /auth/refresh itself — a socket refresh racing an HTTP refresh would send
 * the same refresh token twice and revoke every session.
 */
export function refreshAccessToken(): Promise<string> {
  inFlight ??= runRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runRefresh(): Promise<string> {
  const refreshToken = useAuth.getState().refreshToken;
  if (!refreshToken) {
    throw new ApiError(401, "UNAUTHORIZED", "No refresh token");
  }

  // Bare axios on purpose. Going through `api` would put this call behind the
  // response interceptor below, and a 401 here would recurse into another
  // refresh.
  const res = await axios.post<Envelope<AuthSession>>(
    `${API_URL}/auth/refresh`,
    { refreshToken },
  );
  if (res.data.success === false) {
    throw new ApiError(401, res.data.error.code, res.data.error.message);
  }

  // Rotation: both tokens are new, both get stored.
  useAuth.getState().setSession(res.data.data);
  return res.data.data.accessToken;
}

// A 401 from these means "wrong password" or "expired refresh token", never
// "stale access token" — refreshing would be nonsense.
const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh"];

// ── response: refresh once, then retry the original request ───────────────
api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const apiError = toApiError(error);
    const config = axios.isAxiosError(error)
      ? (error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined)
      : undefined;

    // A replayed refresh token means the server has already killed every
    // session. Nothing to retry — wipe and start over.
    if (apiError.code === "TOKEN_REUSE_DETECTED") {
      hardLogout();
      throw apiError;
    }

    const refreshable =
      apiError.status === 401 &&
      config &&
      !config._retried &&
      !NO_REFRESH.some((path) => config.url?.startsWith(path)) &&
      useAuth.getState().refreshToken;

    if (!refreshable) throw apiError;

    config._retried = true; // once, never a loop
    try {
      const token = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return await api.request(config);
    } catch {
      hardLogout();
      throw apiError;
    }
  },
);

function body<T>(res: AxiosResponse<Envelope<T>>): Envelope<T> & { success: true } {
  if (res.data.success === false) {
    // A 2xx carrying success:false shouldn't happen, but a screen must never
    // render `undefined` as if it were data.
    throw new ApiError(res.status, res.data.error.code, res.data.error.message, res.data.error.details);
  }
  return res.data;
}

/** Unwraps `data` and throws ApiError on anything else. */
export async function http<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    return body<T>(await api.request<Envelope<T>>(config)).data;
  } catch (error) {
    throw error instanceof ApiError ? error : toApiError(error);
  }
}

/** Same, but keeps `meta` so useInfiniteQuery can read nextCursor. */
export async function httpPage<T>(config: AxiosRequestConfig): Promise<Page<T>> {
  try {
    const envelope = body<T[]>(await api.request<Envelope<T[]>>(config));
    return {
      data: envelope.data,
      meta: envelope.meta ?? { limit: envelope.data.length, hasMore: false, nextCursor: null },
    };
  } catch (error) {
    throw error instanceof ApiError ? error : toApiError(error);
  }
}
