import { describe, expect, it } from "vitest";
import { regionName } from "~/shared/utils/format/region";

describe("regionName", () => {
  it("writes an ISO 3166 country code in the language of the locale", () => {
    expect(regionName("de-DE", "DE")).toBe("Deutschland");
    expect(regionName("en-GB", "DE")).toBe("Germany");
    expect(regionName("de-DE", "AT")).toBe("Österreich");
    expect(regionName("en-GB", "nl")).toBe("Netherlands");
  });

  it("keeps a value that is no known two-letter code as written", () => {
    expect(regionName("de-DE", "Rechenzentrum Nord")).toBe("Rechenzentrum Nord");
    expect(regionName("en-GB", "Deutschland")).toBe("Deutschland");
    expect(regionName("de-DE", "XQ")).toBe("XQ");
    expect(regionName("de-DE", "D")).toBe("D");
    expect(regionName("de-DE", "")).toBe("");
  });
});
