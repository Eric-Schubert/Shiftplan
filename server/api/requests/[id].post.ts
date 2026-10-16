import { ShiftRequestService, decideRequest } from "~/server/services/shift-request.service";
import { requirePlanner } from "~/server/utils/auth";
import { requestSource } from "~/server/utils/session";
import { validateId } from "~/server/utils/validation";

/** Planner: approve or reject a request waiting for approval, or revert a finished one. */
export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);
  // Body first: the request is read after the last await, so it is never a stale copy.
  const { action } = (await readBody(event)) ?? {};
  const request = ShiftRequestService.getById(validateId(getRouterParam(event, "id"), "id"));
  if (!request) throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
  if (action !== "approve" && action !== "reject" && action !== "revert") {
    throw createError({ statusCode: 400, statusMessage: "action muss approve, reject oder revert sein" });
  }
  return {
    request: await decideRequest(
      request,
      action,
      { userId: user.userId, username: user.username, source: requestSource(event) },
      getHeader(event, "origin")
    ),
  };
});
