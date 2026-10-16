import type de from "../de/settings-year-copy";

// “Copy year” next to the rotation wizard: copies a year's assignments into another year.
export default {
  button: "Copy year",
  header: "Copy shift plan",
  intro: "Copies all shift assignments from one year to another. The rotation pattern stays unchanged.",
  source: "From (source year)",
  target: "To (target year)",
  overwrite: "Overwrite existing assignments in {year}",
  copy: "Copy",
  loading: "Loading preview...",
  summary: "Weeks in {year}: {weeks} (assignments: {assignments})",
  empty: "No shift plans in {year}.",
  overwriteWarning: "⚠ Existing assignments in {year} will be deleted and replaced.",
  skipNote: "Weeks that already have assignments in {year} are skipped.",
  done: "✓ Copied successfully!",
  copied: "Weeks copied: {weeks} (assignments: {assignments})",
  skipped: "Weeks skipped (already filled): {weeks}",
  loadFailed: "Error loading the preview",
  copyFailed: "Error while copying",
} satisfies typeof de;
