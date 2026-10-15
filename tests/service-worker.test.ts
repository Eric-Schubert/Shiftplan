import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://plan.example.de";
const SOURCE = readFileSync(resolve(__dirname, "../public/sw.js"), "utf-8");
const SERVER_KEY = Buffer.from([4, 1, 2, 3]).toString("base64url");

type Handler = (event: any) => void;

function subscription(endpoint: string) {
  return { endpoint, options: { applicationServerKey: new Uint8Array([9]) }, toJSON: () => ({ endpoint }) };
}

/** Runs public/sw.js against a minimal service worker scope and returns its listeners. */
function loadWorker() {
  const handlers = new Map<string, Handler>();
  const fetch = vi.fn(async (path: string, _init?: RequestInit) =>
    path === "/api/viewer/status"
      ? new Response(JSON.stringify({ pushPublicKey: SERVER_KEY }))
      : new Response(JSON.stringify({ success: true }))
  );
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
    registration: { pushManager: { subscribe: vi.fn(async () => subscription("https://fcm.googleapis.com/new")) } },
    clients: { matchAll: vi.fn(async () => []), openWindow: vi.fn(async () => null) },
  };
  new Function("self", "fetch", SOURCE)(self, fetch);

  async function dispatch(type: string, event: Record<string, unknown>) {
    const pending: Promise<unknown>[] = [];
    handlers.get(type)!({ ...event, waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
    await Promise.all(pending);
  }
  const posted = () =>
    fetch.mock.calls
      .filter(([, init]) => init?.method === "POST")
      .map(([path, init]) => [path, JSON.parse(String(init!.body))]);
  return { self, dispatch, posted };
}

describe("service worker", () => {
  let worker: ReturnType<typeof loadWorker>;
  beforeEach(() => {
    worker = loadWorker();
  });

  it("reports a renewed subscription and drops the old one", async () => {
    await worker.dispatch("pushsubscriptionchange", {
      oldSubscription: subscription("https://fcm.googleapis.com/old"),
      newSubscription: subscription("https://fcm.googleapis.com/renewed"),
    });

    expect(worker.posted()).toEqual([
      ["/api/push/subscribe", { endpoint: "https://fcm.googleapis.com/renewed" }],
      ["/api/push/unsubscribe", { endpoint: "https://fcm.googleapis.com/old" }],
    ]);
  });

  it("subscribes again with the server key when the browser dropped the subscription", async () => {
    await worker.dispatch("pushsubscriptionchange", { oldSubscription: null, newSubscription: null });

    expect(worker.self.registration.pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: Uint8Array.from([4, 1, 2, 3]),
    });
    expect(worker.posted()).toEqual([["/api/push/subscribe", { endpoint: "https://fcm.googleapis.com/new" }]]);
  });

  it("opens only pages of its own site from a notification", async () => {
    const click = (url: string) => worker.dispatch("notificationclick", { notification: { close: () => {}, data: { url } } });

    await click("/?year=2026&week=41");
    await click("https://evil.example/login");
    await click("//evil.example/login");

    expect(worker.self.clients.openWindow.mock.calls).toEqual([
      [`${ORIGIN}/?year=2026&week=41`],
      [`${ORIGIN}/`],
      [`${ORIGIN}/`],
    ]);
  });
});
