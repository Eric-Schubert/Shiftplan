import { ContactService } from "~/server/services/contact.service";
import { requireAdmin } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  requireAdmin(event);

  const query = getQuery(event);
  const limit = Number(query.limit) || 20;
  const offset = Number(query.offset) || 0;

  return ContactService.getMessages({ limit, offset });
});
