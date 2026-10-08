import { MemberAccessService } from "~/server/services/member-access.service";
import { requirePlanner } from "~/server/utils/auth";

/** Who has set a PIN (never the PIN itself). */
export default defineEventHandler((event) => {
  requirePlanner(event);
  return { staffIds: MemberAccessService.staffWithPin() };
});
