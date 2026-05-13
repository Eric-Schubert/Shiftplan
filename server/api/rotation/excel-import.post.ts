import { RotationExcelService } from "~/server/services/rotation-excel.service";
import { requirePlanner } from "~/server/utils/auth";
import { getRotationValidationConfig } from "~/server/config/domain-config";

export default defineEventHandler(async (event) => {
  requirePlanner(event);

  const parts = await readMultipartFormData(event);
  const file = parts?.find((part) => part.name === "file" && part.filename);

  if (!file) {
    throw createError({
      statusCode: 400,
      statusMessage: "Keine Excel-Datei hochgeladen",
    });
  }

  const maxImportBytes = getRotationValidationConfig().excelImportMaxBytes;
  if (file.data.length > maxImportBytes) {
    throw createError({
      statusCode: 400,
      statusMessage: `Die Excel-Datei darf maximal ${Math.floor(maxImportBytes / 1024 / 1024)} MB groß sein`,
    });
  }

  return RotationExcelService.importTemplate(file.data);
});
