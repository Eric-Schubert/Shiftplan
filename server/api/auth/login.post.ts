import { getAdminDatabase } from "~/server/utils/database";
import { createSession, getClientNetwork, limitAttempt, setSessionCookies } from "~/server/utils/session";
import { checkPassword } from "~/server/lib/session/password";
import { readJsonBody } from "~/server/utils/json-body";
import type { SessionUser, UserWithHash } from "~/types/auth";
import { getMaxPasswordLength, getUserValidationConfig } from "~/server/config/auth-config";
import { apiError } from "~/server/utils/api-error";

// An account may see more failures than one network, so one stranger alone cannot lock it.
const ACCOUNT_ATTEMPTS_FACTOR = 3;

export default defineEventHandler(async (event) => {
  const body = await readJsonBody<{ username: unknown; password: unknown; client: unknown }>(event);

  if (!body?.username || typeof body.username !== "string") {
    throw apiError(event, 400, "errors.auth.usernameRequired");
  }

  if (!body.password || typeof body.password !== "string") {
    throw apiError(event, 400, "errors.auth.passwordRequired");
  }

  const username = body.username.trim();
  const password = body.password;
  const userConfig = getUserValidationConfig();
  if (username.length < userConfig.usernameMinLength || username.length > userConfig.usernameMaxLength) {
    throw apiError(event, 400, "errors.auth.invalidCredentials");
  }

  if (password.length > getMaxPasswordLength()) {
    throw apiError(event, 400, "errors.auth.passwordTooLong");
  }

  // One bucket per network and a wider one per account, so guessing from many addresses
  // still hits a limit. A success clears only the account it proved.
  const buckets = [{ key: `login:${getClientNetwork(event)}` }, { key: `login-user:${username}`, factor: ACCOUNT_ATTEMPTS_FACTOR, resetOnSuccess: true }];
  const user = await limitAttempt(
    event,
    buckets,
    async () => {
      const row = getAdminDatabase()
        .prepare("SELECT user_id, username, role, active, created_at, password_hash FROM users WHERE username = ? AND active = 1")
        .get(username) as UserWithHash | undefined;
      return (await checkPassword(password, row?.password_hash)) ? row! : null;
    },
    "errors.auth.tooManyLogins"
  );

  if (!user) {
    throw apiError(event, 401, "errors.auth.loginFailed");
  }

  const sessionUser: SessionUser = {
    userId: user.user_id,
    username: user.username,
    role: user.role,
  };
  // The app keeps a Bearer token instead of cookies, so it needs no CSRF token either.
  if (body.client === "app") {
    const { sessionToken, expiresAt } = createSession(sessionUser, { client: "app" });
    return { success: true, user: sessionUser, token: sessionToken, expiresAt };
  }

  const { sessionToken, csrfToken } = createSession(sessionUser);
  setSessionCookies(event, sessionToken, csrfToken);

  return {
    success: true,
    user: sessionUser,
  };
});
