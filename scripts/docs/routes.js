import path from "path";
import { ROUTE_POLICY, classifyRoute } from "../../server/config/route-policy.ts";
import { ROOT } from "./files.js";

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

const ACCESS_BY_CLASS = {
  public: "Public",
  publicRead: "Public",
  // Unguarded member handlers authenticate the request themselves, for example with short code and PIN.
  member: "Public",
  team: "Team",
  teamRead: "Team",
  session: "Login",
};

// Handler guards narrow access further than the route policy in server/config/route-policy.ts.
export function getAccess(endpoint, content) {
  if (content.includes("requireAdmin(") || content.includes('role !== "admin"')) return "Admin";
  if (content.includes("requirePlanner(")) return "Planner";
  if (content.includes("requireMember(")) return "Member";
  return ACCESS_BY_CLASS[classifyRoute(endpoint.method, endpoint.route)];
}

// CSRF applies only where the middleware checks the planner session.
export function getCsrfRequirement(endpoint) {
  const { method, route } = endpoint;
  return classifyRoute(method, route) === "session" && ROUTE_POLICY.csrfMethods.includes(method) ? "Yes" : "No";
}
