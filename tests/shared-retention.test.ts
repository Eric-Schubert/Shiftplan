import { describe, expect, it } from "vitest";
import {
  ABSENCE_REASON_RETENTION_DAYS,
  AUDIT_RETENTION_DAYS,
  CONTACT_RETENTION_DAYS,
  REQUEST_MESSAGE_RETENTION_DAYS,
  retentionPeriods,
} from "~/shared/utils/retention";
import { daysText, minutesText, periodText } from "~/utils/legal/durations";

describe("shared retention periods", () => {
  it("keeps the periods the privacy policy has always named", () => {
    expect([AUDIT_RETENTION_DAYS, ABSENCE_REASON_RETENTION_DAYS, CONTACT_RETENTION_DAYS]).toEqual([730, 90, 365]);
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
