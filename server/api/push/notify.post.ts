import { t } from "~/i18n/server";
import { PUSH_MESSAGE_MAX_LENGTH, PushService } from "~/server/services/push.service";
import { requirePlanner } from "~/server/utils/auth";
import { validateString } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requirePlanner(event);

  const body = await readBody(event);
  const message = validateString(body?.message, "message", {
    required: true,
    maxLength: PUSH_MESSAGE_MAX_LENGTH,
  })!;

  // The planner's own words go out as written; only the title follows each recipient's language.
  return PushService.sendToAll((locale) => ({
    title: t(locale, "push.team.title"),
    body: message,
    url: "/",
  }));
});
