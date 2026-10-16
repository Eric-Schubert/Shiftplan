// How long Shiftplan keeps personal data and how long accesses last. The purge jobs and sessions
// use these numbers and the privacy policy quotes them, so the two cannot drift apart.
// Only the visit statistics are configurable (analytics.retentionDays in backend.config.json).

/** The change log explains past plans. After two years nobody needs it, the names in it go too. */
export const AUDIT_RETENTION_DAYS = 730;
/** Reasons and notes of absences are kept only as long as planning needs them, removed absences too. */
export const ABSENCE_REASON_RETENTION_DAYS = 90;
/**
 * A request message may say why someone is away, so it goes as early as an absence reason.
 * The privacy policy names both in one sentence; keep them equal or split that sentence.
 */
export const REQUEST_MESSAGE_RETENTION_DAYS = ABSENCE_REASON_RETENTION_DAYS;
/** The copy of a contact request in the admin area. Answers go out by e-mail. */
export const CONTACT_RETENTION_DAYS = 365;
/** A personal access nobody used for a year goes. The browser cookie ends after a year anyway. */
export const MEMBER_IDLE_DAYS = 365;
/** Lifetime of the member_token cookie after a personal sign-in in the browser. */
export const MEMBER_COOKIE_DAYS = 365;
/** A QR code invite nobody redeemed expires after this many days. */
export const INVITE_VALID_DAYS = 7;
/** A planner signed in on the phone stays signed in this long without use. */
export const PLANNER_APP_SESSION_DAYS = 14;

/** Every period the privacy policy names, in days. */
export type RetentionDays = {
  auditLog: number;
  absenceReasons: number;
  requestMessages: number;
  contactMessages: number;
  analytics: number;
  memberIdle: number;
  memberCookie: number;
  memberInvite: number;
  plannerApp: number;
};

/** The fixed periods together with the configured statistics period. */
export function retentionPeriods(analyticsDays: number): RetentionDays {
  return {
    auditLog: AUDIT_RETENTION_DAYS,
    absenceReasons: ABSENCE_REASON_RETENTION_DAYS,
    requestMessages: REQUEST_MESSAGE_RETENTION_DAYS,
    contactMessages: CONTACT_RETENTION_DAYS,
    analytics: analyticsDays,
    memberIdle: MEMBER_IDLE_DAYS,
    memberCookie: MEMBER_COOKIE_DAYS,
    memberInvite: INVITE_VALID_DAYS,
    plannerApp: PLANNER_APP_SESSION_DAYS,
  };
}
