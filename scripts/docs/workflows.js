import { getHiddenPrefixes, getVisiblePrefixes } from "../release-rules.js";
import { fileExists, readText } from "./files.js";

function parseInlineBranches(workflowText) {
  const match = workflowText.match(/branches:\s*\[([^\]]+)\]/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((branch) => branch.replace(/["'\s]/g, ""))
    .filter(Boolean);
}

function readWorkflow(name) {
  return fileExists(".github", "workflows", name) ? readText(".github", "workflows", name) : "";
}

export function generateWorkflowDocs() {
  const ci = readWorkflow("ci.yml");
  const release = readWorkflow("auto-version.yml");
  const docker = readWorkflow("docker-build.yml");
  const prefixes = {
    visible: getVisiblePrefixes(),
    hidden: getHiddenPrefixes(),
  };

  const lines = [
    "### Workflow Summary\n",
    "| Workflow | Runs On | Main Result |",
    "|----------|---------|-------------|",
    `| CI | Push and PR: ${parseInlineBranches(ci).join(", ") || "-"} | Tests, file length and docs check, build, typecheck, and Docker smoke test |`,
    `| Auto Version & Release | Push: ${parseInlineBranches(release).join(", ") || "-"} | Creates version tag and GitHub release for changelog-visible commits |`,
    `| Docker Build & Push | CI success + deploy prefix: ${parseInlineBranches(docker).join(", ") || "-"} | Builds and pushes GHCR image with generated changelog |`,
    "",
    "### Changelog Prefixes\n",
    "Release and deploy prefix rules are defined in `scripts/release-prefixes.json`.",
    "",
    `Visible in releases: ${prefixes.visible.map((prefix) => `\`${prefix}:\``).join(", ") || "-"}`,
    "",
    `Hidden from releases: ${prefixes.hidden.map((prefix) => `\`${prefix}:\``).join(", ") || "-"}`,
    "",
    "### Deploy Flow\n",
    "1. CI validates tests, typecheck, and production build.",
    "2. Auto Version & Release creates a tag for visible commit prefixes.",
    "3. Docker waits for the release tag, generates the in-app changelog, and pushes the image.",
    "4. Hidden prefixes such as docs, chore, ci, and test do not create releases or Docker images.",
    "5. CI fails when the generated docs are stale; run `npm run docs` and commit the result.",
  ];

  return lines.join("\n");
}
