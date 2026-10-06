import { getAuthConfig } from "~/server/config/auth-config";
import { TeamAccessService, VIEWER_COOKIE_NAME } from "~/server/services/team-access.service";

export default defineEventHandler((event) => {
  TeamAccessService.destroyViewerSession(TeamAccessService.getViewerToken(event));
  deleteCookie(event, VIEWER_COOKIE_NAME, { path: getAuthConfig().session.cookies.path });
  return { success: true };
});
