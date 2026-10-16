import { describe, expect, it } from "vitest";
import { buildMailText, buildSubject } from "~/server/services/contact-mail/message";
import type { ContactMessage } from "~/types/contact";

// 12:00 UTC is 14:00 in Berlin (contactMail.timezone), summer time.
const message: ContactMessage = {
  contact_id: 42,
  name: "Eric Schuber",
  reply_to: "antwort@example.com",
  subject: "Dienstplan",
  message: "Hallo, ich habe eine Frage zum Dienstplan.\nZweite Zeile.",
  created_at: "2026-05-09 12:00:00",
  read_at: null,
};

describe("contact mail text", () => {
  it("reads as before the catalog, byte for byte", () => {
    expect(buildMailText(message)).toBe(
      [
        "Neue Kontaktanfrage über den Schichtplaner",
        "",
        "Kontakt-ID: 42",
        "Eingegangen: 09.05.2026, 14:00",
        "Name: Eric Schuber",
        "Rückkontakt: antwort@example.com",
        "Betreff: Dienstplan",
        "",
        "Nachricht:",
        "Hallo, ich habe eine Frage zum Dienstplan.",
        "Zweite Zeile.",
      ].join("\n")
    );
    expect(buildSubject(message, "[Shiftplan]")).toBe("[Shiftplan] Dienstplan");
  });

  it("names the sender when the subject is empty", () => {
    const withoutSubject = { ...message, subject: "" };

    expect(buildSubject(withoutSubject, "[Shiftplan]")).toBe("[Shiftplan] Kontaktanfrage von Eric Schuber");
    expect(buildMailText(withoutSubject)).toContain("\nBetreff: -\n");
  });

  it("passes user input through untouched, message syntax included", () => {
    const tricky = { ...message, name: "Anna {name} @home | test", reply_to: "a@b.de", subject: "" };

    expect(buildMailText(tricky)).toContain("\nName: Anna {name} @home | test\nRückkontakt: a@b.de\n");
    expect(buildSubject(tricky, "[Shiftplan]")).toBe("[Shiftplan] Kontaktanfrage von Anna {name} @home | test");
  });

  it("keeps an unreadable timestamp as it is", () => {
    expect(buildMailText({ ...message, created_at: "gestern" })).toContain("\nEingegangen: gestern\n");
  });
});
