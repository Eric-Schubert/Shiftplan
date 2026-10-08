export type AnalyticsSettings = {
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
