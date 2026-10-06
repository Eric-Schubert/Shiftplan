import { MemberAccessService } from "~/server/services/member-access.service";

export default defineEventHandler((event) => {
  const member = MemberAccessService.requireMember(event);
  return { staff: { id: member.staffId, name: member.staffName } };
});
