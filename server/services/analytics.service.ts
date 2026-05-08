import { createHmac, randomBytes } from "node:crypto";
import { getAdminDatabase, getDatabase } from "~/server/utils/database";
import type {
  AnalyticsDailyMetric,
  AnalyticsLocationMetric,
  AnalyticsPageMetric,
  AnalyticsSummary,
} from "~/types/analytics";

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

const ANALYTICS_SALT_KEY = "analytics_salt";
const ANALYTICS_RETENTION_DAYS = 90;
const DEFAULT_SUMMARY_DAYS = 30;
const MAX_SUMMARY_DAYS = 90;

function clampSummaryDays(days?: number): number {
  if (!Number.isFinite(days)) return DEFAULT_SUMMARY_DAYS;
  return Math.min(MAX_SUMMARY_DAYS, Math.max(1, Math.trunc(days || DEFAULT_SUMMARY_DAYS)));
}

function getBerlinDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function shiftDate(date: string, offsetDays: number): string {
  const dateParts = date.split("-").map(Number);
  const year = dateParts[0] || 1970;
  const month = dateParts[1] || 1;
  const day = dateParts[2] || 1;
  const shifted = new Date(Date.UTC(year, month - 1, day + offsetDays, 12));
  return shifted.toISOString().slice(0, 10);
}

function getAnalyticsSalt(): string {
  const db = getAdminDatabase();
  const existing = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(ANALYTICS_SALT_KEY) as { value: string } | undefined;

  if (existing?.value) return existing.value;

  const salt = randomBytes(32).toString("hex");
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    ANALYTICS_SALT_KEY,
    salt
  );
  return salt;
}

function hashDailyVisitor(date: string, ip: string, userAgent: string): string {
  return createHmac("sha256", getAnalyticsSalt())
    .update(date)
    .update("\n")
    .update(ip || "unknown")
    .update("\n")
    .update(userAgent || "unknown")
    .digest("hex");
}

function normalizeText(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizePath(path: string): string {
  const cleaned = path.trim() || "/";
  return cleaned.slice(0, 180);
}

function normalizeReferrer(referrer: string | null | undefined): string | null {
  const value = normalizeText(referrer, 300);
  if (!value) return null;

  try {
    const url = new URL(value);
    return normalizeText(url.hostname, 160);
  } catch {
    return null;
  }
}

function normalizeCountryCode(value: string | null | undefined): string | null {
  const normalized = normalizeText(value, 12)?.toUpperCase() || null;
  if (!normalized || normalized === "XX" || normalized === "ZZ") return null;
  return normalized;
}

function cleanupOldVisits(today: string): void {
  const cutoffDate = shiftDate(today, -(ANALYTICS_RETENTION_DAYS - 1));
  getDatabase().prepare("DELETE FROM page_visits WHERE visit_date < ?").run(cutoffDate);
}

function emptyDailyMetrics(startDate: string, days: number): AnalyticsDailyMetric[] {
  return Array.from({ length: days }, (_, index) => ({
    date: shiftDate(startDate, index),
    pageViews: 0,
    uniqueVisitors: 0,
  }));
}

function mapDailyRows(startDate: string, days: number, rows: DailyRow[]): AnalyticsDailyMetric[] {
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

export class AnalyticsService {
  static getCurrentDate(): string {
    return getBerlinDate();
  }

  static recordVisit(params: VisitRecord): void {
    const date = params.date || getBerlinDate();
    const userAgent = normalizeText(params.userAgent, 280) || "unknown";
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
        normalizeText(params.region, 120),
        normalizeText(params.city, 120)
      );

    cleanupOldVisits(date);
  }

  static getSummary(options?: { days?: number }): AnalyticsSummary {
    const days = clampSummaryDays(options?.days);
    const endDate = getBerlinDate();
    const startDate = shiftDate(endDate, -(days - 1));
    const yesterday = shiftDate(endDate, -1);
    const db = getDatabase();

    const dailyRows = db
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

    const daily = mapDailyRows(startDate, days, dailyRows);
    const pageViews = daily.reduce((sum, day) => sum + day.pageViews, 0);
    const uniqueVisitorDays = daily.reduce((sum, day) => sum + day.uniqueVisitors, 0);
    const today = daily.find((day) => day.date === endDate);
    const yesterdayMetric = daily.find((day) => day.date === yesterday);

    const topPageRows = db
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
          LIMIT 8
        `
      )
      .all(startDate, endDate) as PageRow[];

    const topPages = topPageRows.map((row): AnalyticsPageMetric => ({
      path: row.path,
      pageViews: Number(row.pageViews) || 0,
      uniqueVisitors: Number(row.uniqueVisitors) || 0,
    }));

    const locationRows = db
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
          LIMIT 8
        `
      )
      .all(startDate, endDate) as LocationRow[];

    const locations = locationRows.map((row): AnalyticsLocationMetric => ({
      countryCode: row.countryCode || null,
      region: row.region || null,
      city: row.city || null,
      pageViews: Number(row.pageViews) || 0,
      uniqueVisitors: Number(row.uniqueVisitors) || 0,
    }));

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

export const analyticsInternals = {
  getBerlinDate,
  shiftDate,
};
