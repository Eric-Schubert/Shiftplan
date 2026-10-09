// Reihenfolge = Nummerierung im Text und im Inhaltsverzeichnis. Die ID
// "app-daten-loeschen" verlinken die Store-Einträge, sie muss bleiben.
export const PRIVACY_SECTIONS = [
  { id: "zweck", title: "Zweck der Anwendung" },
  { id: "daten", title: "Verarbeitete Daten" },
  { id: "kontakt", title: "Kontaktformular und E-Mail" },
  { id: "cookies", title: "Anmeldung, Sicherheit und Cookies" },
  { id: "lokal", title: "Lokale Speicherung im Browser und in der App" },
  { id: "statistik", title: "Besuchsstatistik" },
  { id: "dienste", title: "Externe Dienste" },
  { id: "speicherdauer", title: "Speicherdauer" },
  { id: "app-daten-loeschen", title: "App-Daten löschen" },
  { id: "rechte", title: "Rechte betroffener Personen" },
  { id: "aenderungen", title: "Änderungen" },
] as const;

export type PrivacySectionId = (typeof PRIVACY_SECTIONS)[number]["id"];

export const PRIVACY_LINK_CLASS =
  "font-medium text-[var(--accent-strong)] underline underline-offset-4 decoration-[color-mix(in_srgb,currentColor_35%,transparent)] transition hover:decoration-current";
