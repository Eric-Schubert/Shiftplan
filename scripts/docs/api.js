import path from "path";
import { getDescription } from "./descriptions.js";
import { listFilesRecursive, readText } from "./files.js";
import { getAccess, getCsrfRequirement, loadRouteRules, routeFromApiFile } from "./routes.js";

// Field names read as `body.x` or `query.x` in a route file.
function getFields(content, objectName) {
  const fields = new Set();
  for (const match of content.matchAll(new RegExp(`\\b${objectName}\\.([A-Za-z_][A-Za-z0-9_]*)`, "g"))) {
    fields.add(match[1]);
  }
  return [...fields].sort();
}

export function getApiEndpoints() {
  const rules = loadRouteRules();

  return listFilesRecursive(path.join("server", "api"))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => {
      const endpoint = routeFromApiFile(file);
      const content = readText(file);

      return {
        ...endpoint,
        file,
        group: endpoint.route.split("/")[2] || "root",
        access: getAccess(endpoint, content, rules),
        csrf: getCsrfRequirement(endpoint, rules),
        query: getFields(content, "query"),
        body: getFields(content, "body"),
        description: getDescription(endpoint),
      };
    })
    .sort((a, b) => {
      const groupOrder = ["staff", "shift", "shiftplan", "rotation", "auth", "audit", "holidays"];
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
    const title = group.charAt(0).toUpperCase() + group.slice(1);
    lines.push(`### ${title}\n`);
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
