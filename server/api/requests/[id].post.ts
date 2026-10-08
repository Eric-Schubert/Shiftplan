import { ShiftRequestService } from "~/server/services/shift-request.service";
import { requestSource } from "~/server/utils/absence-flow";
import { requirePlanner } from "~/server/utils/auth";
import { decideRequest } from "~/server/utils/shift-request-flow";
import { validateId } from "~/server/utils/validation";

/** Planner: approve or reject a request waiting for approval, or revert a finished one. */
export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);
  const request = ShiftRequestService.getById(validateId(getRouterParam(event, "id"), "id"));
  if (!request) throw createError({ statusCode: 404, statusMessage: "Anfrage nicht gefunden" });
  const { action } = (await readBody(event)) ?? {};
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
