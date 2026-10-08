import { ShiftRequestService } from "~/server/services/shift-request.service";
import { requirePlanner } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  requirePlanner(event);
  return {
    requiresApproval: ShiftRequestService.requiresApproval(),
    requests: ShiftRequestService.listForPlanner(),
  };
});
