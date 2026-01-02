import { StaffService } from "~/server/services/staff.service";

export default defineEventHandler(() => {
  return StaffService.getAll();
});
