import { describe, expect, it } from "vitest";
import { validateId, validateInteger } from "~/server/utils/validation";

function code(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return (error as { data?: { code?: string } }).data?.code;
  }
  return "no error";
}

describe("validateInteger", () => {
  it("takes whole numbers and their plain digits", () => {
    expect(validateInteger(12, "week")).toBe(12);
    expect(validateInteger("12", "week")).toBe(12);
    expect(validateInteger("-3", "week")).toBe(-3);
    expect(validateInteger("007", "week")).toBe(7);
    expect(validateInteger(5.0, "week")).toBe(5);
  });

  it.each([["12abc"], ["1e3"], ["5.9"], [" 12"], [""], [5.9], [true], [false], [[5]], [{}], [Number.NaN], [Infinity], ["9007199254740993"]])(
    "rejects %j instead of reading a number out of it",
    (value) => {
      expect(code(() => validateInteger(value, "week"))).toBe("validation.integer");
    }
  );

  it("keeps the range checks", () => {
    expect(code(() => validateInteger("0", "week", { min: 1 }))).toBe("validation.min");
    expect(code(() => validateInteger(54, "week", { max: 53 }))).toBe("validation.max");
  });

  it("does not turn route ids like 1e3 into id 1", () => {
    expect(code(() => validateId("1e3", "recordId"))).toBe("validation.integer");
    expect(validateId("1", "recordId")).toBe(1);
  });
});
