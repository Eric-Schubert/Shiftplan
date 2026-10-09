import { requireAdmin } from "~/server/utils/auth";
import { AuditService } from "~/server/services/audit.service";

export default defineEventHandler((event) => {
  requireAdmin(event);

  const query = getQuery(event);

  const limit = query.limit ? Number(query.limit) : undefined;
  const offset = Number(query.offset) || 0;

  return AuditService.getEntries({ limit, offset });
});
