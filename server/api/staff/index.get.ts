import { StaffService } from "~/server/services/staff.service";
import { getSessionUser } from "~/server/utils/auth";

// Planners manage staff and get every record. The team only needs who is in it, without the short
// codes: those are the user names of the PIN sign-in, which the login keeps secret for a reason.
export default defineEventHandler((event) => {
  if (getSessionUser(event)) return StaffService.getAll();
  return StaffService.getActive().map((staff) => StaffService.publicFields(staff));
});
