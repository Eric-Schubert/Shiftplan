import { MemberAccessService } from "~/server/services/member-access.service";
import { destroyViewerSession, getBearerToken } from "~/server/services/team-access/viewer-session";
import { clearMemberCookie } from "~/server/utils/member-login";

export default defineEventHandler((event) => {
  const member = MemberAccessService.getMember(event);
  if (member) MemberAccessService.revokeSession(member.sessionId);
  // The app signs out here whatever token it holds, a team-code token included. The browser's
  // team-code cookie stays: signing out personally does not end team access there.
  else destroyViewerSession(getBearerToken(event));
  clearMemberCookie(event);
  return { success: true };
});
