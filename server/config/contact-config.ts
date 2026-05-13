import { getBackendConfig } from "./backend-config";

const MS_PER_MINUTE = 60 * 1000;

export function getContactConfig() {
  return getBackendConfig().contact;
}

export function getContactRateLimitConfig() {
  const rateLimit = getContactConfig().rateLimit;

  return {
    windowMs: rateLimit.windowMinutes * MS_PER_MINUTE,
    maxMessages: rateLimit.maxMessages,
  };
}

export function getContactListConfig() {
  return getContactConfig().list;
}

export function getContactStorageConfig() {
  return getContactConfig().storage;
}

export function getContactFormConfig() {
  return getContactConfig().form;
}
