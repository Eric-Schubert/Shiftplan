// App files that still hold German texts, by the step of the i18n plan that moves them. Exact paths:
// the guard in i18n-client-literals.test.ts fails on German anywhere else and on entries without German left.

/** Track C step 6b: settings, the planner sign-in and their helpers. */
export const PENDING_SETTINGS = [
  "components/settings/analytics/VisitAnalytics.vue",
  "components/settings/analytics/VisitAnalyticsDailyChart.vue",
  "components/settings/analytics/VisitAnalyticsRanking.vue",
  "components/settings/analytics/VisitAnalyticsStats.vue",
  "components/settings/audit/AuditLog.vue",
  "components/settings/audit/AuditLogEntry.vue",
  "components/settings/contact/ContactMessageCard.vue",
  "components/settings/contact/ContactMessages.vue",
  "components/settings/requests/ShiftRequestApprovalSetting.vue",
  "components/settings/requests/ShiftRequestManager.vue",
  "utils/analytics/format.ts",
];

/** Legal texts and the contact form: per-language components, step 10. */
export const PENDING_LEGAL = [
  "components/legal/LegalImprintContact.vue",
  "components/legal/LegalImprintContactAlerts.vue",
  "components/legal/LegalImprintProvider.vue",
  "components/legal/LegalPrivacyAppScan.vue",
  "components/legal/LegalPrivacyAppServices.vue",
  "components/legal/LegalPrivacyHeader.vue",
  "components/legal/LegalPrivacyProcessing.vue",
  "components/legal/LegalPrivacyPurpose.vue",
  "components/legal/LegalPrivacyRetention.vue",
  "components/legal/LegalPrivacyRights.vue",
  "components/legal/LegalPrivacyServices.vue",
  "components/legal/LegalPrivacySidebar.vue",
  "components/legal/LegalPrivacySummary.vue",
  "composables/useImprintContactForm.ts",
  "pages/datenschutz.vue",
  "pages/impressum.vue",
  "utils/legal/contact-form.ts",
  "utils/legal/durations.ts",
  "utils/legal/privacy.ts",
];
