import { MemberAccessService } from "~/server/services/member-access.service";
import { clearMemberCookie } from "~/server/utils/member-login";

export default defineEventHandler((event) => {
  const member = MemberAccessService.getMember(event);
  if (member) MemberAccessService.revokeSession(member.sessionId);
  clearMemberCookie(event);
  return { success: true };
});
