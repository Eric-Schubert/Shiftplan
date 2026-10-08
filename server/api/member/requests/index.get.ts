import { MemberAccessService } from "~/server/services/member-access.service";
import { ShiftRequestService } from "~/server/services/shift-request.service";

export default defineEventHandler((event) => {
  const member = MemberAccessService.requireMember(event);
  return {
    requiresApproval: ShiftRequestService.requiresApproval(),
    requests: ShiftRequestService.listForMember(member.staffId),
  };
});
