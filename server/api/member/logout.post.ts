import { MemberAccessService } from "~/server/services/member-access.service";

export default defineEventHandler((event) => {
  const member = MemberAccessService.requireMember(event);
  MemberAccessService.revokeSession(member.sessionId);
  return { success: true };
});
