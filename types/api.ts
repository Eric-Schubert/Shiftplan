import type { SessionUser } from "./auth";

export type ApiErrorResponse = {
  statusCode: number;
  statusMessage: string;
  message?: string;
  data?: unknown;
};

export type LoginResponseMode = "cookie" | "token";

export type LoginRequest = {
  username: string;
  password: string;
  responseMode?: LoginResponseMode;
};

export type CookieLoginResponse = {
  success: true;
  user: SessionUser;
};

export type TokenLoginResponse = CookieLoginResponse & {
  tokenType: "Bearer";
  sessionToken: string;
  expiresAt: string;
};

export type LoginResponse = CookieLoginResponse | TokenLoginResponse;

export type AuthSessionResponse =
  | { authenticated: false }
  | { authenticated: true; user: SessionUser; csrfToken?: string | null };

export type LogoutResponse = {
  success: true;
};

export type MutationSuccessResponse = {
  success: boolean;
};
