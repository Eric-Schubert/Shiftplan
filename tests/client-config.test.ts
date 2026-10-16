import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import type { MessageRef } from "~/i18n/types";
import { t } from "~/i18n/server";
import { validatePasswordStrength } from "~/shared/utils/limits";
import { useConfigStore } from "~/stores/config.store";
import { newUserProblem, passwordChangeProblem } from "~/utils/account-forms";
import { DEFAULT_CLIENT_CONFIG, toClientConfig } from "~/utils/client-config";
import { validateContactForm } from "~/utils/legal/contact-form";

const LOOSE_POLICY = {
  ...DEFAULT_CLIENT_CONFIG.passwordPolicy,
  minLength: 4,
  requireUppercase: false,
  requireNumber: false,
  hint: "Mindestens 4 Zeichen",
};

// The form checks return message references; the German text is what the dialogs show.
const german = (problem: MessageRef | null) => problem && t("de", problem.key, problem.params);

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
    expect(config.username).toEqual(DEFAULT_CLIENT_CONFIG.username);
    expect(config.contactForm).toEqual(DEFAULT_CLIENT_CONFIG.contactForm);
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
    expect(german(passwordChangeProblem("alt", "abcd", "abcd", store.passwordPolicy))).toBe(
      "Passwort muss mindestens 8 Zeichen haben"
    );

    store.apply({ passwordPolicy: LOOSE_POLICY });

    expect(store.passwordPolicy.hint).toBe("Mindestens 4 Zeichen");
    expect(passwordChangeProblem("alt", "abcd", "abcd", store.passwordPolicy)).toBeNull();
    expect(german(newUserProblem({ username: "anna", password: "abc", role: "planner" }, store))).toBe(
      "Passwort muss mindestens 4 Zeichen haben"
    );
  });

  it("checks user names and contact requests against the loaded lengths", () => {
    const store = useConfigStore();
    const user = { username: "ab", password: "Geheim12", role: "planner" as const };
    const request = { name: "Eva", replyTo: "eva@example.com", subject: "", message: "Hallo Team", company: "" };
    expect(german(newUserProblem(user, store))).toBe("Der Benutzername braucht mindestens 3 Zeichen.");
    expect(validateContactForm(request, store.contactForm)).toEqual({});

    store.apply({
      username: { minLength: 2, maxLength: 100 },
      contactForm: { ...store.contactForm, message: { minLength: 20, maxLength: 4000 } },
    });

    expect(newUserProblem(user, store)).toBeNull();
    expect(validateContactForm(request, store.contactForm)).toEqual({
      message: "Die Nachricht braucht mindestens 20 Zeichen.",
    });
  });

  it("keeps the default policy rules", () => {
    const policy = DEFAULT_CLIENT_CONFIG.passwordPolicy;
    const rule = (password: string) => {
      const broken = validatePasswordStrength(password, policy).rule;
      return broken && t("de", `errors.auth.password.${broken}`, { min: policy.minLength, max: policy.maxLength });
    };

    expect(rule("geheim12")).toBe("Passwort muss mindestens einen Großbuchstaben enthalten");
    expect(rule("GEHEIM12")).toBe("Passwort muss mindestens einen Kleinbuchstaben enthalten");
    expect(rule("Geheimnis")).toBe("Passwort muss mindestens eine Zahl enthalten");
    expect(rule("x".repeat(257))).toBe("Passwort darf maximal 256 Zeichen haben");
    expect(validatePasswordStrength("Geheim12", policy)).toEqual({ valid: true });
  });
});
