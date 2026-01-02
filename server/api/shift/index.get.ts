import { ShiftService } from "~/server/services/shift.service";
export default defineEventHandler(() => ShiftService.getAll());
