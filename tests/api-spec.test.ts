import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { getApiEndpoints } from "../scripts/docs/api.js";
import { SPEC_BUNDLE, SPEC_DIR, bundleApiSpec } from "../scripts/docs/api-spec.js";
import { ROOT } from "../scripts/docs/files.js";

type Spec = { openapi: string; paths: Record<string, Record<string, any>>; components: Record<string, Record<string, unknown>> };
const METHODS = ["get", "post", "put", "patch", "delete"];
const bundle = bundleApiSpec();
const spec = parse(bundle) as Spec;

/** Every operation of the spec as "METHOD /api/route/:id", named like the handler files. */
function operations(): string[] {
  return Object.entries(spec.paths).flatMap(([route, item]) =>
    Object.keys(item)
      .filter((method) => METHODS.includes(method))
      .map((method) => `${method.toUpperCase()} ${route.replace(/\{(\w+)\}/g, ":$1")}`)
  );
}

function refs(node: unknown, found: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((entry) => refs(entry, found));
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") found.push(value);
      else refs(value, found);
    }
  }
  return found;
}

function resolve(pointer: string): unknown {
  return pointer
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce<any>((node, key) => node?.[key], spec);
}

describe("app API spec", () => {
  it("is bundled from its parts and checked in", () => {
    expect(bundle.startsWith(`# Generated from ${SPEC_DIR}/`)).toBe(true);
    expect(fs.readFileSync(path.join(ROOT, SPEC_BUNDLE), "utf-8")).toBe(bundle);
  });

  it("is one document in which every reference resolves", () => {
    const all = refs(spec);

    expect(spec.openapi).toBe("3.1.0");
    expect(all.length).toBeGreaterThan(30);
    expect(all.filter((ref) => !ref.startsWith("#/") || resolve(ref) === undefined)).toEqual([]);
  });

  it("names only endpoints that exist as handler files", () => {
    const handlers = new Set(getApiEndpoints().map((endpoint: { method: string; route: string }) => `${endpoint.method} ${endpoint.route}`));
    const documented = operations();

    expect(documented.length).toBeGreaterThan(20);
    expect(documented.filter((operation) => !handlers.has(operation))).toEqual([]);
  });

  it("describes the rollout from the rotation pattern the app triggers", () => {
    const generate = spec.paths["/api/shiftplan/generate"]!.post;

    expect(Object.keys(generate.requestBody.content["application/json"].schema.properties)).toEqual(["year", "week", "weeks", "overwrite"]);
    expect(resolve(generate.responses["200"].content["application/json"].schema.$ref)).toMatchObject({
      required: ["generated", "skipped", "overwritten", "weeks"],
    });
  });
});

describe("spec bundler", () => {
  const files: Record<string, string> = {
    "spec/root.yaml": [
      "openapi: 3.1.0",
      "paths:",
      "  /api/a/{id}:",
      '    $ref: "paths/a.yaml"',
      "components:",
      "  schemas:",
      "    A:",
      '      $ref: "components/schemas.yaml#/A"',
      "    B:",
      '      $ref: "components/schemas.yaml#/B"',
      "",
    ].join("\n"),
    "spec/paths/a.yaml": [
      "get:",
      "  description: |",
      "    Two",
      "",
      "    paragraphs",
      "  responses:",
      '    "200":',
      "      schema:",
      '        $ref: "../components/schemas.yaml#/A"',
      "",
    ].join("\n"),
    "spec/components/schemas.yaml": ["A:", "  type: object", "  properties:", "    b:", '      $ref: "#/B"', "", "B:", "  type: string", ""].join("\n"),
  };
  const read = (file: string) => {
    if (!(file in files)) throw new Error(`no ${file}`);
    return files[file]!;
  };

  it("inlines each part where its $ref line was and points references into the bundle", () => {
    expect(parse(bundleApiSpec({ root: "spec/root.yaml", read }))).toEqual({
      openapi: "3.1.0",
      paths: { "/api/a/{id}": { get: { description: "Two\n\nparagraphs\n", responses: { "200": { schema: { $ref: "#/components/schemas/A" } } } } } },
      components: { schemas: { A: { type: "object", properties: { b: { $ref: "#/components/schemas/B" } } }, B: { type: "string" } } },
    });
  });

  it("refuses references to parts the root does not mount", () => {
    const broken: Record<string, string> = { ...files, "spec/components/schemas.yaml": files["spec/components/schemas.yaml"]!.replace('"#/B"', '"#/C"') };

    expect(() => bundleApiSpec({ root: "spec/root.yaml", read: (file) => broken[file]! })).toThrow('$ref "#/C" points to nothing the root mounts');
  });
});
