import { createInvite, redeem } from "~/server/services/member-access/invites";
import {
  clearPin,
  hasPin,
  loginWithPin,
  setPin,
  staffWithPin,
  verifyPin,
} from "~/server/services/member-access/pins";
import {
  createSession,
  getMember,
  listSessions,
  requireMember,
  revokeSession,
} from "~/server/services/member-access/sessions";

export { INVITE_VALID_DAYS } from "~/server/services/member-access/invites";
export { PIN_MAX_LENGTH, PIN_MIN_LENGTH, isValidPin } from "~/server/services/member-access/pins";
export type { Member, MemberSession } from "~/server/services/member-access/sessions";
export {
  MEMBER_COOKIE_DAYS,
  MEMBER_COOKIE_NAME,
  getMemberToken,
  memberSource,
} from "~/server/services/member-access/token";

export const DEVICE_NAME_MAX_LENGTH = 60;

/**
 * Personal app access: a planner creates a one-time QR code for one staff member,
 * the app redeems it for a long-lived token bound to that person.
 */
export const MemberAccessService = {
  createInvite,
  redeem,
  createSession,
  hasPin,
  staffWithPin,
  setPin,
  verifyPin,
  clearPin,
  loginWithPin,
  getMember,
  requireMember,
  listSessions,
  revokeSession,
};
