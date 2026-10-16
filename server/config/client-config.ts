import type { ClientConfig } from "~/types/instance";
import { getBackendConfig } from "./backend-config";

/** The client's share of the config, picked field by field so nothing else becomes public. */
export function getClientConfig(): ClientConfig {
  const { auth, validation } = getBackendConfig();
  const { minLength, maxLength, requireUppercase, requireLowercase, requireNumber, hint } = auth.passwordPolicy;
  const minStaff = validation.shift.minStaff;

  return {
    passwordPolicy: { minLength, maxLength, requireUppercase, requireLowercase, requireNumber, hint },
    shift: {
      defaultColor: validation.shift.defaultColor,
      minStaff: { default: minStaff.default, min: minStaff.min, max: minStaff.max },
    },
    csrf: {
      cookieName: auth.session.cookies.csrfName,
      methods: [...auth.routes.csrfMethods],
    },
  };
}
