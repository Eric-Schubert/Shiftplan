import { ShiftService } from "~/server/services/shift.service";
import { StaffService } from "~/server/services/staff.service";

/** Max and Erika full time, Hans part time, an early and a late shift, created through the real services. */
export function seedTeam() {
  const shift = (name: string, start_time: string, end_time: string, sort_order: number) =>
    ShiftService.create({ name, start_time, end_time, min_staff: 2, sort_order }).shift_id;

  return {
    max: StaffService.create({ name: "Max Mustermann" }).staff_id,
    erika: StaffService.create({ name: "Erika Musterfrau" }).staff_id,
    hans: StaffService.create({ name: "Hans Schmidt", is_parttime: 1 }).staff_id,
    early: shift("Frühschicht", "06:00", "14:00", 1),
    late: shift("Spätschicht", "14:00", "22:00", 2),
  };
}

export type Team = ReturnType<typeof seedTeam>;
