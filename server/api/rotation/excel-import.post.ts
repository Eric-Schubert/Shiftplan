import { RotationExcelService } from "~/server/services/rotation-excel.service";
import { requirePlanner } from "~/server/utils/auth";

const MAX_IMPORT_SIZE = 2 * 1024 * 1024;

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

  if (file.data.length > MAX_IMPORT_SIZE) {
    throw createError({
      statusCode: 400,
      statusMessage: "Die Excel-Datei darf maximal 2 MB groß sein",
    });
  }

  return RotationExcelService.importTemplate(file.data);
});
