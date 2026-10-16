import type { PasswordRules } from "~/shared/utils/limits";

export interface PasswordPolicy extends PasswordRules {
  hint: string;
}

export interface LengthLimits {
  minLength: number;
  maxLength: number;
}

/** Instance settings from backend.config.json that the web client needs. Served by /api/instance. */
export interface ClientConfig {
  passwordPolicy: PasswordPolicy;
  username: LengthLimits;
  contactForm: { name: LengthLimits; replyTo: LengthLimits; subject: LengthLimits; message: LengthLimits };
  shift: {
    defaultColor: string;
    minStaff: { default: number; min: number; max: number };
  };
  csrf: { cookieName: string; methods: string[] };
}
