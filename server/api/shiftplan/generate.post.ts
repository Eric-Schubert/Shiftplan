import { AuditService } from "~/server/services/audit.service";
import { ShiftplanService } from "~/server/services/shiftplan.service";
import { requestSource } from "~/server/utils/absence-flow";
import { requirePlanner } from "~/server/utils/auth";
import { readGenerationRange } from "~/server/utils/generation-range";
import { validateBoolean, validateYear, validateWeek } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);

  const body = await readBody(event);

  const hasWeeksParameter =
    body.weeks !== undefined && body.weeks !== null && body.weeks !== "";

  if (!hasWeeksParameter) {
    const year = validateYear(body.year, "Jahr", { required: true })!;
    const week = validateWeek(body.week, "Woche", { required: true })!;
    return ShiftplanService.generateFromPattern(year, week);
  }

  const { year, week, weeks } = readGenerationRange(body);
  // Older clients sent no flag and always overwrote.
  const overwrite = validateBoolean(body.overwrite, "Überschreiben") !== 0;
  const result = ShiftplanService.generateMultipleWeeks(year, week, weeks, { overwrite });

  const last = result.weeks.at(-1);
  if (result.generated > 0 && last) {
    const weeksLabel = result.generated === 1 ? "1 Woche" : `${result.generated} Wochen`;
    const parts = [`${weeksLabel} bis KW ${last.week}/${last.year} aus dem Rotationsmuster erzeugt`];
    if (result.overwritten > 0) parts.push(`${result.overwritten} davon überschrieben`);
    if (result.skipped > 0) parts.push(`${result.skipped} bereits geplante übersprungen`);

    AuditService.log({
      userId: user.userId,
      username: user.username,
      action: "generate",
      year,
      weekNumber: week,
      reason: parts.join(", "),
      source: requestSource(event),
    });
  }

  return result;
});
