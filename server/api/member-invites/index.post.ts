import { MemberAccessService } from "~/server/services/member-access.service";
import { requirePlanner } from "~/server/utils/auth";
import { validateId } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);
  const body = await readBody(event);
  const { code, expiresAt } = MemberAccessService.createInvite(validateId(body?.staffId, "staffId"), user.username);

  // The app reads the code from the `einladung` parameter of this link.
  return { code, expiresAt, path: `/?einladung=${code}` };
});
