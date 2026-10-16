import bcrypt from "bcryptjs";
import {
  BOOTSTRAP_ADMIN_PASSWORD_ENV,
  BOOTSTRAP_PASSWORD_HASH_COST,
  MAX_BOOTSTRAP_PASSWORD_LENGTH,
  MIN_BOOTSTRAP_PASSWORD_LENGTH,
} from "./config.js";

export function isPasswordHash(value) {
  return typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
}

export function hashPassword(value) {
  return isPasswordHash(value) ? value : bcrypt.hashSync(value, BOOTSTRAP_PASSWORD_HASH_COST);
}

function validateBootstrapAdminPassword(password) {
  if (password.length < MIN_BOOTSTRAP_PASSWORD_LENGTH) {
    return `${BOOTSTRAP_ADMIN_PASSWORD_ENV} must have at least ${MIN_BOOTSTRAP_PASSWORD_LENGTH} characters`;
  }
  if (password.length > MAX_BOOTSTRAP_PASSWORD_LENGTH) {
    return `${BOOTSTRAP_ADMIN_PASSWORD_ENV} must have at most ${MAX_BOOTSTRAP_PASSWORD_LENGTH} characters`;
  }
  if (!/[A-Z]/.test(password)) {
    return `${BOOTSTRAP_ADMIN_PASSWORD_ENV} must contain at least one upper case letter`;
  }
  if (!/[a-z]/.test(password)) {
    return `${BOOTSTRAP_ADMIN_PASSWORD_ENV} must contain at least one lower case letter`;
  }
  if (!/[0-9]/.test(password)) {
    return `${BOOTSTRAP_ADMIN_PASSWORD_ENV} must contain at least one digit`;
  }
  return null;
}

export function readBootstrapAdminPassword(options = {}) {
  const directValue =
    typeof options.bootstrapAdminPassword === "string"
      ? options.bootstrapAdminPassword
      : process.env[BOOTSTRAP_ADMIN_PASSWORD_ENV];

  if (typeof directValue !== "string") return undefined;

  const password = directValue.trim();
  if (password.length === 0) return undefined;

  const validationMessage = validateBootstrapAdminPassword(password);
  if (validationMessage) {
    throw new Error(validationMessage);
  }

  return password;
}
