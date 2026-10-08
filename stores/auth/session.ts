import type { SessionUser } from "~/types/auth";
import backendConfig from "../../config/backend.config.json";

export type AuthSessionResponse =
  | { authenticated: false }
  | { authenticated: true; user: SessionUser; csrfToken?: string | null };

export type LoginResponse = {
  success: boolean;
  user?: SessionUser;
};

/** The CSRF token from its readable cookie; null on the server. */
export function readCsrfCookie(): string | null {
  if (import.meta.server) return null;
  const cookieName = backendConfig.auth.session.cookies.csrfName;
  const escapedName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
