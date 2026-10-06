import { PUSH_MESSAGE_MAX_LENGTH, PushService } from "~/server/services/push.service";
import { requirePlanner } from "~/server/utils/auth";
import { validateString } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requirePlanner(event);

  const body = await readBody(event);
  const message = validateString(body?.message, "Nachricht", {
    required: true,
    maxLength: PUSH_MESSAGE_MAX_LENGTH,
  })!;

  return PushService.sendToAll({
    title: "Nachricht vom Schichtplaner",
    body: message,
    url: "/",
  });
});
