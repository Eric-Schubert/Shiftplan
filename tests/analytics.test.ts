import { describe, expect, it } from "vitest";
import {
  isLikelyBot,
  normalizeAnalyticsPath,
} from "../server/utils/analytics";

describe("analytics helpers", () => {
  it("filters bot user agents", () => {
    expect(isLikelyBot("Googlebot/2.1")).toBe(true);
    expect(isLikelyBot("curl/8.0")).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 Safari/537.36")).toBe(false);
  });

  it("normalizes only trackable app paths", () => {
    expect(normalizeAnalyticsPath("/")).toBe("/");
    expect(normalizeAnalyticsPath("/?week=12")).toBe("/");
    expect(normalizeAnalyticsPath("/settings")).toBeNull();
    expect(normalizeAnalyticsPath("/api/staff")).toBeNull();
    expect(normalizeAnalyticsPath("https://example.com/")).toBeNull();
  });
});
