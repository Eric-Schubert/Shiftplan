import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, ref, type Ref } from "vue";
import { requestErrorMessage, requestErrorStatus, type RequestErrorI18n } from "~/utils/request-error";
import { NOTICE_DURATION_MS, useErrorNotices } from "~/composables/useErrorNotices";

const catalog: Record<string, string> = {
  "errors.requests.tooLate": "Too late for {day}",
  "errors.common.fieldMissing": "{field} is missing",
  "validation.fields.name": "Name",
  "planner.shift.changeFailed": "The change could not be saved",
};
const i18n: RequestErrorI18n = {
  translate: (key, values) => catalog[key]!.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name])),
  has: (key) => key in catalog,
  locale: "en-GB",
};

// What $fetch throws for an error from server/utils/api-error.ts: the response body sits in `data`.
function failed(body: object, statusCode = 400) {
  return Object.assign(new Error("request failed"), { statusCode, data: body });
}

describe("request error text", () => {
  it("shows the message the server named, in the reader's language, with nested labels and dates", () => {
    const tooLate = failed({ statusMessage: "Zu spät", data: { code: "errors.requests.tooLate", params: { day: { date: "2026-10-15" } } } });
    expect(requestErrorMessage(tooLate, "planner.shift.changeFailed", i18n)).toBe("Too late for Thu 15/10");

    const missing = failed({ data: { code: "errors.common.fieldMissing", params: { field: { key: "validation.fields.name" } } } });
    expect(requestErrorMessage(missing, "planner.shift.changeFailed", i18n)).toBe("Name is missing");
  });

  it("falls back to the server's text, then to the action's own message", () => {
    expect(requestErrorMessage(failed({ statusMessage: "Gesperrt", data: { code: "errors.gone" } }), "planner.shift.changeFailed", i18n)).toBe(
      "Gesperrt"
    );
    expect(requestErrorMessage(new TypeError("fetch failed"), "planner.shift.changeFailed", i18n)).toBe("The change could not be saved");
    expect(requestErrorStatus(failed({}, 401))).toBe(401);
    expect(requestErrorStatus(new TypeError("fetch failed"))).toBeUndefined();
  });
});

describe("error notices", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function setup() {
    const states = new Map<string, Ref<unknown>>();
    vi.stubGlobal("useState", (key: string, init: () => unknown) => {
      if (!states.has(key)) states.set(key, ref(init()));
      return states.get(key);
    });
    vi.stubGlobal("useI18n", () => ({ t: (key: string) => catalog[key] ?? key, te: (key: string) => key in catalog }));
    vi.stubGlobal("useLocaleTag", () => computed(() => "en-GB"));
    return useErrorNotices();
  }

  it("shows a failed action once and closes it after a while", () => {
    vi.useFakeTimers();
    const { notices, notify } = setup();

    notify(new TypeError("fetch failed"), "planner.shift.changeFailed");
    notify(new TypeError("fetch failed"), "planner.shift.changeFailed");
    expect(notices.value.map((notice) => notice.text)).toEqual(["The change could not be saved"]);

    vi.advanceTimersByTime(NOTICE_DURATION_MS);
    expect(notices.value).toEqual([]);
  });

  it("closes a notice on request", () => {
    const { notices, notify, dismiss } = setup();
    notify(failed({ statusMessage: "Gesperrt" }), "planner.shift.changeFailed");
    dismiss(notices.value[0]!.id);
    expect(notices.value).toEqual([]);
  });
});
