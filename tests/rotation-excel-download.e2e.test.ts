import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachmentDisposition, dispositionFileName } from "~/shared/utils/http/content-disposition";
import { createApiClient, type ApiClient } from "./helpers/api-harness";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);

const TEMPLATE = "/api/rotation/excel-template";
let client: ApiClient;

describe("Rotation Excel template download", () => {
  beforeEach(async () => {
    client = await createApiClient([
      ["post", "/api/auth/login", "server/api/auth/login.post"],
      ["get", TEMPLATE, "server/api/rotation/excel-template.get"],
    ]);
  });

  afterEach(() => {
    client.close();
  });

  it("names the file from the catalog, also as UTF-8 filename*", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    const response = await client.request("GET", TEMPLATE, { jar: planner, headers: { "accept-language": "de-AT" } });
    const disposition = response.headers.find(([name]) => name.toLowerCase() === "content-disposition")?.[1];

    expect(response.status).toBe(200);
    expect(disposition).toBe(
      "attachment; filename=\"shiftplan-rotation-template.xlsx\"; filename*=UTF-8''shiftplan-rotation-template.xlsx"
    );
    expect(dispositionFileName(disposition)).toBe("shiftplan-rotation-template.xlsx");
    expect(Buffer.from(response.body as Uint8Array).subarray(0, 2).toString()).toBe("PK");
  });

  it("needs a planner", async () => {
    expect((await client.request("GET", TEMPLATE)).status).toBe(401);
  });
});

describe("Content-Disposition file names", () => {
  it.each([
    ["shiftplan-rotation-template.xlsx", 'filename="shiftplan-rotation-template.xlsx"'],
    ["Schichtplan Übersicht.xlsx", 'filename="Schichtplan _bersicht.xlsx"; filename*=UTF-8\'\'Schichtplan%20%C3%9Cbersicht.xlsx'],
    ['Plan "A" (2).xlsx', "filename=\"Plan _A_ (2).xlsx\"; filename*=UTF-8''Plan%20%22A%22%20%282%29.xlsx"],
  ])("keeps %s through the header", (name, part) => {
    const header = attachmentDisposition(name);

    expect(header).toContain(part);
    expect(dispositionFileName(header)).toBe(name);
  });

  it("reads plain, quoted and broken headers", () => {
    expect(dispositionFileName('attachment; filename="plan.xlsx"')).toBe("plan.xlsx");
    expect(dispositionFileName("attachment; filename=plan.xlsx")).toBe("plan.xlsx");
    expect(dispositionFileName("attachment; filename*=UTF-8''%E0%A4%A; filename=\"fallback.xlsx\"")).toBe("fallback.xlsx");
    expect(dispositionFileName("attachment")).toBeNull();
    expect(dispositionFileName(null)).toBeNull();
  });
});
