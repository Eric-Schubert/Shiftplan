import { AuditService } from "~/server/services/audit.service";
import { RotationExcelService } from "~/server/services/rotation-excel.service";
import { requestSource } from "~/server/utils/absence-flow";
import { requirePlanner } from "~/server/utils/auth";
import { getRotationValidationConfig } from "~/server/config/domain-config";

export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);

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

  const dryRun = parts?.find((part) => part.name === "dryRun")?.data.toString() === "1";
  const result = RotationExcelService.importTemplate(file.data, { dryRun });

  if (!dryRun) {
    AuditService.log({
      userId: user.userId,
      username: user.username,
      action: "pattern_import",
      year: result.config.start_year,
      weekNumber: result.config.start_week,
      reason: `Rotationsmuster aus Excel ersetzt: ${result.config.cycle_length}-Wochen-Zyklus, ${result.importedAssignments} ${result.importedAssignments === 1 ? "Zuweisung" : "Zuweisungen"}`,
      source: requestSource(event),
    });
  }

  return result;
});
