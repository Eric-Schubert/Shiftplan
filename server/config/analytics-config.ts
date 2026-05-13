import { getBackendConfig } from "./backend-config";

export function getAnalyticsConfig() {
  return getBackendConfig().analytics;
}
