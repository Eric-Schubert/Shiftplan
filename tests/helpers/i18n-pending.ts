// App files that still hold German texts, by the step of the i18n plan that moves them. Exact paths:
// the guard in i18n-client-literals.test.ts fails on German anywhere else and on entries without German left.

/** Track C step 5: the audit log, converted in its own pull request. */
export const PENDING_SETTINGS = [
  "components/settings/audit/AuditLog.vue",
  "components/settings/audit/AuditLogEntry.vue",
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
