import { RotationService } from "~/server/services/rotation.service";
import { StaffService } from "~/server/services/staff.service";
import { getSessionUser } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  const pattern = RotationService.getFullPattern();
  if (getSessionUser(event)) return pattern;

  // Without the short codes of the PIN sign-in, like GET /api/staff.
  return {
    ...pattern,
    weeks: pattern.weeks.map((week) => ({
      ...week,
      assignments: week.assignments.map((assignment) => ({ ...assignment, staff: assignment.staff.map((staff) => StaffService.publicFields(staff)) })),
    })),
  };
});
