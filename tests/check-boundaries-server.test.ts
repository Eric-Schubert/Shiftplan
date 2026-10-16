import { describe, expect, it } from "vitest";
import { checkBoundaries as check } from "./helpers/boundaries";

describe("boundary check server rules", () => {
  it("reports server/utils and server/lib importing services", () => {
    expect(
      check({
        "server/utils/flow.ts": 'import { A } from "#server/services/a.service";',
        "server/lib/x/y.ts": 'import { B } from "~/server/services/b/c";',
      })
    ).toEqual(["server/utils/flow.ts:1 server/utils imports a service", "server/lib/x/y.ts:1 server/lib imports a service"]);
  });

  it("lets services reach other features only through their facade", () => {
    const contents = {
      "server/services/b.service.ts": "",
      "server/services/c/index.ts": "",
      "server/services/a/x.ts": [
        'import "~/server/services/b.service";',
        'import "~/server/services/c";',
        'import "~/server/services/b/internal";',
        'import "./y";',
      ].join("\n"),
    };
    expect(check(contents)).toEqual(["server/services/a/x.ts:3 service imports another service's internals instead of its facade"]);
  });

  it("keeps migrations inside server/lib/migrations", () => {
    const migration = ['import fs from "node:fs";', 'import { up } from "../schema.js";', 'import { x } from "../../../utils/x.js";'].join("\n");
    expect(check({ "server/lib/migrations/main/001.js": migration })).toEqual([
      "server/lib/migrations/main/001.js:3 migration imports outside server/lib/migrations (setup.js runs it without the Nitro bundle)",
    ]);
  });

  it("lets handlers, middleware, plugins and routes reach services only through their facade", () => {
    const facades = { "server/services/b.service.ts": "", "server/services/c/index.ts": "" };
    const imports = ['import "~/server/services/b.service";', 'import "~/server/services/c";', 'import "~/server/utils/x";'];
    const contents = {
      ...facades,
      "server/api/x.get.ts": [...imports, 'import { y } from "~/server/services/b/internal";'].join("\n"),
      "server/middleware/auth.ts": 'import "#server/services/c/config";',
      "server/plugins/start.ts": 'import "../services/b/jobs";',
      "server/routes/feed.ts": 'import "~/server/services/c/feed";',
    };
    const rule = "handler imports a service's internals instead of its facade";
    expect(check(contents)).toEqual([
      `server/api/x.get.ts:4 ${rule}`,
      `server/middleware/auth.ts:1 ${rule}`,
      `server/plugins/start.ts:1 ${rule}`,
      `server/routes/feed.ts:1 ${rule}`,
    ]);
  });

  it("keeps app code out of all server code, types/ and shared/ stay open", () => {
    const app = [
      "~/components/A.vue",
      "~/composables/useX",
      "~/stores/auth",
      "~/utils/legal/durations",
      "~/pages/index.vue",
      "~/layouts/default.vue",
      "~/plugins/x",
      "~/theme/primevue-theme",
      "~/assets/css/tokens.css",
      "~/app.vue",
      "~/error.vue",
    ];
    const open = ["~/types/privacy", "~/shared/utils/retention", "~/server/utils/database", "~/server/plugins/x", "h3"];
    const source = [...app, ...open].map((spec) => `import "${spec}";`).join("\n");
    const rule = "server code imports app code";
    expect(check({ "server/api/x.get.ts": source })).toEqual(app.map((_, index) => `server/api/x.get.ts:${index + 1} ${rule}`));
    expect(check({ "server/lib/x.ts": 'import "~/utils/x";', "server/services/a/x.ts": 'import "../../../composables/useX";' })).toEqual([
      `server/lib/x.ts:1 ${rule}`,
      `server/services/a/x.ts:1 ${rule}`,
    ]);
  });
});
