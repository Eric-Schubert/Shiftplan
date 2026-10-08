import { getXlsxConfig } from "~/server/config/domain-config";

const XLSX_LIMITS = getXlsxConfig();
export const MAX_ZIP_ENTRY_COUNT = XLSX_LIMITS.maxZipEntryCount;
export const MAX_ZIP_ENTRY_UNCOMPRESSED_SIZE = XLSX_LIMITS.maxZipEntryUncompressedBytes;
export const MAX_ZIP_TOTAL_UNCOMPRESSED_SIZE = XLSX_LIMITS.maxZipTotalUncompressedBytes;
export const MAX_ZIP_EXPANSION_RATIO = XLSX_LIMITS.maxZipExpansionRatio;
export const MAX_WORKSHEET_COUNT = XLSX_LIMITS.maxWorksheetCount;
export const MAX_WORKSHEET_ROWS = XLSX_LIMITS.maxWorksheetRows;
export const MAX_WORKSHEET_COLUMNS = XLSX_LIMITS.maxWorksheetColumns;
