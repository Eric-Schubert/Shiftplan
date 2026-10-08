export type DatabaseSettings = {
  directory: string;
  mainFile: string;
  adminFile: string;
  pragmas: {
    foreignKeys: boolean;
    journalMode: string;
  };
};

export type AuthSettings = {
  passwordPolicy: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    hint: string;
  };
  passwordHashCost: number;
  bootstrapPasswordHashCost: number;
  trustProxyHeaders: boolean;
  users: {
    usernameMinLength: number;
    usernameMaxLength: number;
  };
  session: {
    durationMinutes: number;
    extendOnActivity: boolean;
    tokenBytes: number;
    csrfTokenBytes: number;
    cookies: {
      sessionName: string;
      csrfName: string;
      sameSite: "strict" | "lax" | "none";
      path: string;
      secureInProduction: boolean;
    };
  };
  loginRateLimit: {
    maxAttempts: number;
    windowMinutes: number;
    blockMinutes: number;
  };
  routes: {
    public: string[];
    publicGetPrefixes: string[];
    csrfMethods: string[];
  };
};
