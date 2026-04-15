import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CONFIG,
  generateApiDocs,
  generateRbacMatrix,
  generateReadmeContent,
  generateStructure,
  generateWorkflowDocs,
} from "../scripts/readme-generator.js";

describe("README generator", () => {
  it("generates stable README content", () => {
    const original = fs.readFileSync(CONFIG.readme, "utf-8");
    const first = generateReadmeContent(original);
    const second = generateReadmeContent(first.content);

    expect(first.touched).toBe(true);
    expect(second.content).toBe(first.content);
  });

  it("documents API access and CSRF requirements", () => {
    const apiDocs = generateApiDocs();
    const rbac = generateRbacMatrix();

    expect(apiDocs).toContain("| Method | Endpoint | Access | CSRF | Query | Body | Description |");
    expect(apiDocs).toContain("`POST` | `/api/shiftplan/assign` | Planner/Admin | Yes");
    expect(apiDocs).toContain("`POST` | `/api/auth/login` | Public | No");
    expect(rbac).toContain("| `GET` | `/api/shiftplan` | Yes | Yes | Yes | No |");
    expect(rbac).toContain("| `POST` | `/api/auth/users` | No | No | Yes | Yes |");
  });

  it("generates ASCII structure and workflow documentation", () => {
    const structure = generateStructure();
    const workflowDocs = generateWorkflowDocs();

    expect(structure).toContain("|-- components/");
    expect(structure).not.toContain("├");
    expect(workflowDocs).toContain("Visible in releases:");
    expect(workflowDocs).toContain("`security:`");
    expect(workflowDocs).toContain("`docs:`");
    expect(workflowDocs).not.toContain("`doc:`");
  });
});
