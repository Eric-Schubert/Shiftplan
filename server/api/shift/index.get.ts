import { ShiftService } from "~/server/services/shift.service";

export default defineEventHandler(() => {
  return ShiftService.getAll();
});
