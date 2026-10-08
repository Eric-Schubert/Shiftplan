export type HolidaySettings = {
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
