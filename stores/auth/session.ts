import type { SessionUser } from "~/types/auth";
import backendConfig from "../../config/backend.config.json";

export type AuthSessionResponse =
  | { authenticated: false }
  | { authenticated: true; user: SessionUser; csrfToken?: string | null };

export type LoginResponse = {
  success: boolean;
  user?: SessionUser;
};

/** Activity renews the session at most this often; the server keeps it for 30 minutes. */
export const SESSION_EXTEND_INTERVAL_MS = 5 * 60 * 1000;

/** The CSRF token from its readable cookie; null on the server. */
export function readCsrfCookie(): string | null {
  if (import.meta.server) return null;
  const cookieName = backendConfig.auth.session.cookies.csrfName;
  const escapedName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** A refused planner request: the session may have ended or the CSRF token may be outdated. */
export function isAuthFailure(error: unknown): boolean {
  const status = (error as { statusCode?: number; status?: number } | null)?.statusCode ?? (error as any)?.status;
  return status === 401 || status === 403;
}
