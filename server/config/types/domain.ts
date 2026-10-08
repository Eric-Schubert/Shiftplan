export type RangeConfig = {
  min: number;
  max: number;
};

export type DefaultRangeConfig = RangeConfig & {
  default: number;
};

export type ValidationSettings = {
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

export type RotationSettings = {
  defaultCycleLength: number;
  defaultStartWeek: number;
  cycleLengthMin: number;
  cycleLengthMax: number;
  excelImportMaxBytes: number;
};

export type ShiftplanSettings = {
  generateWeeksMin: number;
  generateWeeksMax: number;
};

export type XlsxSettings = {
  maxZipEntryCount: number;
  maxZipEntryUncompressedBytes: number;
  maxZipTotalUncompressedBytes: number;
  maxZipExpansionRatio: number;
  maxWorksheetCount: number;
  maxWorksheetRows: number;
  maxWorksheetColumns: number;
};

export type AuditSettings = {
  defaultLimit: number;
  maxLimit: number;
};
