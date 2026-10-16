import type { ClientConfig } from "~/types/instance";

/** The checked-in defaults, used until /api/instance has answered or when it cannot be reached. */
export const DEFAULT_CLIENT_CONFIG: ClientConfig = {
  passwordPolicy: {
    minLength: 8,
    maxLength: 256,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    // Empty: the forms show the catalog's settings.auth.passwordHint until the instance sends its own.
    hint: "",
  },
  username: { minLength: 3, maxLength: 100 },
  contactForm: {
    name: { minLength: 2, maxLength: 120 },
    replyTo: { minLength: 5, maxLength: 180 },
    subject: { minLength: 2, maxLength: 160 },
    message: { minLength: 10, maxLength: 4000 },
  },
  shift: { defaultColor: "#6366f1", minStaff: { default: 1, min: 0, max: 50 } },
  csrf: { cookieName: "csrf_token", methods: ["POST", "PATCH", "PUT", "DELETE"] },
};

/** The client config from an /api/instance response; missing parts keep their defaults. */
export function toClientConfig(response?: Partial<ClientConfig> | null): ClientConfig {
  const defaults = DEFAULT_CLIENT_CONFIG;
  const contactForm = response?.contactForm;
  return {
    passwordPolicy: { ...defaults.passwordPolicy, ...response?.passwordPolicy },
    username: { ...defaults.username, ...response?.username },
    contactForm: {
      name: { ...defaults.contactForm.name, ...contactForm?.name },
      replyTo: { ...defaults.contactForm.replyTo, ...contactForm?.replyTo },
      subject: { ...defaults.contactForm.subject, ...contactForm?.subject },
      message: { ...defaults.contactForm.message, ...contactForm?.message },
    },
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
