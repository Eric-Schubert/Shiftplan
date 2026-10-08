export type LengthConfig = {
  minLength: number;
  maxLength: number;
};

export type ContactSettings = {
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

export type ContactMailSettings = {
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
