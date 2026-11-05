import { t } from "~/i18n/server";
import { PUSH_MESSAGE_MAX_LENGTH, PushService } from "~/server/services/push.service";
import { requirePlanner } from "~/server/utils/auth";
import { validateString } from "~/server/utils/validation";
import { readObjectBody } from "~/server/utils/json-body";
import { isDemoAccount } from "~/server/utils/demo";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);
  // The demo login is public: its words must not reach the phones of other visitors.
  if (isDemoAccount(user.username)) {
    throw apiError(event, 403, "errors.auth.demoPush");
  }

  const body = await readObjectBody(event);
  const message = validateString(body?.message, "message", {
    required: true,
    maxLength: PUSH_MESSAGE_MAX_LENGTH,
  });

  // The planner's own words go out as written; only the title follows each recipient's language.
  return PushService.sendToAll((locale) => ({
    title: t(locale, "push.team.title"),
    body: message,
    url: "/",
  }));
});
