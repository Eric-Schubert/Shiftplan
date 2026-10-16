import { describe, expect, it } from "vitest";
import { t } from "~/i18n/server";
import { DEFAULT_CLIENT_CONFIG } from "~/utils/client-config";
import { validateContactForm, type ContactForm } from "~/utils/legal/contact-form";

// The imprint's contact form shows these problems through useImprintContactForm; the German texts read as
// they did before the catalog. Limits: name 2, reply-to 5, subject 3 and message 10 characters.
const LIMITS = {
  name: { minLength: 2, maxLength: 120 },
  replyTo: { minLength: 5, maxLength: 200 },
  subject: { minLength: 3, maxLength: 160 },
  message: { minLength: 10, maxLength: 4000 },
};
const EMPTY: ContactForm = { name: "", replyTo: "", subject: "", message: "", company: "" };

function german(form: ContactForm) {
  const problems = validateContactForm(form, LIMITS);
  return Object.fromEntries(Object.entries(problems).map(([field, problem]) => [field, t("de", problem.key, problem.params)]));
}

describe("contact form texts", () => {
  it("name missing fields in field order", () => {
    expect(Object.entries(german(EMPTY))).toEqual([
      ["name", "Bitte gib deinen Namen ein."],
      ["replyTo", "Bitte gib eine E-Mail-Adresse oder Telefonnummer an."],
      ["message", "Bitte gib eine Nachricht ein."],
    ]);
  });

  it("name the configured minimum lengths", () => {
    expect(german({ ...EMPTY, name: "E", replyTo: "a@b", subject: "Hi", message: "Hallo" })).toEqual({
      name: "Der Name braucht mindestens 2 Zeichen.",
      replyTo: "Der Rückkontakt ist zu kurz.",
      subject: "Der Betreff braucht mindestens 3 Zeichen.",
      message: "Die Nachricht braucht mindestens 10 Zeichen.",
    });
    expect(german({ ...EMPTY, name: "Eva", replyTo: "eva@example.com", message: "Hallo Team, eine Frage." })).toEqual({});
  });

  it("keep the help and failure texts", () => {
    expect(t("de", "contact.form.remaining", { remaining: 4 })).toBe("Noch 4 Zeichen bis zum Senden.");
    expect(t("de", "contact.form.storedNote")).toBe("Die Angaben werden zur Bearbeitung der Anfrage gespeichert.");
    expect(t("de", "contact.form.sendFailed")).toBe("Die Nachricht konnte nicht gesendet werden.");
  });

  it("check against the limits the server ships by default", () => {
    expect(validateContactForm(EMPTY, DEFAULT_CLIENT_CONFIG.contactForm).name).toEqual({ key: "contact.form.nameMissing" });
  });
});
