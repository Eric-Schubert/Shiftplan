import { t } from "~/i18n/server";
import { RotationExcelService } from "~/server/services/rotation-excel.service";
import { requirePlanner } from "~/server/utils/auth";
import { resolveLocale } from "~/server/utils/locale";
import { xlsxContentType } from "~/server/utils/xlsx";
import { attachmentDisposition } from "~/shared/utils/http/content-disposition";

export default defineEventHandler((event) => {
  requirePlanner(event);

  const locale = resolveLocale(event);
  const template = RotationExcelService.createTemplate(locale);

  setHeader(event, "Content-Type", xlsxContentType());
  setHeader(event, "Content-Disposition", attachmentDisposition(t(locale, "excelTemplate.fileName")));

  return template;
});
