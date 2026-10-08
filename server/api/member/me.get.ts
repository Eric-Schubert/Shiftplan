import { MemberAccessService } from "~/server/services/member-access.service";
import { shortCodeOf } from "~/server/utils/member-login";

export default defineEventHandler((event) => {
  const member = MemberAccessService.requireMember(event);
  return {
    staff: {
      id: member.staffId,
      name: member.staffName,
      shortCode: shortCodeOf(member.staffId),
      hasPin: MemberAccessService.hasPin(member.staffId),
    },
  };
});
