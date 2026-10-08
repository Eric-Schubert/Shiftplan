import { MemberAccessService } from "~/server/services/member-access.service";
import { ShiftRequestService } from "~/server/services/shift-request.service";
import { acceptRequest, cancelRequest, declineRequest } from "~/server/utils/shift-request-flow";
import { validateId } from "~/server/utils/validation";

/** accept (take over / agree to swap), decline (swap partner) or cancel (own request). */
export default defineEventHandler(async (event) => {
  const member = MemberAccessService.requireMember(event);
  const request = ShiftRequestService.getById(validateId(getRouterParam(event, "id"), "id"));
  if (!request) throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
  const { action } = (await readBody(event)) ?? {};

  switch (action) {
    case "accept":
      return { request: await acceptRequest(request, member, getHeader(event, "origin")) };
    case "decline":
      return { request: await declineRequest(request, member.staffId, member.staffName) };
    case "cancel":
      return { request: cancelRequest(request, member.staffId) };
    default:
      throw createError({ statusCode: 400, statusMessage: "action muss accept, decline oder cancel sein" });
  }
});
