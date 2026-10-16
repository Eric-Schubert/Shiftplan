import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useConfigStore } from "~/stores/config.store";
import { newUserProblem, passwordChangeProblem } from "~/utils/account-forms";
import { DEFAULT_CLIENT_CONFIG, toClientConfig } from "~/utils/client-config";
import { validatePasswordStrength } from "~/utils/password-policy";

const LOOSE_POLICY = {
  ...DEFAULT_CLIENT_CONFIG.passwordPolicy,
  minLength: 4,
  requireUppercase: false,
  requireNumber: false,
  hint: "Mindestens 4 Zeichen",
};

describe("client config", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("keeps the code defaults while /api/instance has not answered or failed", () => {
    expect(toClientConfig()).toEqual(DEFAULT_CLIENT_CONFIG);
    expect(toClientConfig(null)).toEqual(DEFAULT_CLIENT_CONFIG);
    expect(useConfigStore().$state).toEqual(DEFAULT_CLIENT_CONFIG);

    useConfigStore().apply(null);
    expect(useConfigStore().$state).toEqual(DEFAULT_CLIENT_CONFIG);
  });

  it("fills parts the response lacks from the defaults", () => {
    const config = toClientConfig({
      passwordPolicy: { ...LOOSE_POLICY },
      csrf: { cookieName: "", methods: ["POST"] },
    });

    expect(config.passwordPolicy).toEqual(LOOSE_POLICY);
    expect(config.shift).toEqual(DEFAULT_CLIENT_CONFIG.shift);
    expect(config.csrf).toEqual({ cookieName: "csrf_token", methods: ["POST"] });
  });

  it("does not share the default arrays with the store", () => {
    const store = useConfigStore();
    store.csrf.methods.push("GET");

    expect(DEFAULT_CLIENT_CONFIG.csrf.methods).not.toContain("GET");
  });

  it("checks passwords against the loaded policy", () => {
    const store = useConfigStore();
    expect(passwordChangeProblem("alt", "abcd", "abcd", store.passwordPolicy)).toBe(
      "Passwort muss mindestens 8 Zeichen haben"
    );

    store.apply({ passwordPolicy: LOOSE_POLICY });

    expect(store.passwordPolicy.hint).toBe("Mindestens 4 Zeichen");
    expect(passwordChangeProblem("alt", "abcd", "abcd", store.passwordPolicy)).toBeNull();
    expect(newUserProblem({ username: "anna", password: "abc", role: "planner" }, store.passwordPolicy)).toBe(
      "Passwort muss mindestens 4 Zeichen haben"
    );
  });

  it("keeps the default policy rules", () => {
    const policy = DEFAULT_CLIENT_CONFIG.passwordPolicy;

    expect(validatePasswordStrength("geheim12", policy).message).toBe(
      "Passwort muss mindestens einen Großbuchstaben enthalten"
    );
    expect(validatePasswordStrength("GEHEIM12", policy).message).toBe(
      "Passwort muss mindestens einen Kleinbuchstaben enthalten"
    );
    expect(validatePasswordStrength("Geheimnis", policy).message).toBe("Passwort muss mindestens eine Zahl enthalten");
    expect(validatePasswordStrength("x".repeat(257), policy).message).toBe("Passwort darf maximal 256 Zeichen haben");
    expect(validatePasswordStrength("Geheim12", policy)).toEqual({ valid: true, message: "" });
  });
});
