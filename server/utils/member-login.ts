import { getAuthConfig } from "~/server/config/auth-config";
import {
  MEMBER_COOKIE_DAYS,
  MEMBER_COOKIE_NAME,
  MemberAccessService,
  type Member,
} from "~/server/services/member-access.service";
import { TeamAccessService } from "~/server/services/team-access.service";
import { getDatabase } from "~/server/utils/database";

/**
 * Answer of a successful personal sign-in. The app keeps the token itself; the browser says
 * `client: "web"`, gets an HttpOnly cookie and never sees the token.
 */
export function memberLoginResponse(event: any, result: { token: string; member: Member }, client: unknown) {
  const isApp = client !== "web";
  if (!isApp) {
    const cookieConfig = getAuthConfig().session.cookies;
    setCookie(event, MEMBER_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: cookieConfig.secureInProduction && process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MEMBER_COOKIE_DAYS * 24 * 60 * 60,
      path: cookieConfig.path,
    });
  }

  return {
    ...(isApp ? { token: result.token } : {}),
    staff: {
      id: result.member.staffId,
      name: result.member.staffName,
      shortCode: shortCodeOf(result.member.staffId),
      hasPin: MemberAccessService.hasPin(result.member.staffId),
    },
    instanceId: TeamAccessService.getInstanceId(),
    instanceName: TeamAccessService.getInstanceName(),
  };
}

export function clearMemberCookie(event: any): void {
  deleteCookie(event, MEMBER_COOKIE_NAME, { path: getAuthConfig().session.cookies.path });
}

export function shortCodeOf(staffId: number): string | null {
  const row = getDatabase().prepare("SELECT short_code FROM staff WHERE staff_id = ?").get(staffId) as
    | { short_code: string | null }
    | undefined;
  return row?.short_code ?? null;
}
