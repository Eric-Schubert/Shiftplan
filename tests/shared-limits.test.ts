import { describe, expect, it } from "vitest";
import { passwordPolicyError } from "~/server/config/auth-config";
import { t } from "~/i18n/server";
import {
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
  isValidPin,
  isWeakPin,
  validatePasswordStrength,
} from "~/shared/utils/limits";
import { passwordChangeProblem } from "~/utils/account-forms";
import { pinProblem } from "~/utils/member-pin";
import { DEFAULT_CLIENT_CONFIG } from "~/utils/client-config";

describe("shared PIN rules", () => {
  it("accepts 6 to 12 digits and nothing else", () => {
    expect([PIN_MIN_LENGTH, PIN_MAX_LENGTH]).toEqual([6, 12]);
    expect(["583920", "583920174625"].map(isValidPin)).toEqual([true, true]);
    expect(["58392", "5839201746251", "58392a", " 583920", 583920, null].map(isValidPin)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("finds the PINs anyone tries first", () => {
    expect(["111111", "123456", "987654", "121212", "123123", "456789012"].map(isWeakPin)).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
    expect(isWeakPin("583920")).toBe(false);
  });

  it("gives the web form the same texts as the server", () => {
    const german = (pin: string, repeat: string) => {
      const problem = pinProblem(pin, repeat);
      return problem && t("de", problem.key, problem.params);
    };
    expect(pinProblem("12345", "12345")).toEqual({ key: "errors.member.pinLength", params: { min: 6, max: 12 } });
    expect(german("12345", "12345")).toBe("Die PIN braucht 6 bis 12 Ziffern");
    expect(pinProblem("123456", "123456")).toEqual({ key: "errors.member.pinWeak" });
    expect(german("583920", "583921")).toBe("Die PINs stimmen nicht überein");
    expect(pinProblem("583920", "583920")).toBeNull();
  });
});

describe("shared password check", () => {
  it("gives the same texts as the server with the configured policy", () => {
    const policy = DEFAULT_CLIENT_CONFIG.passwordPolicy;
    for (const password of ["kurz", "geheim12", "GEHEIM12", "Geheimnis", "x".repeat(257), "Geheim12"]) {
      const problem = passwordChangeProblem("alt", password, password, policy);
      expect(passwordPolicyError(null, password)?.statusMessage ?? "").toBe(
        problem ? t("de", problem.key, problem.params) : ""
      );
    }
    expect(passwordPolicyError(null, "kurz")?.statusMessage).toBe("Passwort muss mindestens 8 Zeichen haben");
  });

  it("skips the rules a policy switches off", () => {
    const loose = { minLength: 4, maxLength: 8, requireUppercase: false, requireLowercase: false, requireNumber: false };

    expect(validatePasswordStrength("abcd", loose)).toEqual({ valid: true });
    expect(validatePasswordStrength("abcdefghi", loose)).toEqual({ valid: false, rule: "maxLength" });
  });
});
