import { describe, expect, it } from "vitest";
import { NO_IMPRINT, renderImprint, renderPrivacy, textOf, type LegalSetup } from "./helpers/legal-render";

// The privacy policy follows the instance: NUXT_PUBLIC_PRIVACY_* and NUXT_PUBLIC_IMPRINT_* from the
// runtime config, the rest from /api/legal/privacy. Each fact reads the same in German and English.

describe("Privacy policy as the instance is set up", () => {
  it("names the configured services", async () => {
    const text = (setup: Partial<LegalSetup>) => renderPrivacy({ ...setup, locale: "en" }).then(({ html }) => textOf(html));
    const plain = await text({ facts: { microsoft: false } });
    const all = await text({ cloudflare: true, hoster: "netcup GmbH, Karlsruhe", hosterLocation: "Deutschland", facts: { microsoft: true } });

    expect(plain).not.toContain("Microsoft 365");
    expect(plain).not.toContain("Delivery via Cloudflare");
    expect(plain).not.toContain("Hosting");
    expect(all).toContain("We send notifications of new requests by email via Microsoft 365 (Microsoft Graph).");
    expect(all).toContain("Email delivery via Microsoft 365");
    expect(all).toContain("Delivery via Cloudflare");
    expect(all).toContain("located on a server of netcup GmbH, Karlsruhe in a data centre in Deutschland");
  });

  it("names the location of the data centre only when it is configured", async () => {
    const text = (setup: Partial<LegalSetup>) =>
      renderPrivacy({ locale: "en", hoster: "netcup GmbH, Karlsruhe", ...setup }).then(({ html }) => textOf(html));

    expect(await text({ hosterLocation: "Deutschland" })).toContain(
      "located on a server of netcup GmbH, Karlsruhe in a data centre in Deutschland. The provider acts as a processor"
    );
    expect(await text({})).toContain("located on a server of netcup GmbH, Karlsruhe. The provider acts as a processor");
    expect(await text({})).not.toContain("data centre");
    expect(await text({ locale: "de", hosterLocation: "Deutschland" })).toContain(
      "auf einem Server von netcup GmbH, Karlsruhe in einem Rechenzentrum in Deutschland. Der Anbieter handelt"
    );
    expect(await text({ locale: "de" })).toContain("auf einem Server von netcup GmbH, Karlsruhe. Der Anbieter handelt");
  });

  it("says that the controller is not configured yet, as the legal notice does, instead of naming the country", async () => {
    const pages = (locale: LegalSetup["locale"]) =>
      Promise.all([renderPrivacy({ locale, imprint: NO_IMPRINT }), renderImprint({ locale, imprint: NO_IMPRINT })]).then((pages) =>
        pages.map(({ html }) => textOf(html))
      );
    const [privacyDe, imprintDe] = await pages("de");
    const [privacyEn, imprintEn] = await pages("en");

    expect(privacyDe).toContain("Verantwortlich Das Impressum ist noch nicht vollständig konfiguriert.");
    expect(imprintDe).toContain("Verantwortlich Das Impressum ist noch nicht vollständig konfiguriert.");
    expect(privacyDe).not.toContain("Verantwortlich Deutschland");
    expect(privacyEn).toContain("Controller The legal notice has not been fully configured yet.");
    expect(imprintEn).toContain("Responsible The legal notice has not been fully configured yet.");
    expect(privacyEn).not.toContain("Controller Deutschland");
  });

  it("ends the planner's browser session after the last activity, not a fixed time after signing in", async () => {
    const german = textOf((await renderPrivacy({ locale: "de" })).html);
    const english = textOf((await renderPrivacy({ locale: "en" })).html);

    expect(german).toContain(
      "endet im Browser spätestens 30 Minuten nach der letzten Aktivität, in der App nach 14 Tagen ohne Nutzung. Abmelden beendet sie sofort."
    );
    expect(english).toContain(
      "ends in the browser at the latest 30 minutes after the last activity, in the app after 14 days without use. Signing out ends it immediately."
    );
    expect(german).not.toContain("nach der Anmeldung, in der App");
  });

  it("describes the app's push route as the instance is set up", async () => {
    const text = (facts: Partial<LegalSetup["facts"]>) => renderPrivacy({ locale: "en", facts }).then(({ html }) => textOf(html));

    expect(await text({})).toContain("via ES Software's push service push.shiftplan.info");
    expect(await text({ defaultRelay: false, relayHost: "push.example.org" })).toContain("via the push service push.example.org set up by the operator");
    expect(await text({ appPush: false })).toContain("This instance does not send any pushes to the Shiftplan app.");
  });
});
