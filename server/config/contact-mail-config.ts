import { getBackendConfig } from "./backend-config";

export function getContactMailDefaults() {
  return getBackendConfig().contactMail;
}
