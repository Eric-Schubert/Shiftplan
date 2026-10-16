import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  generateApiDocs,
  generateDocContent,
  generateWorkflowDocs,
} from "../scripts/docs-generator.js";

describe("docs generator", () => {
  it("generates stable docs content", () => {
    for (const [key, filePath] of Object.entries(CONFIG.files)) {
      const original = fs.readFileSync(filePath, "utf-8");
      const first = generateDocContent(key, original);
      const second = generateDocContent(key, first.content);

      expect(first.touched).toBe(true);
      expect(second.content).toBe(first.content);
    }
  });

  it("documents API access as enforced by the auth middleware", () => {
    const apiDocs = generateApiDocs();

    expect(apiDocs).toContain("| Method | Endpoint | Access | CSRF | Query | Body | Description |");
    expect(apiDocs).toContain("| `POST` | `/api/shiftplan/assign` | Planner | Yes |");
    expect(apiDocs).toContain("| `POST` | `/api/auth/login` | Public | No |");
    expect(apiDocs).toContain("| `POST` | `/api/contact` | Public | No |");
    expect(apiDocs).toContain("| `GET` | `/api/legal/privacy` | Public | No |");
    expect(apiDocs).toContain("| `GET` | `/api/shiftplan` | Team | No |");
    expect(apiDocs).toContain("| `GET` | `/api/absences` | Team | No |");
    expect(apiDocs).toContain("| `POST` | `/api/viewer/login` | Team | No |");
    expect(apiDocs).toContain("| `POST` | `/api/member/login` | Public | No |");
    expect(apiDocs).toContain("| `GET` | `/api/member/me` | Member | No |");
    expect(apiDocs).toContain("| `POST` | `/api/auth/users` | Admin | Yes |");
    expect(apiDocs).toContain("| `POST` | `/api/auth/change-password` | Login | Yes |");
    expect(apiDocs).toContain("| `POST` | `/api/auth/logout` | Public | No |");
    expect(apiDocs).toContain("| `GET` | `/api/holidays/public` | Public | No |");
    expect(apiDocs).toContain("| `PUT` | `/api/requests/settings` | Admin | Yes |");
  });

  it("reads access from server/config/route-policy.ts", async () => {
    vi.resetModules();
    vi.doMock("~/server/config/route-policy", async (importOriginal) => {
      const original = await importOriginal<typeof import("~/server/config/route-policy")>();
      return {
        ...original,
        ROUTE_POLICY: { ...original.ROUTE_POLICY, csrfMethods: ["POST"] },
        classifyRoute: (method: string, path: string) =>
          path.startsWith("/api/holidays/") ? "teamRead" : original.classifyRoute(method, path),
      };
    });

    try {
      const { generateApiDocs: generateWithPolicy } = await import("../scripts/docs-generator.js");
      const apiDocs = generateWithPolicy();
      expect(apiDocs).toContain("| `POST` | `/api/staff` | Admin | Yes |");
      expect(apiDocs).toContain("| `DELETE` | `/api/staff/:id` | Admin | No |");
      expect(apiDocs).toContain("| `GET` | `/api/holidays/public` | Team | No |");
    } finally {
      vi.doUnmock("~/server/config/route-policy");
      vi.resetModules();
    }
  });

  it("generates workflow documentation", () => {
    const workflowDocs = generateWorkflowDocs();

    expect(workflowDocs).toContain("Visible in releases:");
    expect(workflowDocs).toContain("scripts/release-prefixes.json");
    expect(workflowDocs).toContain("`security:`");
    expect(workflowDocs).toContain("`docs:`");
    expect(workflowDocs).toContain("Docker build with smoke test");
    expect(workflowDocs).toContain("CI success + deploy prefix");
    expect(workflowDocs).not.toContain("`doc:`");
  });
});
