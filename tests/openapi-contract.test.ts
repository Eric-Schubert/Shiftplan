import { describe, expect, it } from "vitest";
import backendConfig from "../config/backend.config.json";
import { getOpenApiDocument } from "~/server/utils/openapi";

describe("mobile OpenAPI contract", () => {
  it("publishes the Flutter MVP endpoints and bearer auth scheme", () => {
    const document = getOpenApiDocument();

    expect(document.openapi).toBe("3.1.0");
    expect(document.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    expect(Object.keys(document.paths)).toEqual([
      "/api/openapi",
      "/api/auth/login",
      "/api/auth/session",
      "/api/auth/logout",
      "/api/staff",
      "/api/shift",
      "/api/shiftplan",
      "/api/shiftplan/assign",
      "/api/shiftplan/unassign",
    ]);
  });

  it("documents token login mode and keeps the contract publicly discoverable", () => {
    const document = getOpenApiDocument();

    expect(
      document.components.schemas.LoginRequest.properties.responseMode.enum
    ).toEqual(["cookie", "token"]);
    expect(document.paths["/api/auth/login"].post.operationId).toBe("login");
    expect(document.paths["/api/shiftplan/assign"].post.security).toEqual([
      { bearerAuth: [] },
    ]);
    expect(backendConfig.auth.routes.public).toContain("/api/openapi");
  });
});
