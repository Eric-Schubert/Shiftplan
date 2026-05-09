import { ContactService } from "~/server/services/contact.service";
import { requireAdmin } from "~/server/utils/auth";
import { validateId } from "~/server/utils/validation";

export default defineEventHandler((event) => {
  requireAdmin(event);

  const id = validateId(getRouterParam(event, "id"), "Kontaktanfrage");
  return ContactService.markRead(id);
});
