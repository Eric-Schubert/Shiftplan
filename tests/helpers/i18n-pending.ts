// Legal texts are per-language components on purpose, not catalog entries: the German version is legally
// binding, the English one is a translation of it. The guard in i18n-client-literals.test.ts skips these
// folders; legal-pages.test.ts checks the English text for German.
export const LEGAL_TEXTS = /^(?:components|utils)\/legal\/(?:de|en)\//;

// App files that still hold German texts, by the step of the i18n plan that moves them. Exact paths:
// the guard in i18n-client-literals.test.ts fails on German anywhere else and on entries without German left.

/** Legal texts and the contact form: moved into LEGAL_TEXTS by step 10. */
export const PENDING_LEGAL: string[] = [];
