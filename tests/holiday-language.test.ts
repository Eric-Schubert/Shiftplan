import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import backendConfig from "../config/backend.config.json";
import { pickName, subdivisionShortCode } from "~/server/lib/holidays/open-holidays";

// Country, states and the language of holiday names are instance settings in backend.config.json,
// independent of the reader's UI language.
const NEW_YEAR = [
  { language: "DE", text: "Neujahr" },
  { language: "EN", text: "New Year's Day" },
];
const WINTER = [
  { language: "DE", text: "Winterferien" },
  { language: "EN", text: "Winter holidays" },
];

let requests: URL[];
let configDir: string;

function useHolidayConfig(holidays: Record<string, unknown>) {
  const file = path.join(configDir, "backend.config.json");
  fs.writeFileSync(file, JSON.stringify({ ...backendConfig, holidays: { ...backendConfig.holidays, ...holidays } }));
  vi.stubEnv("SHIFTPLAN_BACKEND_CONFIG_PATH", file);
}

async function services() {
  const { resetBackendConfigForTests } = await import("~/server/config/backend-config");
  const { PublicHolidayService } = await import("~/server/services/public-holiday.service");
  const { SchoolHolidayService } = await import("~/server/services/school-holiday.service");
  return { resetBackendConfigForTests, PublicHolidayService, SchoolHolidayService };
}

beforeEach(() => {
  vi.resetModules();
  configDir = fs.mkdtempSync(path.join(os.tmpdir(), "holiday-language-"));
  requests = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(input);
      requests.push(url);
      const subdivisions = [{ code: `${url.searchParams.get("countryIsoCode")}-9`, shortName: "9" }];
      const body = url.pathname.endsWith("SchoolHolidays")
        ? [{ id: "w", startDate: "2026-02-09", endDate: "2026-02-21", type: "School", name: WINTER }]
        : [
            { id: "n", startDate: "2026-01-01", endDate: "2026-01-01", type: "Public", name: NEW_YEAR, nationwide: true },
            { id: "x", startDate: "2026-11-15", endDate: "2026-11-15", type: "Public", name: [], nationwide: false, subdivisions },
          ];
      return new Response(JSON.stringify(body), { status: 200 });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fs.rmSync(configDir, { recursive: true, force: true });
});

describe("holiday names", () => {
  it("come in the configured language, else the first name, else the fallback", () => {
    expect(pickName(NEW_YEAR, "EN", "?")).toBe("New Year's Day");
    expect(pickName(NEW_YEAR, "de", "?")).toBe("Neujahr");
    expect(pickName(NEW_YEAR, "FR", "?")).toBe("Neujahr");
    expect(pickName([], "DE", "Unbekannt")).toBe("Unbekannt");
  });

  it("follow holidays.languageIsoCode, and the cache keeps the languages apart", async () => {
    useHolidayConfig({ languageIsoCode: "EN" });
    const { resetBackendConfigForTests, PublicHolidayService, SchoolHolidayService } = await services();

    expect((await PublicHolidayService.list(2026, null)).map((holiday) => holiday.name)).toEqual(["New Year's Day"]);
    expect((await SchoolHolidayService.list(2026, null, ["SN"])).holidays.map((holiday) => holiday.name)).toEqual([
      "Winter holidays",
    ]);
    expect(requests.map((url) => url.searchParams.get("languageIsoCode"))).toEqual(["EN", "EN"]);

    await PublicHolidayService.list(2026, null);
    await SchoolHolidayService.list(2026, null, ["SN"]);
    expect(requests).toHaveLength(2);

    useHolidayConfig({ languageIsoCode: "DE" });
    resetBackendConfigForTests();
    expect((await PublicHolidayService.list(2026, null)).map((holiday) => holiday.name)).toEqual(["Neujahr"]);
    expect((await SchoolHolidayService.list(2026, null, ["SN"])).holidays.map((holiday) => holiday.name)).toEqual([
      "Winterferien",
    ]);
    expect(requests).toHaveLength(4);
  });
});

describe("holiday subdivisions", () => {
  it("strip only the configured country's prefix", () => {
    expect(subdivisionShortCode("DE-SN", "DE")).toBe("SN");
    expect(subdivisionShortCode(" de-sn ", "DE")).toBe("SN");
    expect(subdivisionShortCode("SN", "DE")).toBe("SN");
    expect(subdivisionShortCode("AT-9", "at")).toBe("9");
    expect(subdivisionShortCode("DE-SN", "AT")).toBe("DE-SN");
  });

  it("work for a country other than Germany", async () => {
    useHolidayConfig({
      countryIsoCode: "AT",
      languageIsoCode: "DE",
      public: { ...backendConfig.holidays.public, subdivisionCodes: ["AT-9"] },
      school: { ...backendConfig.holidays.school, defaultSubdivisionCodes: ["9"] },
      subdivisionNames: { "9": "Wien" },
    });
    const { PublicHolidayService, SchoolHolidayService } = await services();

    const publicHolidays = await PublicHolidayService.list(2026, null);
    expect(publicHolidays.map(({ name, states }) => ({ name, states }))).toEqual([
      { name: "Neujahr", states: [] },
      { name: "Unbekannt", states: [{ code: "9", name: "Wien" }] },
    ]);

    const { holidays } = await SchoolHolidayService.list(2026, null, ["AT-9"]);
    expect(holidays.map(({ state, stateName }) => ({ state, stateName }))).toEqual([{ state: "9", stateName: "Wien" }]);
    expect(requests.at(-1)!.searchParams.get("subdivisionCode")).toBe("AT-9");
  });
});
