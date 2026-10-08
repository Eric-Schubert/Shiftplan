import path from "path";
import { ROOT, readText } from "./files.js";

export function routeFromApiFile(filePath) {
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

function readStringArray(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

function readStringConst(source, name) {
  return source.match(new RegExp(`const ${name} = "([^"]+)"`))?.[1] ?? null;
}

// Mirrors the order in server/middleware/auth.ts, which decides who reaches a handler.
export function loadRouteRules() {
  const middleware = readText("server", "middleware", "auth.ts");
  const { routes } = JSON.parse(readText("config", "backend.config.json")).auth;

  return {
    public: routes.public,
    publicGetPrefixes: routes.publicGetPrefixes,
    teamRoutes: readStringArray(middleware, "TEAM_ROUTES"),
    memberPrefix: readStringConst(middleware, "MEMBER_PREFIX"),
    builtinReadPrefixes: readStringArray(middleware, "BUILTIN_READ_PREFIXES"),
  };
}

function matchesPrefix(route, prefixes) {
  return prefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

export function getAccess(endpoint, content, rules) {
  if (content.includes("requireAdmin(")) return "Admin";
  if (content.includes("requirePlanner(")) return "Planner";
  if (content.includes("requireMember(")) return "Member";

  const { method, route } = endpoint;
  if (rules.public.includes(route)) return "Public";
  if (rules.memberPrefix && route.startsWith(rules.memberPrefix)) return "Public";
  if (rules.teamRoutes.includes(route)) return "Team";
  if (method === "GET" && matchesPrefix(route, [...rules.publicGetPrefixes, ...rules.builtinReadPrefixes])) {
    return "Team";
  }
  return "Login";
}

// CSRF applies only where the middleware checks the planner session.
export function getCsrfRequirement(endpoint, rules) {
  const { method, route } = endpoint;
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) return "No";
  if (rules.public.includes(route) || rules.teamRoutes.includes(route)) return "No";
  if (rules.memberPrefix && route.startsWith(rules.memberPrefix)) return "No";
  return "Yes";
}
