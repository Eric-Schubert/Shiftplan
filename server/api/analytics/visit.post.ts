import {
  AnalyticsService,
  allowVisit,
  isLikelyBot,
  normalizeAnalyticsPath,
  readDecodedHeader,
  trustedGeoHeaders,
} from "~/server/services/analytics.service";
import { getClientIP, getClientNetwork } from "~/server/utils/session";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  // The app sends the path in the query (sendBeacon without a body); a JSON body is the older way.
  const body: unknown = await readBody(event).catch(() => null);
  const bodyPath = body && typeof body === "object" && "path" in body ? body.path : undefined;
  const path = normalizeAnalyticsPath(String(query.path || bodyPath || ""));
  const userAgent = getHeader(event, "user-agent") || "";

  if (!path || isLikelyBot(userAgent) || !allowVisit(getClientNetwork(event))) {
    return { success: true, tracked: false };
  }

  const geo = trustedGeoHeaders();
  try {
    AnalyticsService.recordVisit({
      date: AnalyticsService.getCurrentDate(),
      path,
      ip: getClientIP(event),
      userAgent,
      referrer: getHeader(event, "referer") || null,
      countryCode: readDecodedHeader(event, geo.country),
      region: readDecodedHeader(event, geo.region),
      city: readDecodedHeader(event, geo.city),
    });
  } catch (error) {
    console.warn("[analytics] visit could not be recorded", error);
    return { success: true, tracked: false };
  }

  return { success: true, tracked: true };
});
