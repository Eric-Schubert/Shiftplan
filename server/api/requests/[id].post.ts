import { ShiftRequestService, decideRequest } from "~/server/services/shift-request.service";
import { requirePlanner } from "~/server/utils/auth";
import { requestSource } from "~/server/utils/session";
import { validateId } from "~/server/utils/validation";
import { apiError } from "~/server/utils/api-error";
import { readObjectBody } from "~/server/utils/json-body";

/** Planner: approve or reject a request waiting for approval, or revert a finished one. */
export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);
  // Body first: the request is read after the last await, so it is never a stale copy.
  const { action } = await readObjectBody(event);
  const request = ShiftRequestService.getById(validateId(getRouterParam(event, "id"), "id"));
  if (!request) throw apiError(event, 404, "errors.requests.notFound");
  if (action !== "approve" && action !== "reject" && action !== "revert") {
    throw apiError(event, 400, "errors.requests.plannerActionInvalid");
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
