import { MemberAccessService, memberSource } from "~/server/services/member-access.service";
import {
  ShiftRequestService,
  acceptRequest,
  cancelRequest,
  confirmUndo,
  declineRequest,
  declineUndo,
  requestUndo,
} from "~/server/services/shift-request.service";
import { validateId } from "~/server/utils/validation";

/**
 * accept (take over / agree to swap), decline (swap partner), cancel (own request or a yes waiting for approval)
 * and the undo of a finished request: request_undo, then confirm_undo or decline_undo by the other person.
 */
export default defineEventHandler(async (event) => {
  const member = MemberAccessService.requireMember(event);
  // Body first: the request is read after the last await, so it is never a stale copy.
  const { action } = (await readBody(event)) ?? {};
  const request = ShiftRequestService.getById(validateId(getRouterParam(event, "id"), "id"));
  if (!request) throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
  const actor = { ...member, source: memberSource(event) };
  const origin = getHeader(event, "origin");

  switch (action) {
    case "accept":
      return { request: await acceptRequest(request, actor, origin) };
    case "decline":
      return { request: await declineRequest(request, member.staffId, member.staffName) };
    case "cancel":
      return { request: await cancelRequest(request, member) };
    case "request_undo":
      return { request: await requestUndo(request, actor) };
    case "confirm_undo":
      return { request: await confirmUndo(request, actor, origin) };
    case "decline_undo":
      return { request: await declineUndo(request, actor) };
    default:
      throw createError({
        statusCode: 400,
        statusMessage: "action muss accept, decline, cancel, request_undo, confirm_undo oder decline_undo sein",
      });
  }
});
