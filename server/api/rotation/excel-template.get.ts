import { RotationExcelService } from "~/server/services/rotation-excel.service";
import { requirePlanner } from "~/server/utils/auth";
import { xlsxContentType } from "~/server/utils/xlsx";

export default defineEventHandler((event) => {
  requirePlanner(event);

  const template = RotationExcelService.createTemplate();

  setHeader(event, "Content-Type", xlsxContentType());
  setHeader(
    event,
    "Content-Disposition",
    'attachment; filename="schichtplan-rotation-template.xlsx"'
  );

  return template;
});
