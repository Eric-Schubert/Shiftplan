import { H3Event } from "h3";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { describe, expect, it } from "vitest";
import { passwordPolicyError, validateConfiguredPasswordStrength } from "~/server/config/auth-config";
import { t } from "~/server/lib/i18n/translate";
import { XlsxError } from "~/server/lib/xlsx/error";
import { apiError, messageRef } from "~/server/utils/api-error";
import { validateInteger, validateString, validateTime } from "~/server/utils/validation";
import { PIN_LENGTH_MESSAGE, PIN_MAX_LENGTH, PIN_MIN_LENGTH, WEAK_PIN_MESSAGE } from "~/shared/utils/limits";

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

  it("leaves params out of data when there are none", () => {
    expect(apiError(null, 404, "errors.common.notFound").data).toEqual({ code: "errors.common.notFound" });
  });
});

describe("translate", () => {
  it("fills placeholders, keeps unknown ones and returns unknown keys as is", () => {
    expect(t("de", "errors.shiftplan.noSuchWeek", { year: 2026, week: 53 })).toBe("2026 hat keine KW 53");
    expect(t("de", "errors.shiftplan.noSuchWeek", { year: 2026 })).toBe("2026 hat keine KW {week}");
    expect(t("de", "errors.missing" as never)).toBe("errors.missing");
  });
});

describe("validation errors", () => {
  it("name the field by its label and the field key in data", () => {
    const error = thrown(() => validateInteger("x", "minStaff"));
    expect(error.statusMessage).toBe("Min. Mitarbeiter muss eine ganze Zahl sein");
    expect(error.data).toEqual({ code: "validation.integer", params: { field: { key: "validation.fields.minStaff" } } });
    expect(thrown(() => validateString("a".repeat(9), "accessCode", { maxLength: 8 })).statusMessage).toBe(
      "Zugangscode darf maximal 8 Zeichen haben"
    );
    expect(thrown(() => validateTime("8 Uhr", "startTime")).statusMessage).toBe(
      "Startzeit muss im Format HH:MM sein (z.B. 08:00)"
    );
  });
});

describe("texts the web forms share with the server", () => {
  it("stay byte-identical for PINs and passwords", () => {
    expect(t("de", "errors.member.pinLength", { min: PIN_MIN_LENGTH, max: PIN_MAX_LENGTH })).toBe(PIN_LENGTH_MESSAGE);
    expect(t("de", "errors.member.pinWeak")).toBe(WEAK_PIN_MESSAGE);
    for (const password of ["kurz", "x".repeat(300), "alles klein 123", "ALLES GROSS 123", "OhneZahlen"]) {
      const expected = validateConfiguredPasswordStrength(password).message;
      expect(passwordPolicyError(fakeEvent(), password)?.statusMessage ?? "").toBe(expected);
    }
  });

  it("keep the German message on xlsx reader errors", () => {
    const error = new XlsxError("excel.file.entryInvalid", { name: "xl/workbook.xml" });
    expect(error.message).toBe("ZIP-Eintrag 'xl/workbook.xml' ist ungültig");
    expect([error.key, error.params]).toEqual(["excel.file.entryInvalid", { name: "xl/workbook.xml" }]);
  });
});
