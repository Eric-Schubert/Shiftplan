import { AnalyticsService } from "~/server/services/analytics.service";
import {
  isLikelyBot,
  normalizeAnalyticsPath,
  readDecodedHeader,
} from "~/server/utils/analytics";
import { getClientIP } from "~/server/utils/session";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const body = (await readBody<{ path?: string }>(event).catch(() => ({}))) as {
    path?: string;
  };
  const path = normalizeAnalyticsPath(String(query.path || body.path || ""));
  const userAgent = getHeader(event, "user-agent") || "";

  if (!path || isLikelyBot(userAgent)) {
    return { success: true, tracked: false };
  }

  try {
    AnalyticsService.recordVisit({
      date: AnalyticsService.getCurrentDate(),
      path,
      ip: getClientIP(event),
      userAgent,
      referrer: getHeader(event, "referer") || null,
      countryCode: readDecodedHeader(event, [
        "cf-ipcountry",
        "x-vercel-ip-country",
        "cloudfront-viewer-country",
        "x-appengine-country",
        "x-country-code",
      ]),
      region: readDecodedHeader(event, [
        "x-vercel-ip-country-region",
        "x-appengine-region",
        "x-region",
      ]),
      city: readDecodedHeader(event, ["x-vercel-ip-city", "x-appengine-city", "x-city"]),
    });
  } catch (error) {
    console.warn("[analytics] visit could not be recorded", error);
    return { success: true, tracked: false };
  }

  return { success: true, tracked: true };
});
