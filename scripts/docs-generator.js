import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { generateApiDocs } from "./docs/api.js";
import { ROOT } from "./docs/files.js";
import { generateWorkflowDocs } from "./docs/workflows.js";

export { generateApiDocs, getApiEndpoints } from "./docs/api.js";
export { loadRouteRules } from "./docs/routes.js";
export { generateWorkflowDocs } from "./docs/workflows.js";

export const CONFIG = {
  root: ROOT,
  files: {
    api: path.join(ROOT, "docs", "api.md"),
    releases: path.join(ROOT, "docs", "releases.md"),
  },
  markers: {
    api: {
      start: "<!-- AUTO-GENERATED-API-START -->",
      end: "<!-- AUTO-GENERATED-API-END -->",
    },
    workflows: {
      start: "<!-- AUTO-GENERATED-WORKFLOWS-START -->",
      end: "<!-- AUTO-GENERATED-WORKFLOWS-END -->",
    },
  },
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceSection(content, marker, generatedContent) {
  if (!content.includes(marker.start) || !content.includes(marker.end)) {
    return { content, touched: false };
  }

  const regex = new RegExp(`${escapeRegex(marker.start)}[\\s\\S]*?${escapeRegex(marker.end)}`, "g");
  return {
    content: content.replace(regex, `${marker.start}\n${generatedContent}\n${marker.end}`),
    touched: true,
  };
}

const SECTIONS = [
  { file: "api", marker: "api", generate: generateApiDocs },
  { file: "releases", marker: "workflows", generate: generateWorkflowDocs },
];

export function generateDocContent(fileKey, content) {
  let nextContent = content;
  let touched = false;

  for (const section of SECTIONS.filter((entry) => entry.file === fileKey)) {
    const result = replaceSection(nextContent, CONFIG.markers[section.marker], section.generate());
    nextContent = result.content;
    touched = touched || result.touched;
  }

  return {
    content: nextContent,
    touched,
    changed: nextContent !== content,
  };
}

export function updateDocs() {
  let changed = false;

  for (const [key, filePath] of Object.entries(CONFIG.files)) {
    const name = path.relative(ROOT, filePath);
    if (!fs.existsSync(filePath)) {
      console.error(`${name} not found.`);
      process.exitCode = 1;
      continue;
    }

    const original = fs.readFileSync(filePath, "utf-8");
    const result = generateDocContent(key, original);

    if (!result.touched) {
      console.error(`No generated markers found in ${name}.`);
      process.exitCode = 1;
    } else if (result.changed) {
      fs.writeFileSync(filePath, result.content, "utf-8");
      console.log(`${name} updated.`);
      changed = true;
    } else {
      console.log(`${name} already up to date.`);
    }
  }

  return changed;
}

function main() {
  console.log("Generating docs...");
  updateDocs();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
