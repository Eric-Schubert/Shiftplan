import { describe, expect, it } from "vitest";
import {
  ABSENCE_REASON_RETENTION_DAYS,
  AUDIT_RETENTION_DAYS,
  CONTACT_RETENTION_DAYS,
  REQUEST_MESSAGE_RETENTION_DAYS,
  retentionPeriods,
} from "~/shared/utils/retention";
import { daysText, minutesText, periodText } from "~/utils/legal/de/durations";
import * as english from "~/utils/legal/en/durations";

describe("shared retention periods", () => {
  it("keeps the periods the privacy policy has always named", () => {
    expect([AUDIT_RETENTION_DAYS, ABSENCE_REASON_RETENTION_DAYS, CONTACT_RETENTION_DAYS]).toEqual([730, 90, 365]);
  });

  it("keeps request messages as long as absence reasons, which the policy names in one sentence", () => {
    expect(REQUEST_MESSAGE_RETENTION_DAYS).toBe(ABSENCE_REASON_RETENTION_DAYS);
  });

  it("takes only the statistics period from the config", () => {
    expect(retentionPeriods(30)).toEqual({ ...retentionPeriods(90), analytics: 30 });
  });
});

describe("durations in the privacy policy", () => {
  it("reads as before with the checked-in periods", () => {
    const periods = retentionPeriods(90);

    expect(periodText(periods.contactMessages)).toBe("ein Jahr");
    expect(periodText(periods.auditLog, "dative")).toBe("2 Jahren");
    expect(periodText(periods.absenceReasons)).toBe("90 Tage");
    expect(periodText(periods.analytics, "dative")).toBe("90 Tagen");
    expect(daysText(periods.memberCookie)).toBe("365 Tage");
    expect(daysText(periods.memberInvite, "dative")).toBe("7 Tagen");
    expect(daysText(periods.plannerApp, "dative")).toBe("14 Tagen");
    expect(minutesText(30)).toBe("30 Minuten");
  });

  it("turns days into years only when they add up", () => {
    expect(periodText(730)).toBe("2 Jahre");
    expect(periodText(365, "dative")).toBe("einem Jahr");
    expect(periodText(366)).toBe("366 Tage");
    expect(periodText(1)).toBe("einen Tag");
    expect(daysText(1, "dative")).toBe("einem Tag");
  });

  it("turns minutes into hours only when they add up", () => {
    expect(minutesText(60)).toBe("eine Stunde");
    expect(minutesText(60, "dative")).toBe("einer Stunde");
    expect(minutesText(480)).toBe("8 Stunden");
    expect(minutesText(90)).toBe("90 Minuten");
    expect(minutesText(1)).toBe("eine Minute");
  });
});

describe("durations in the English privacy policy", () => {
  it("split the periods like the German text", () => {
    const periods = retentionPeriods(90);

    expect(english.periodText(periods.contactMessages)).toBe("one year");
    expect(english.periodText(periods.auditLog)).toBe("2 years");
    expect(english.periodText(periods.absenceReasons)).toBe("90 days");
    expect(english.daysText(periods.memberCookie)).toBe("365 days");
    expect(english.daysText(periods.memberInvite)).toBe("7 days");
    expect(english.minutesText(30)).toBe("30 minutes");
  });

  it("use one for single units", () => {
    expect([english.periodText(1), english.daysText(1), english.minutesText(1), english.minutesText(60)]).toEqual([
      "one day",
      "one day",
      "one minute",
      "one hour",
    ]);
    expect([english.periodText(366), english.minutesText(480)]).toEqual(["366 days", "8 hours"]);
  });
});
