import { getAdminDatabase, getDatabase } from "~/server/utils/database";

// Migrations run when the server starts, not on the first request. A failing one, such as the check for
// unchanged default credentials, then stops the start with its message instead of answering requests.
export default defineNitroPlugin(() => {
  getDatabase();
  getAdminDatabase();
});
