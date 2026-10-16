import { MemberAccessService } from "~/server/services/member-access.service";
import { clearMemberCookie } from "~/server/services/member-login.service";
import { TeamAccessService } from "~/server/services/team-access.service";

export default defineEventHandler((event) => {
  const member = MemberAccessService.getMember(event);
  if (member) MemberAccessService.revokeSession(member.sessionId);
  // The app signs out here whatever token it holds, a team-code token included. The browser's
  // team-code cookie stays: signing out personally does not end team access there.
  else TeamAccessService.destroyViewerSession(TeamAccessService.getBearerToken(event));
  clearMemberCookie(event);
  return { success: true };
});
