import { describe, expect, it } from "vitest";
import {
  compareChangelogEntries as compareGeneratedChangelogEntries,
  compareVersions,
  transformReleases,
} from "../scripts/generate-changelog.js";
import { compareChangelogEntries as compareRuntimeChangelogEntries } from "../utils/changelog";

describe("changelog ordering", () => {
  it("sorts semantic versions numerically", () => {
    expect(compareVersions("v1.10", "v1.9")).toBeGreaterThan(0);
    expect(compareVersions("v1.5.10", "v1.5.9")).toBeGreaterThan(0);
  });

  it("orders releases from the same day by semantic version", () => {
    const entries = [
      { date: "2026-04-16", title: "v1.5.9", changes: ["Add idempotent database migrations"] },
      { date: "2026-04-16", title: "v1.5.10", changes: ["Audit planner shift assignment changes"] },
    ];

    expect([...entries].sort(compareGeneratedChangelogEntries).map((entry) => entry.title)).toEqual([
      "v1.5.10",
      "v1.5.9",
    ]);
    expect([...entries].sort(compareRuntimeChangelogEntries).map((entry) => entry.title)).toEqual([
      "v1.5.10",
      "v1.5.9",
    ]);
  });

  it("transforms git-cliff releases in version order for equal dates", () => {
    const timestamp = Date.parse("2026-04-16T10:00:00Z") / 1000;
    const releases = transformReleases({
      releases: [
        {
          version: "v1.5.9",
          timestamp,
          commits: [
            {
              group: "Bug Fixes",
              raw_message: "fix: add idempotent database migrations",
            },
          ],
        },
        {
          version: "v1.5.10",
          timestamp,
          commits: [
            {
              group: "Bug Fixes",
              raw_message: "fix: audit planner shift assignment changes",
            },
          ],
        },
      ],
    });

    expect(releases.map((release: { title: string }) => release.title)).toEqual(["v1.5.10", "v1.5.9"]);
  });

  it("includes bullet points from conventional commit bodies", () => {
    const timestamp = Date.parse("2026-04-20T10:00:00Z") / 1000;
    const releases = transformReleases({
      releases: [
        {
          version: "v1.6.0",
          timestamp,
          commits: [
            {
              group: "Features",
              raw_message: [
                "feat(rotation): add Excel template workflow for shift rotations",
                "",
                "- add downloadable Excel rotation template with first-sheet instructions",
                "- explain start week, cycle length, and pattern weeks in the workbook",
                "- import rotation config and assignments from filled .xlsx files",
              ].join("\n"),
            },
          ],
        },
      ],
    });

    expect(releases[0].changes).toEqual([
      "Add Excel template workflow for shift rotations",
      "Add downloadable Excel rotation template with first-sheet instructions",
      "Explain start week, cycle length, and pattern weeks in the workbook",
      "Import rotation config and assignments from filled .xlsx files",
    ]);
  });
});
