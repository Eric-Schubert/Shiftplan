import { AuditService } from "~/server/services/audit.service";
import { RotationExcelService } from "~/server/services/rotation-excel.service";
import { requirePlanner } from "~/server/utils/auth";
import { requestSource } from "~/server/utils/session";
import { getRotationValidationConfig } from "~/server/config/domain-config";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);

  const parts = await readMultipartFormData(event);
  const file = parts?.find((part) => part.name === "file" && part.filename);

  if (!file) {
    throw apiError(event, 400, "excel.noFile");
  }

  const maxImportBytes = getRotationValidationConfig().excelImportMaxBytes;
  if (file.data.length > maxImportBytes) {
    throw apiError(event, 400, "excel.fileTooLarge", { mb: Math.floor(maxImportBytes / 1024 / 1024) });
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
      reason: {
        key: "audit.reason.patternImported",
        params: { cycle: result.config.cycle_length, count: result.importedAssignments },
      },
      source: requestSource(event),
    });
  }

  return result;
});
