import { createEvent } from "h3";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { describe, expect, it } from "vitest";
import { localeTag } from "~/i18n/config";
import { instanceLocaleTag, localeFromAcceptLanguage, resolveLocale } from "~/server/utils/locale";

function eventWith(headers: Record<string, string>) {
  const request = new IncomingMessage(new Socket());
  request.headers = headers;
  return createEvent(request, new ServerResponse(request));
}

describe("request locale", () => {
  it("matches Accept-Language by quality, order and base language", () => {
    expect(localeFromAcceptLanguage("de-AT,de;q=0.9,en;q=0.8")).toBe("de");
    expect(localeFromAcceptLanguage("fr-CH, fr;q=0.9, de;q=0.5")).toBe("de");
    expect(localeFromAcceptLanguage("en;q=0.9, DE-de;q=0.95")).toBe("de");
    expect(localeFromAcceptLanguage("de;q=0, fr")).toBeNull();
    expect(localeFromAcceptLanguage("")).toBeNull();
    expect(localeFromAcceptLanguage(undefined)).toBeNull();
  });

  it("prefers the locale cookie, then Accept-Language, then German", () => {
    expect(resolveLocale(eventWith({ cookie: "shiftplan_locale=de", "accept-language": "fr" }))).toBe("de");
    expect(resolveLocale(eventWith({ cookie: "shiftplan_locale=xx", "accept-language": "de-CH" }))).toBe("de");
    expect(resolveLocale(eventWith({ "accept-language": "fr, en" }))).toBe("de");
    expect(resolveLocale(eventWith({}))).toBe("de");
  });

  it("gives the formatters full language tags", () => {
    expect(localeTag("de")).toBe("de-DE");
    expect(localeTag("xx")).toBe("de-DE");
    expect(instanceLocaleTag()).toBe("de-DE");
  });
});
