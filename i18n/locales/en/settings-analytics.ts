import type de from "../de/settings-analytics";

// Settings tab “Visits”: page views of the public pages, by day, page and location.
export default {
  title: "Page views",
  period: "Period",
  days: "1 day | {count} days",
  refresh: "Refresh visit data",
  unavailable: "Statistics not available",
  loadFailed: "Visit data could not be loaded.",
  startPage: "Shift plan",
  unknownLocation: "Unknown",
  pages: { kicker: "Pages", title: "Most viewed", empty: "No visits recorded yet" },
  locations: { kicker: "Origin", title: "Country and location", empty: "No location data available" },
  uniqueVisits: "Unique visits: {count}",
  uniqueVisitorDays: "Unique daily visits: {count}",
  stats: { today: "Today", yesterday: "Yesterday", average: "Average per day" },
  daily: {
    kicker: "Daily trend",
    title: "Last {count} days",
    max: "Max. {count}",
    bar: "{day}: page views {views}, unique {visitors}",
  },
} satisfies typeof de;
