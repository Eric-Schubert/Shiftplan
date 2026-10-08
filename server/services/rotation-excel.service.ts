import { importRotationTemplate } from "~/server/services/rotation-excel/import";
import { createRotationTemplate } from "~/server/services/rotation-excel/template";

export type { RotationExcelImportResult } from "~/server/services/rotation-excel/import";

export const RotationExcelService = {
  createTemplate: createRotationTemplate,
  importTemplate: importRotationTemplate,
};
