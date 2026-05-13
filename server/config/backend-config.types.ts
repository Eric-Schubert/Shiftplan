export type BackendConfig = {
  database: {
    directory: string;
    mainFile: string;
    adminFile: string;
    pragmas: {
      foreignKeys: boolean;
      journalMode: string;
    };
  };
  auth: {
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
  validation: {
    string: {
      defaultMinLength: number;
      defaultMaxLength: number;
    };
    name: {
      defaultMaxLength: number;
    };
    year: RangeConfig;
    week: RangeConfig;
    id: RangeConfig;
    shift: {
      defaultColor: string;
      minStaff: DefaultRangeConfig;
      sortOrder: DefaultRangeConfig;
    };
  };
  rotation: {
    defaultCycleLength: number;
    defaultStartWeek: number;
    cycleLengthMin: number;
    cycleLengthMax: number;
    excelImportMaxBytes: number;
  };
  shiftplan: {
    generateWeeksMin: number;
    generateWeeksMax: number;
  };
  xlsx: {
    maxZipEntryCount: number;
    maxZipEntryUncompressedBytes: number;
    maxZipTotalUncompressedBytes: number;
    maxZipExpansionRatio: number;
    maxWorksheetCount: number;
    maxWorksheetRows: number;
    maxWorksheetColumns: number;
  };
  holidays: {
    timezone: string;
    provider: "openHolidays";
    apiBaseUrl: string;
    countryIsoCode: string;
    languageIsoCode: string;
    cacheHours: number;
    public: {
      includeNationwide: boolean;
      subdivisionCodes: string[];
      regionalType: "regional";
    };
    school: {
      defaultSubdivisionCodes: string[];
      lookupWindow: {
        startYearOffset: number;
        startMonth: number;
        startDay: number;
        endYearOffset: number;
        endMonth: number;
        endDay: number;
      };
    };
    subdivisionNames: Record<string, string>;
  };
  contact: {
    rateLimit: {
      windowMinutes: number;
      maxMessages: number;
    };
    list: {
      defaultLimit: number;
      maxLimit: number;
    };
    storage: {
      subjectMaxLength: number;
      userAgentMaxLength: number;
    };
    form: {
      name: LengthConfig;
      replyTo: LengthConfig;
      subject: LengthConfig;
      message: LengthConfig;
    };
  };
  analytics: {
    timezone: string;
    retentionDays: number;
    summary: {
      defaultDays: number;
      maxDays: number;
    };
    topPagesLimit: number;
    locationsLimit: number;
    text: {
      pathMaxLength: number;
      userAgentMaxLength: number;
      referrerMaxLength: number;
      referrerHostMaxLength: number;
      countryCodeMaxLength: number;
      regionMaxLength: number;
      cityMaxLength: number;
    };
  };
  audit: {
    defaultLimit: number;
    maxLimit: number;
  };
  contactMail: {
    provider: "graph";
    subjectPrefix: string;
    saveToSentItemsDefault: boolean;
    tokenSkewSeconds: number;
    graphScope: string;
    dateLocale: string;
    timezone: string;
    subjectMaxLength: number;
    errorBodyMaxLength: number;
  };
};

export type RangeConfig = {
  min: number;
  max: number;
};

export type DefaultRangeConfig = RangeConfig & {
  default: number;
};

export type LengthConfig = {
  minLength: number;
  maxLength: number;
};
