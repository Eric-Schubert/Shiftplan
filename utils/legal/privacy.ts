// Order = numbering in the text and the table of contents, the same in every language. Store listings link to
// the id "app-daten-loeschen", so the ids stay German in the English version too and must not change.
export const PRIVACY_SECTION_IDS = [
  "zweck",
  "daten",
  "kontakt",
  "cookies",
  "lokal",
  "statistik",
  "dienste",
  "speicherdauer",
  "app-daten-loeschen",
  "rechte",
  "aenderungen",
] as const;

export type PrivacySectionId = (typeof PRIVACY_SECTION_IDS)[number];

export type PrivacySection = { id: PrivacySectionId; title: string };

/** The sections in their order with one language's titles (utils/legal/<locale>/privacy.ts). */
export function privacySections(titles: Record<PrivacySectionId, string>): PrivacySection[] {
  return PRIVACY_SECTION_IDS.map((id) => ({ id, title: titles[id] }));
}

export const PRIVACY_LINK_CLASS =
  "font-medium text-[var(--accent-strong)] underline underline-offset-4 decoration-[color-mix(in_srgb,currentColor_35%,transparent)] transition hover:decoration-current";
