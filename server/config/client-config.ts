import type { ClientConfig, LengthLimits } from "~/types/instance";
import { getBackendConfig } from "./backend-config";

const lengths = ({ minLength, maxLength }: LengthLimits): LengthLimits => ({ minLength, maxLength });

/** The client's share of the config, picked field by field so nothing else becomes public. */
export function getClientConfig(): ClientConfig {
  const { auth, contact, validation } = getBackendConfig();
  const { minLength, maxLength, requireUppercase, requireLowercase, requireNumber, hint } = auth.passwordPolicy;
  const { form } = contact;
  const minStaff = validation.shift.minStaff;

  return {
    passwordPolicy: { minLength, maxLength, requireUppercase, requireLowercase, requireNumber, hint },
    username: { minLength: auth.users.usernameMinLength, maxLength: auth.users.usernameMaxLength },
    contactForm: {
      name: lengths(form.name),
      replyTo: lengths(form.replyTo),
      subject: lengths(form.subject),
      message: lengths(form.message),
    },
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
