import { getDatabase } from "~/server/utils/database";
import { getAnalyticsConfig } from "~/server/config/analytics-config";
import { shiftDate } from "~/server/services/analytics/dates";
import type {
  AnalyticsDailyMetric,
  AnalyticsLocationMetric,
  AnalyticsPageMetric,
} from "~/types/analytics";

type DailyRow = {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
};

type PageRow = {
  path: string;
  pageViews: number;
  uniqueVisitors: number;
};

type LocationRow = {
  countryCode: string | null;
  region: string | null;
  city: string | null;
  pageViews: number;
  uniqueVisitors: number;
};

function emptyDailyMetrics(startDate: string, days: number): AnalyticsDailyMetric[] {
  return Array.from({ length: days }, (_, index) => ({
    date: shiftDate(startDate, index),
    pageViews: 0,
    uniqueVisitors: 0,
  }));
}

/** One entry per day of the range, days without visits included. */
export function queryDaily(startDate: string, endDate: string, days: number): AnalyticsDailyMetric[] {
  const rows = getDatabase()
    .prepare(
      `
        SELECT
          visit_date AS date,
          COUNT(*) AS pageViews,
          COUNT(DISTINCT visitor_hash) AS uniqueVisitors
        FROM page_visits
        WHERE visit_date BETWEEN ? AND ?
        GROUP BY visit_date
        ORDER BY visit_date ASC
      `
    )
    .all(startDate, endDate) as DailyRow[];

  const byDate = new Map(rows.map((row) => [row.date, row]));
  return emptyDailyMetrics(startDate, days).map((item) => {
    const row = byDate.get(item.date);
    return row
      ? {
          date: row.date,
          pageViews: Number(row.pageViews) || 0,
          uniqueVisitors: Number(row.uniqueVisitors) || 0,
        }
      : item;
  });
}

export function queryTopPages(startDate: string, endDate: string): AnalyticsPageMetric[] {
  const rows = getDatabase()
    .prepare(
      `
        SELECT
          path,
          COUNT(*) AS pageViews,
          COUNT(DISTINCT visitor_hash) AS uniqueVisitors
        FROM page_visits
        WHERE visit_date BETWEEN ? AND ?
        GROUP BY path
        ORDER BY pageViews DESC, uniqueVisitors DESC, path ASC
        LIMIT ?
      `
    )
    .all(startDate, endDate, getAnalyticsConfig().topPagesLimit) as PageRow[];

  return rows.map((row) => ({
    path: row.path,
    pageViews: Number(row.pageViews) || 0,
    uniqueVisitors: Number(row.uniqueVisitors) || 0,
  }));
}

export function queryLocations(startDate: string, endDate: string): AnalyticsLocationMetric[] {
  const rows = getDatabase()
    .prepare(
      `
        SELECT
          country_code AS countryCode,
          region,
          city,
          COUNT(*) AS pageViews,
          COUNT(DISTINCT visitor_hash) AS uniqueVisitors
        FROM page_visits
        WHERE visit_date BETWEEN ? AND ?
          AND (country_code IS NOT NULL OR region IS NOT NULL OR city IS NOT NULL)
        GROUP BY country_code, region, city
        ORDER BY uniqueVisitors DESC, pageViews DESC
        LIMIT ?
      `
    )
    .all(startDate, endDate, getAnalyticsConfig().locationsLimit) as LocationRow[];

  return rows.map((row) => ({
    countryCode: row.countryCode || null,
    region: row.region || null,
    city: row.city || null,
    pageViews: Number(row.pageViews) || 0,
    uniqueVisitors: Number(row.uniqueVisitors) || 0,
  }));
}
