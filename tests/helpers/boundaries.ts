import { findViolations } from "../../scripts/check-boundaries.js";

type Violation = { file: string; line: number; rule: string; detail: string };

/** Runs the boundary check on in-memory files and returns "file:line rule" per violation. */
export const checkBoundaries = (contents: Record<string, string>) =>
  findViolations(Object.keys(contents), (file: string) => contents[file] ?? "").map(
    ({ file, line, rule }: Violation) => `${file}:${line} ${rule}`
  );
