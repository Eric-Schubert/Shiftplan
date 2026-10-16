import { describe, expect, it } from "vitest";
import { listFilesRecursive, readText } from "../scripts/docs/files.js";
import { apiRoutes, checkRoute } from "./helpers/routes";

const SELF = "tests/api-routes.test.ts";

// Handlers that no test registers in the harness. Keep it empty: a new handler gets an E2E test
// with a happy path and an access or validation check, not an entry here.
const WITHOUT_TEST: string[] = [];

/** Handler files relative to server/api, as apiRoutes() names them. */
const HANDLERS = (listFilesRecursive("server/api") as string[])
  .map((file) => file.split("\\").join("/"))
  .filter((file) => file.endsWith(".ts"))
  .map((file) => file.slice("server/api/".length));

/** Handler files a test registers: apiRoutes("auth/login.post.ts") and older [method, route, "server/api/…"] tuples. */
function registeredHandlers(source: string): string[] {
  const named = [...source.matchAll(/apiRoutes\(([^)]*)\)/g)].flatMap(([, args]) => [...args!.matchAll(/"([^"]+)"/g)].map(([, file]) => file!));
  const tuples = [...source.matchAll(/\[\s*"(?:get|post|put|patch|delete)"\s*,\s*[^,\]]+,\s*"server\/api\/([^"]+)"\s*\]/g)].map(
    ([, module]) => `${module!.replace(/\.ts$/, "")}.ts`
  );
  return [...named, ...tuples];
}

const REGISTERED = new Map(
  (listFilesRecursive("tests") as string[])
    .map((file) => file.split("\\").join("/"))
    .filter((file) => file.endsWith(".ts") && file !== SELF)
    .map((file) => [file, registeredHandlers(readText(file))])
);

describe("harness routes", () => {
  it("takes method and route from the handler file", () => {
    expect(apiRoutes("staff/[id].patch.ts", "instance.get.ts", "shiftplan/index.get.ts")).toEqual([
      ["patch", "/api/staff/:id", "server/api/staff/[id].patch"],
      ["get", "/api/instance", "server/api/instance.get"],
      ["get", "/api/shiftplan", "server/api/shiftplan/index.get"],
    ]);
  });

  it("refuses missing files and routes that do not match their file", () => {
    expect(() => apiRoutes("staff/missing.get.ts")).toThrow("No handler file server/api/staff/missing.get.ts");
    expect(() => checkRoute(["post", "/api/requests/settings", "server/api/requests/settings.put"])).toThrow("serves PUT /api/requests/settings");
    expect(() => checkRoute(["get", "/api/staffs", "server/api/staff/index.get"])).toThrow("serves GET /api/staff");
    expect(() => checkRoute(["patch", "/api/staff/:id", "server/api/staff/[id].patch"])).not.toThrow();
  });

  it("names only handler files that exist", () => {
    const missing = [...REGISTERED].flatMap(([test, files]) => files.filter((file) => !HANDLERS.includes(file)).map((file) => `${test}: ${file}`));

    expect(HANDLERS.length).toBeGreaterThan(50);
    expect(missing).toEqual([]);
  });

  it("registers every handler in at least one test", () => {
    const registered = new Set([...REGISTERED.values()].flat());
    const untested = HANDLERS.filter((file) => !registered.has(file));

    expect(untested).toEqual(WITHOUT_TEST);
  });
});
