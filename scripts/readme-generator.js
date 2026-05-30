




import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { getHiddenPrefixes, getVisiblePrefixes } from "./release-rules.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

export const CONFIG = {
  root: ROOT,
  readme: path.join(ROOT, "README.md"),
  includeDirs: [
    "components",
    "layouts",
    "mobile",
    "pages",
    "server",
    "stores",
    "types",
    "scripts",
  ],
  ignoreDirs: [
    "node_modules",
    ".git",
    ".nuxt",
    ".output",
    "dist",
    ".github",
    "db",
    "tests",
    "coverage",
  ],
  ignoreFiles: [".DS_Store", "Thumbs.db"],
  markers: {
    structure: {
      start: "<!-- AUTO-GENERATED-STRUCTURE-START -->",
      end: "<!-- AUTO-GENERATED-STRUCTURE-END -->",
    },
    api: {
      start: "<!-- AUTO-GENERATED-API-START -->",
      end: "<!-- AUTO-GENERATED-API-END -->",
    },
    rbac: {
      start: "<!-- AUTO-GENERATED-RBAC-START -->",
      end: "<!-- AUTO-GENERATED-RBAC-END -->",
    },
    components: {
      start: "<!-- AUTO-GENERATED-COMPONENTS-START -->",
      end: "<!-- AUTO-GENERATED-COMPONENTS-END -->",
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

function fileExists(...parts) {
  return fs.existsSync(path.join(ROOT, ...parts));
}

function readText(...parts) {
  return fs.readFileSync(path.join(ROOT, ...parts), "utf-8");
}

function listFilesRecursive(dirPath) {
  const fullPath = path.join(ROOT, dirPath);
  if (!fs.existsSync(fullPath)) return [];

  const files = [];
  const items = fs.readdirSync(fullPath, { withFileTypes: true }).sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const item of items) {
    const relativePath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      files.push(...listFilesRecursive(relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

function scanDirectory(dirPath, prefix = "") {
  const lines = [];
  const fullPath = path.join(ROOT, dirPath);
  if (!fs.existsSync(fullPath)) return lines;

  const items = fs.readdirSync(fullPath, { withFileTypes: true })
    .filter((item) => !CONFIG.ignoreDirs.includes(item.name))
    .filter((item) => !CONFIG.ignoreFiles.includes(item.name))
    .filter((item) => !item.name.startsWith("."))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const connector = isLast ? "`-- " : "|-- ";
    const childPrefix = prefix + (isLast ? "    " : "|   ");

    if (item.isDirectory()) {
      lines.push(`${prefix}${connector}${item.name}/`);
      lines.push(...scanDirectory(path.join(dirPath, item.name), childPrefix));
    } else {
      lines.push(`${prefix}${connector}${item.name}`);
    }
  });

  return lines;
}

export function generateStructure() {
  const lines = ["```text", "schichtplaner/"];
  const allItems = [];

  for (const dir of CONFIG.includeDirs) {
    if (fileExists(dir)) allItems.push({ name: dir, isDir: true });
  }

  const rootFiles = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((file) => file.isFile() && !file.name.startsWith("."))
    .filter((file) => [".ts", ".js", ".json", ".md"].some((ext) => file.name.endsWith(ext)))
    .filter((file) => !["package-lock.json"].includes(file.name))
    .map((file) => ({ name: file.name, isDir: false }));

  allItems.push(...rootFiles);
  allItems.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });

  allItems.forEach((item, index) => {
    const isLast = index === allItems.length - 1;
    const connector = isLast ? "`-- " : "|-- ";
    const childPrefix = isLast ? "    " : "|   ";

    if (item.isDir) {
      lines.push(`${connector}${item.name}/`);
      lines.push(...scanDirectory(item.name, childPrefix));
    } else {
      lines.push(`${connector}${item.name}`);
    }
  });

  lines.push("```");
  return lines.join("\n");
}

function routeFromApiFile(filePath) {
  const relative = path.relative(path.join(ROOT, "server", "api"), path.join(ROOT, filePath));
  const parts = relative.split(path.sep);
  const file = parts.pop();
  const methodMatch = file.match(/\.(get|post|patch|put|delete)\.ts$/);
  const method = methodMatch ? methodMatch[1].toUpperCase() : "GET";
  const baseName = file
    .replace(/\.(get|post|patch|put|delete)\.ts$/, "")
    .replace(/\.ts$/, "");

  if (baseName !== "index") parts.push(baseName);

  const route = parts
    .map((part) => part.replace(/^\[(.+)\]$/, ":$1"))
    .join("/");

  return {
    method,
    route: `/api/${route}`.replace(/\/+/g, "/"),
  };
}

function isPublicGetEndpoint(method, route) {
  if (method !== "GET") return false;
  if (route === "/api/openapi") return true;
  return ["/api/staff", "/api/shift", "/api/shiftplan", "/api/rotation", "/api/holidays"].some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}

function getAccess(endpoint, content) {
  if (endpoint.route === "/api/auth/login") return "Public";
  if (content.includes("requireAdmin(")) return "Admin";
  if (content.includes("requirePlanner(")) return "Planner/Admin";
  if (isPublicGetEndpoint(endpoint.method, endpoint.route)) return "Public";
  return "Authenticated";
}

function getCsrfRequirement(endpoint, access) {
  const mutating = ["POST", "PATCH", "PUT", "DELETE"].includes(endpoint.method);
  return mutating && access !== "Public" ? "Yes" : "No";
}

function getBodyFields(content) {
  const fields = new Set();
  for (const match of content.matchAll(/\bbody\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    fields.add(match[1]);
  }
  return [...fields].sort();
}

function getQueryFields(content) {
  const fields = new Set();
  for (const match of content.matchAll(/\bquery\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    fields.add(match[1]);
  }
  return [...fields].sort();
}

function getDescription(endpoint) {
  const route = endpoint.route;
  const method = endpoint.method;
  const exact = {
    "POST /api/auth/login": "Create a cookie session or bearer token",
    "POST /api/auth/logout": "Clear the current session",
    "GET /api/auth/session": "Read the current session state",
    "POST /api/auth/change-password": "Change the current user's password",
    "GET /api/auth/users": "List application users",
    "POST /api/auth/users": "Create an application user",
    "DELETE /api/auth/users/:id": "Delete an application user",
    "GET /api/openapi": "Read the mobile OpenAPI contract",
    "GET /api/audit": "List audit log entries",
    "POST /api/shiftplan/assign": "Assign staff to a weekly shift",
    "POST /api/shiftplan/unassign": "Remove staff from a weekly shift",
    "POST /api/shiftplan/generate": "Generate plans from the rotation pattern",
    "POST /api/shiftplan/copy-year": "Copy shift plans between years",
    "GET /api/shiftplan/year-summary": "Read yearly planning coverage",
    "GET /api/holidays/public": "Read public holidays",
    "GET /api/holidays/school": "Read school holidays",
  };

  const key = `${method} ${route}`;
  if (exact[key]) return exact[key];

  const resource = route.split("/")[2] || "resource";
  if (method === "GET" && route.includes(":id")) return `Read one ${resource} record`;
  if (method === "GET") return `List ${resource} records`;
  if (method === "POST") return `Create or update ${resource} data`;
  if (method === "PATCH") return `Update one ${resource} record`;
  if (method === "DELETE") return `Delete one ${resource} record`;
  return "API endpoint";
}

export function getApiEndpoints() {
  return listFilesRecursive(path.join("server", "api"))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => {
      const endpoint = routeFromApiFile(file);
      const content = readText(file);
      const access = getAccess(endpoint, content);

      return {
        ...endpoint,
        file,
        group: endpoint.route.split("/")[2] || "root",
        access,
        csrf: getCsrfRequirement(endpoint, access),
        query: getQueryFields(content),
        body: getBodyFields(content),
        description: getDescription(endpoint),
      };
    })
    .sort((a, b) => {
      const groupOrder = ["staff", "shift", "shiftplan", "rotation", "auth", "openapi", "audit", "holidays"];
      const methodOrder = ["GET", "POST", "PATCH", "PUT", "DELETE"];
      const aGroup = groupOrder.indexOf(a.group);
      const bGroup = groupOrder.indexOf(b.group);
      if (aGroup !== bGroup) return (aGroup === -1 ? 99 : aGroup) - (bGroup === -1 ? 99 : bGroup);
      if (a.route !== b.route) return a.route.localeCompare(b.route);
      return methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method);
    });
}

function formatFieldList(fields) {
  return fields.length ? fields.map((field) => `\`${field}\``).join(", ") : "-";
}

export function generateApiDocs() {
  const endpoints = getApiEndpoints();
  if (endpoints.length === 0) return "*No API endpoints found.*";

  const grouped = new Map();
  for (const endpoint of endpoints) {
    if (!grouped.has(endpoint.group)) grouped.set(endpoint.group, []);
    grouped.get(endpoint.group).push(endpoint);
  }

  const lines = [];
  for (const [group, groupEndpoints] of grouped) {
    const title = group === "openapi" ? "OpenAPI" : group.charAt(0).toUpperCase() + group.slice(1);
    const heading = group === "openapi" ? "OpenAPI Contract" : `${title} API`;
    lines.push(`### ${heading}\n`);
    lines.push("| Method | Endpoint | Access | CSRF | Query | Body | Description |");
    lines.push("|--------|----------|--------|------|-------|------|-------------|");

    for (const endpoint of groupEndpoints) {
      lines.push(
        `| \`${endpoint.method}\` | \`${endpoint.route}\` | ${endpoint.access} | ${endpoint.csrf} | ${formatFieldList(endpoint.query)} | ${formatFieldList(endpoint.body)} | ${endpoint.description} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function roleCanAccess(access, role) {
  if (access === "Public") return "Yes";
  if (access === "Authenticated") return role === "Public" ? "No" : "Yes";
  if (access === "Planner/Admin") return role === "Planner" || role === "Admin" ? "Yes" : "No";
  if (access === "Admin") return role === "Admin" ? "Yes" : "No";
  return "No";
}

export function generateRbacMatrix() {
  const endpoints = getApiEndpoints();
  const lines = [
    "| Method | Endpoint | Public | Planner | Admin | CSRF |",
    "|--------|----------|--------|---------|-------|------|",
  ];

  for (const endpoint of endpoints) {
    lines.push(
      `| \`${endpoint.method}\` | \`${endpoint.route}\` | ${roleCanAccess(endpoint.access, "Public")} | ${roleCanAccess(endpoint.access, "Planner")} | ${roleCanAccess(endpoint.access, "Admin")} | ${endpoint.csrf} |`,
    );
  }

  return lines.join("\n");
}

export function generateComponentsList() {
  const compDir = path.join(ROOT, "components");
  if (!fs.existsSync(compDir)) return "*No components found.*";

  const components = fs.readdirSync(compDir)
    .filter((file) => file.endsWith(".vue"))
    .sort()
    .map((file) => {
      const content = fs.readFileSync(path.join(compDir, file), "utf-8");
      const commentMatch = content.match(/\/\*\*\s*\n?\s*\*?\s*([^*\n]+)/);
      let description = commentMatch ? commentMatch[1].trim() : "";
      if (description.startsWith("*")) description = "";
      return { name: file.replace(".vue", ""), file, description };
    });

  if (components.length === 0) return "*No components found.*";

  const lines = ["| Component | File | Description |", "|-----------|------|-------------|"];
  for (const component of components) {
    lines.push(`| \`${component.name}\` | ${component.file} | ${component.description || "-"} |`);
  }

  return lines.join("\n");
}

function parseInlineBranches(workflowText) {
  const match = workflowText.match(/branches:\s*\[([^\]]+)\]/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((branch) => branch.replace(/["'\s]/g, ""))
    .filter(Boolean);
}

function parseChangelogPrefixes() {
  return {
    visible: getVisiblePrefixes(),
    hidden: getHiddenPrefixes(),
  };
}

export function generateWorkflowDocs() {
  const ci = fileExists(".github", "workflows", "ci.yml") ? readText(".github", "workflows", "ci.yml") : "";
  const release = fileExists(".github", "workflows", "auto-version.yml")
    ? readText(".github", "workflows", "auto-version.yml")
    : "";
  const docker = fileExists(".github", "workflows", "docker-build.yml")
    ? readText(".github", "workflows", "docker-build.yml")
    : "";
  const readme = fileExists(".github", "workflows", "update-readme.yml")
    ? readText(".github", "workflows", "update-readme.yml")
    : "";
  const prefixes = parseChangelogPrefixes();

  const lines = [
    "### Workflow Summary\n",
    "| Workflow | Runs On | Main Result |",
    "|----------|---------|-------------|",
    `| CI | Push: ${parseInlineBranches(ci).join(", ") || "-"}; PR: master/main | Tests, build, typecheck, and Docker smoke test |`,
    `| Auto Version & Release | Push: ${parseInlineBranches(release).join(", ") || "-"} | Creates version tag and GitHub release for changelog-visible commits |`,
    `| Docker Build & Push | CI success + deploy prefix: ${parseInlineBranches(docker).join(", ") || "-"} | Builds and pushes GHCR image with generated changelog |`,
    `| Update README | Successful CI push: ${parseInlineBranches(readme).join(", ") || "-"} | Regenerates README sections and commits with [skip ci] |`,
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
    "5. README automation updates generated documentation after trusted pushes without retriggering CI.",
  ];

  return lines.join("\n");
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

export function generateReadmeContent(content) {
  let nextContent = content;
  let touched = false;

  for (const [name, generated] of [
    ["structure", generateStructure()],
    ["components", generateComponentsList()],
    ["api", generateApiDocs()],
    ["rbac", generateRbacMatrix()],
    ["workflows", generateWorkflowDocs()],
  ]) {
    const result = replaceSection(nextContent, CONFIG.markers[name], generated);
    nextContent = result.content;
    touched = touched || result.touched;
  }

  return {
    content: nextContent,
    touched,
    changed: nextContent !== content,
  };
}

export function updateReadme() {
  if (!fs.existsSync(CONFIG.readme)) {
    console.error("README.md not found.");
    process.exitCode = 1;
    return false;
  }

  const original = fs.readFileSync(CONFIG.readme, "utf-8");
  const result = generateReadmeContent(original);

  if (!result.touched) {
    console.log("No generated README markers found.");
    return false;
  }

  if (!result.changed) {
    console.log("README.md already up to date.");
    return false;
  }

  fs.writeFileSync(CONFIG.readme, result.content, "utf-8");
  console.log("README.md updated.");
  return true;
}

function main() {
  console.log("Generating README content...");
  updateReadme();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
