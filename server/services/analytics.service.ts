import { getDatabase } from "~/server/utils/database";
import { getAnalyticsConfig } from "~/server/config/analytics-config";
import { clampSummaryDays, getBerlinDate, shiftDate } from "~/server/services/analytics/dates";
import { queryDaily, queryLocations, queryTopPages } from "~/server/services/analytics/queries";
import {
  hashDailyVisitor,
  normalizeCountryCode,
  normalizePath,
  normalizeReferrer,
  normalizeText,
} from "~/server/services/analytics/visitor";
import type { AnalyticsSummary } from "~/types/analytics";

type VisitRecord = {
  date: string;
  path: string;
  ip: string;
  userAgent: string;
  referrer?: string | null;
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
};

function cleanupOldVisits(today: string): void {
  const cutoffDate = shiftDate(today, -(getAnalyticsConfig().retentionDays - 1));
  getDatabase().prepare("DELETE FROM page_visits WHERE visit_date < ?").run(cutoffDate);
}

export class AnalyticsService {
  static getCurrentDate(): string {
    return getBerlinDate();
  }

  static recordVisit(params: VisitRecord): void {
    const date = params.date || getBerlinDate();
    const textConfig = getAnalyticsConfig().text;
    const userAgent = normalizeText(params.userAgent, textConfig.userAgentMaxLength) || "unknown";
    const visitorHash = hashDailyVisitor(date, params.ip, userAgent);

    getDatabase()
      .prepare(
        `
          INSERT INTO page_visits (
            visit_date,
            path,
            visitor_hash,
            user_agent,
            referrer,
            country_code,
            region,
            city,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `
      )
      .run(
        date,
        normalizePath(params.path),
        visitorHash,
        userAgent,
        normalizeReferrer(params.referrer),
        normalizeCountryCode(params.countryCode),
        normalizeText(params.region, textConfig.regionMaxLength),
        normalizeText(params.city, textConfig.cityMaxLength)
      );

    cleanupOldVisits(date);
  }

  static getSummary(options?: { days?: number }): AnalyticsSummary {
    const days = clampSummaryDays(options?.days);
    const endDate = getBerlinDate();
    const startDate = shiftDate(endDate, -(days - 1));
    const yesterday = shiftDate(endDate, -1);

    const daily = queryDaily(startDate, endDate, days);
    const pageViews = daily.reduce((sum, day) => sum + day.pageViews, 0);
    const uniqueVisitorDays = daily.reduce((sum, day) => sum + day.uniqueVisitors, 0);
    const today = daily.find((day) => day.date === endDate);
    const yesterdayMetric = daily.find((day) => day.date === yesterday);
    const topPages = queryTopPages(startDate, endDate);
    const locations = queryLocations(startDate, endDate);

    return {
      days,
      startDate,
      endDate,
      generatedAt: new Date().toISOString(),
      totals: {
        pageViews,
        uniqueVisitorDays,
        averagePageViewsPerDay: days > 0 ? pageViews / days : 0,
        todayPageViews: today?.pageViews || 0,
        todayUniqueVisitors: today?.uniqueVisitors || 0,
        yesterdayPageViews: yesterdayMetric?.pageViews || 0,
        yesterdayUniqueVisitors: yesterdayMetric?.uniqueVisitors || 0,
      },
      daily,
      topPages,
      locations,
      hasLocationData: locations.length > 0,
    };
  }
}
