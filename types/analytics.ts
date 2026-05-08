export interface AnalyticsDailyMetric {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
}

export interface AnalyticsPageMetric {
  path: string;
  pageViews: number;
  uniqueVisitors: number;
}

export interface AnalyticsLocationMetric {
  countryCode: string | null;
  region: string | null;
  city: string | null;
  pageViews: number;
  uniqueVisitors: number;
}

export interface AnalyticsSummary {
  days: number;
  startDate: string;
  endDate: string;
  generatedAt: string;
  totals: {
    pageViews: number;
    uniqueVisitorDays: number;
    averagePageViewsPerDay: number;
    todayPageViews: number;
    todayUniqueVisitors: number;
    yesterdayPageViews: number;
    yesterdayUniqueVisitors: number;
  };
  daily: AnalyticsDailyMetric[];
  topPages: AnalyticsPageMetric[];
  locations: AnalyticsLocationMetric[];
  hasLocationData: boolean;
}
