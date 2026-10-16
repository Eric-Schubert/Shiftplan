import { H3Event } from "h3";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { describe, expect, it } from "vitest";
import { passwordPolicyError } from "~/server/config/auth-config";
import { t } from "~/server/lib/i18n/translate";
import { XlsxError } from "~/server/lib/xlsx/error";
import { apiError, dateParam, messageRef } from "~/server/utils/api-error";
import { validateInteger, validateString, validateTime } from "~/server/utils/validation";
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from "~/shared/utils/limits";

function fakeEvent(): H3Event {
  const request = new IncomingMessage(new Socket());
  return new H3Event(request, new ServerResponse(request));
}

function thrown(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error as { statusCode: number; statusMessage: string; message: string; data: unknown };
  }
  throw new Error("expected an error");
}

describe("apiError", () => {
  it("sets the translated text, the status and data.code", () => {
    const error = apiError(fakeEvent(), 409, "errors.requests.undoNotInTeam", { name: "Anna Weber" });
    expect(error.statusCode).toBe(409);
    expect(error.statusMessage).toBe("Anna Weber ist nicht mehr im Team");
    expect(error.message).toBe(error.statusMessage);
    expect(error.data).toEqual({ code: "errors.requests.undoNotInTeam", params: { name: "Anna Weber" } });
  });

  it("translates nested message parameters but keeps their keys in data.params", () => {
    const label = messageRef("excel.labels.shiftIdInRow", { row: 7 });
    const error = apiError(null, 400, "excel.integer", { label });
    expect(error.statusMessage).toBe("Schicht-ID in Zeile 7 muss eine ganze Zahl sein");
    expect(error.data).toEqual({
      code: "excel.integer",
      params: { label: { key: "excel.labels.shiftIdInRow", params: { row: 7 } } },
    });
  });

  it("formats date params in the message and keeps the ISO date in data", () => {
    const error = apiError(null, 409, "errors.requests.absent", { name: "Anna Weber", day: dateParam("2026-10-08") });
    expect(error.statusMessage).toBe("Anna Weber hat am Do. 08.10. einen Ausfall eingetragen");
    expect(error.data).toEqual({ code: "errors.requests.absent", params: { name: "Anna Weber", day: { date: "2026-10-08" } } });
  });

  it("leaves params out of data when there are none", () => {
    expect(apiError(null, 404, "errors.common.notFound").data).toEqual({ code: "errors.common.notFound" });
  });
});

describe("translate", () => {
  it("fills placeholders, leaves missing ones empty and returns unknown keys as is", () => {
    expect(t("de", "errors.shiftplan.noSuchWeek", { year: 2026, week: 53 })).toBe("2026 hat keine KW 53");
    expect(t("de", "errors.shiftplan.noSuchWeek", { year: 2026 })).toBe("2026 hat keine KW ");
    expect(t("de", "errors.missing" as never)).toBe("errors.missing");
  });
});

describe("validation errors", () => {
  it("name the field by its label and the field key in data", () => {
    const error = thrown(() => validateInteger("x", "minStaff"));
    expect(error.statusMessage).toBe("Min. Mitarbeiter muss eine ganze Zahl sein");
    expect(error.data).toEqual({ code: "validation.integer", params: { field: { key: "validation.fields.minStaff" } } });
    expect(thrown(() => validateString("a".repeat(9), "accessCode", { maxLength: 8 })).statusMessage).toBe("Zugangscode darf maximal 8 Zeichen haben");
    const time = thrown(() => validateTime("8 Uhr", "startTime"));
    expect(time.statusMessage).toBe("Startzeit muss im Format HH:MM sein (z.B. 08:00)");
    expect(time.data).toEqual({ code: "validation.time", params: { field: { key: "validation.fields.startTime" } } });
  });
});

describe("texts the web forms share with the server", () => {
  it("stay byte-identical for PINs and send only the limit a password rule needs", () => {
    expect(t("de", "errors.member.pinLength", { min: PIN_MIN_LENGTH, max: PIN_MAX_LENGTH })).toBe("Die PIN braucht 6 bis 12 Ziffern");
    expect(t("de", "errors.member.pinWeak")).toBe("Diese PIN ist zu leicht zu erraten");
    expect(passwordPolicyError(fakeEvent(), "kurz")?.data).toEqual({ code: "errors.auth.password.minLength", params: { min: 8 } });
    expect(passwordPolicyError(fakeEvent(), "kurzweilig1")?.data).toEqual({ code: "errors.auth.password.uppercase" });
  });

  it("keep the German message on xlsx reader errors", () => {
    const error = new XlsxError("excel.file.entryInvalid", { name: "xl/workbook.xml" });
    expect(error.message).toBe("ZIP-Eintrag 'xl/workbook.xml' ist ungültig");
    expect([error.key, error.params]).toEqual(["excel.file.entryInvalid", { name: "xl/workbook.xml" }]);
  });
});
