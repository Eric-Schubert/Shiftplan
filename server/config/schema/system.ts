import {
  booleanAt,
  integerAt,
  objectAt,
  oneOf,
  stringArrayAt,
  stringAt,
  type MutableErrorList,
} from "./fields";
import { rangeOrder } from "./ranges";

const HTTP_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD", "OPTIONS"]);
const SAME_SITE_VALUES = new Set(["strict", "lax", "none"]);

export function validateDatabase(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "database", errors);
  stringAt(config.directory, "database.directory", errors);
  stringAt(config.mainFile, "database.mainFile", errors);
  stringAt(config.adminFile, "database.adminFile", errors);

  const pragmas = objectAt(config.pragmas, "database.pragmas", errors);
  booleanAt(pragmas.foreignKeys, "database.pragmas.foreignKeys", errors);
  stringAt(pragmas.journalMode, "database.pragmas.journalMode", errors);
}

export function validateAuth(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "auth", errors);
  const policy = objectAt(config.passwordPolicy, "auth.passwordPolicy", errors);
  integerAt(policy.minLength, "auth.passwordPolicy.minLength", errors, { min: 1 });
  integerAt(policy.maxLength, "auth.passwordPolicy.maxLength", errors, { min: 1 });
  booleanAt(policy.requireUppercase, "auth.passwordPolicy.requireUppercase", errors);
  booleanAt(policy.requireLowercase, "auth.passwordPolicy.requireLowercase", errors);
  booleanAt(policy.requireNumber, "auth.passwordPolicy.requireNumber", errors);
  stringAt(policy.hint, "auth.passwordPolicy.hint", errors);
  rangeOrder(policy.minLength, policy.maxLength, "auth.passwordPolicy", errors);

  integerAt(config.passwordHashCost, "auth.passwordHashCost", errors, { min: 4, max: 15 });
  integerAt(config.bootstrapPasswordHashCost, "auth.bootstrapPasswordHashCost", errors, {
    min: 4,
    max: 15,
  });
  booleanAt(config.trustProxyHeaders, "auth.trustProxyHeaders", errors);

  const users = objectAt(config.users, "auth.users", errors);
  integerAt(users.usernameMinLength, "auth.users.usernameMinLength", errors, { min: 1 });
  integerAt(users.usernameMaxLength, "auth.users.usernameMaxLength", errors, { min: 1 });
  rangeOrder(users.usernameMinLength, users.usernameMaxLength, "auth.users", errors);

  const session = objectAt(config.session, "auth.session", errors);
  integerAt(session.durationMinutes, "auth.session.durationMinutes", errors, { min: 1 });
  booleanAt(session.extendOnActivity, "auth.session.extendOnActivity", errors);
  integerAt(session.tokenBytes, "auth.session.tokenBytes", errors, { min: 16 });
  integerAt(session.csrfTokenBytes, "auth.session.csrfTokenBytes", errors, { min: 16 });

  const cookies = objectAt(session.cookies, "auth.session.cookies", errors);
  stringAt(cookies.sessionName, "auth.session.cookies.sessionName", errors);
  stringAt(cookies.csrfName, "auth.session.cookies.csrfName", errors);
  oneOf(cookies.sameSite, "auth.session.cookies.sameSite", SAME_SITE_VALUES, errors);
  stringAt(cookies.path, "auth.session.cookies.path", errors);
  booleanAt(cookies.secureInProduction, "auth.session.cookies.secureInProduction", errors);

  const limit = objectAt(config.loginRateLimit, "auth.loginRateLimit", errors);
  integerAt(limit.maxAttempts, "auth.loginRateLimit.maxAttempts", errors, { min: 1 });
  integerAt(limit.windowMinutes, "auth.loginRateLimit.windowMinutes", errors, { min: 1 });
  integerAt(limit.blockMinutes, "auth.loginRateLimit.blockMinutes", errors, { min: 1 });

  const routes = objectAt(config.routes, "auth.routes", errors);
  stringArrayAt(routes.public, "auth.routes.public", errors);
  stringArrayAt(routes.publicGetPrefixes, "auth.routes.publicGetPrefixes", errors);
  const methods = stringArrayAt(routes.csrfMethods, "auth.routes.csrfMethods", errors);
  for (const method of methods) {
    if (!HTTP_METHODS.has(method.toUpperCase())) {
      errors.push(`auth.routes.csrfMethods enthaelt eine unbekannte HTTP-Methode: ${method}`);
    }
  }
}
