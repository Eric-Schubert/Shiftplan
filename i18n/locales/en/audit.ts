import type de from "../de/audit";

// Audit log in the settings. Entries store their reason as a key below `reason` with plain values
// and are rendered when shown (i18n/audit-reason.ts): {day} “Thu 08/10” comes from `date`,
// {days} “Wed 07/10 – Fri 09/10” from `from` and `to`, {weekOfYear} “Week 42/2026” from `year` and `week`.
export default {
  reason: {
    // Day changes: a single day on top of the weekly plan, or the days a request moved.
    day: "only {day}",
    takeover: "Takeover for {name}, {day}",
    swap: "Swap {requester} ↔ {partner}, {day}",
    requestReverted: "Request reverted, {day}",
    // Absences name only their days, never the reason.
    absence: "{days}",
    // A rollout either overwrites planned weeks or skips them, never both.
    generated: "1 week up to {weekOfYear} generated from the rotation pattern | {count} weeks up to {weekOfYear} generated from the rotation pattern",
    generatedOverwritten:
      "1 week up to {weekOfYear} generated from the rotation pattern, {overwritten} of them overwritten | {count} weeks up to {weekOfYear} generated from the rotation pattern, {overwritten} of them overwritten",
    generatedSkipped:
      "1 week up to {weekOfYear} generated from the rotation pattern, {skipped} skipped as already planned | {count} weeks up to {weekOfYear} generated from the rotation pattern, {skipped} skipped as already planned",
    patternImported:
      "Rotation pattern replaced from Excel: {cycle}-week cycle, {count} assignment | Rotation pattern replaced from Excel: {cycle}-week cycle, {count} assignments",
    // Copying a year: like a rollout, overwriting and skipping exclude each other.
    yearCopied: "1 week copied from {sourceYear} to {targetYear} | {count} weeks copied from {sourceYear} to {targetYear}",
    yearCopiedOverwritten:
      "1 week copied from {sourceYear} to {targetYear}, {overwritten} of them overwritten | {count} weeks copied from {sourceYear} to {targetYear}, {overwritten} of them overwritten",
    yearCopiedSkipped:
      "1 week copied from {sourceYear} to {targetYear}, {skipped} skipped as already planned | {count} weeks copied from {sourceYear} to {targetYear}, {skipped} skipped as already planned",
  },
  action: {
    assign: "Assigned",
    unassign: "Removed",
    dayAdd: "Assigned for one day",
    dayRemove: "Removed for one day",
    absence: "Absence reported",
    absenceCancel: "Absence withdrawn",
    generate: "Rolled out from pattern",
    patternImport: "Pattern imported",
  },
  // Between the person and the shift: “Anna Weber → Early”, “Anna Weber absent · Early”.
  separator: {
    added: " → ",
    removed: " ✕ ",
    absent: " absent · ",
    back: " back · ",
  },
  // A person or shift deleted before the entry was written.
  unknown: "Unknown",
  fromWeek: "from {week}",
  viaApp: "via app",
  intro: "All manual changes to the shift plan",
  empty: "No changes logged yet",
  page: "Page {page} of {pages} ({total} entries)",
} satisfies typeof de;
