import fs from "node:fs";
import path from "node:path";
import { routeFromApiFile } from "../../scripts/docs/routes.js";

const ROOT = path.resolve(__dirname, "../..");

/** [method, route, handler module relative to the project root]; apiRoutes() derives them from the file. */
export type Route = [string, string, string];

/** The route of a handler file, the way Nitro reads its path. */
function handlerRoute(handlerFile: string): Route {
  if (!fs.existsSync(path.join(ROOT, handlerFile))) throw new Error(`No handler file ${handlerFile}`);
  const { method, route } = routeFromApiFile(handlerFile);
  return [method.toLowerCase(), route, handlerFile.replace(/\.ts$/, "")];
}

/** Harness routes for handler files below server/api, named like the file: "auth/login.post.ts", "staff/[id].patch.ts". */
export function apiRoutes(...files: string[]): Route[] {
  return files.map((file) => handlerRoute(`server/api/${file}`));
}

/** Throws when a hand-written route does not match the method and path of its handler file. */
export function checkRoute([method, route, modulePath]: Route): void {
  if (!modulePath.startsWith("server/api/")) return;
  const [expectedMethod, expectedRoute] = handlerRoute(`${modulePath}.ts`);
  if (expectedMethod !== method.toLowerCase() || expectedRoute !== route) {
    throw new Error(`${method.toUpperCase()} ${route} does not match ${modulePath}.ts, which serves ${expectedMethod.toUpperCase()} ${expectedRoute}`);
  }
}
