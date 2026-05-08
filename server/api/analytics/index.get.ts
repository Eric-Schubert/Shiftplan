import { AnalyticsService } from "~/server/services/analytics.service";
import { requireAdmin } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  requireAdmin(event);

  const query = getQuery(event);
  const days = query.days ? Number(query.days) : undefined;

  return AnalyticsService.getSummary({ days });
});
