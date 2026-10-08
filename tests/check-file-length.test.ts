import { describe, expect, it } from "vitest";
import { MAX_LINES, countLines, findLongFiles } from "../scripts/check-file-length.js";

describe("file length check", () => {
  it("counts lines with and without a trailing newline", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("a\nb\n")).toBe(2);
    expect(countLines("a\nb")).toBe(2);
  });

  it("reports only checked source files above the limit", () => {
    const long = "x\n".repeat(MAX_LINES + 1);
    const short = "x\n".repeat(MAX_LINES);
    const contents: Record<string, string> = {
      "a.vue": long,
      "b.ts": short,
      "c.d.ts": long,
      "d.md": long,
    };

    expect(findLongFiles(Object.keys(contents), (file: string) => contents[file])).toEqual([
      { file: "a.vue", lines: MAX_LINES + 1 },
    ]);
  });
});
