export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  hint: string;
}

/** Instance settings from backend.config.json that the web client needs. Served by /api/instance. */
export interface ClientConfig {
  passwordPolicy: PasswordPolicy;
  shift: {
    defaultColor: string;
    minStaff: { default: number; min: number; max: number };
  };
  csrf: { cookieName: string; methods: string[] };
}
