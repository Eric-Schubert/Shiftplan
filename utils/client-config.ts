import type { ClientConfig } from "~/types/instance";

/** The checked-in defaults, used until /api/instance has answered or when it cannot be reached. */
export const DEFAULT_CLIENT_CONFIG: ClientConfig = {
  passwordPolicy: {
    minLength: 8,
    maxLength: 256,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    hint: "Mindestens 8 Zeichen mit Groß-/Kleinbuchstaben und Zahl",
  },
  shift: { defaultColor: "#6366f1", minStaff: { default: 1, min: 0, max: 50 } },
  csrf: { cookieName: "csrf_token", methods: ["POST", "PATCH", "PUT", "DELETE"] },
};

/** The client config from an /api/instance response; missing parts keep their defaults. */
export function toClientConfig(response?: Partial<ClientConfig> | null): ClientConfig {
  const defaults = DEFAULT_CLIENT_CONFIG;
  return {
    passwordPolicy: { ...defaults.passwordPolicy, ...response?.passwordPolicy },
    shift: {
      defaultColor: response?.shift?.defaultColor || defaults.shift.defaultColor,
      minStaff: { ...defaults.shift.minStaff, ...response?.shift?.minStaff },
    },
    csrf: {
      cookieName: response?.csrf?.cookieName || defaults.csrf.cookieName,
      methods: [...(response?.csrf?.methods ?? defaults.csrf.methods)],
    },
  };
}
