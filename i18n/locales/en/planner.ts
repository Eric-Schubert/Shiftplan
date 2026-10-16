import type de from "../de/planner";
import shift from "./planner-shift";
import week from "./planner-week";

// The plan page, one file per part: planner.week.* and planner.shift.*.
export default { week, shift } satisfies typeof de;
