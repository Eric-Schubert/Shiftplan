import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The five purges behind their facades, so the plugin runs without a database.
const purges = vi.hoisted(() => ({
  purgeOldAuditEntries: vi.fn(),
  purgeOldReasons: vi.fn(),
  purgeOldMessages: vi.fn(),
  purgeOldContactMessages: vi.fn(),
  purgeMemberAccess: vi.fn(),
}));
vi.mock("~/server/services/audit.service", () => ({ purgeOldAuditEntries: purges.purgeOldAuditEntries }));
vi.mock("~/server/services/absence.service", () => ({ purgeOldReasons: purges.purgeOldReasons }));
vi.mock("~/server/services/shift-request.service", () => ({ purgeOldMessages: purges.purgeOldMessages }));
vi.mock("~/server/services/contact.service", () => ({ purgeOldContactMessages: purges.purgeOldContactMessages }));
vi.mock("~/server/services/member-access.service", () => ({ purgeMemberAccess: purges.purgeMemberAccess }));

const HOUR_MS = 60 * 60 * 1000;
const calls = () => Object.values(purges).map((purge) => purge.mock.calls.length);

type NitroApp = { hooks: { hook: (name: string, fn: () => void) => void } };

/** Loads the plugin like Nitro does at start and returns the hooks it registered. */
async function startPlugin(): Promise<Record<string, () => void>> {
  const hooks: Record<string, () => void> = {};
  const plugin = (await import("~/server/plugins/housekeeping")).default as unknown as (app: NitroApp) => void;
  plugin({ hooks: { hook: (name, fn) => (hooks[name] = fn) } });
  return hooks;
}

describe("housekeeping", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-05T08:00:00Z") });
    vi.stubGlobal("defineNitroPlugin", (plugin: unknown) => plugin);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.resetModules();
    for (const purge of Object.values(purges)) purge.mockReset();
  });

  it("runs every purge when the server starts, then every hour, and stops with the server", async () => {
    const hooks = await startPlugin();
    expect(calls()).toEqual([1, 1, 1, 1, 1]);
    expect(purges.purgeOldAuditEntries).toHaveBeenCalledWith(Date.now());

    vi.advanceTimersByTime(HOUR_MS - 1);
    expect(calls()).toEqual([1, 1, 1, 1, 1]);
    vi.advanceTimersByTime(1);
    expect(calls()).toEqual([2, 2, 2, 2, 2]);

    hooks.close!();
    vi.advanceTimersByTime(HOUR_MS);
    expect(calls()).toEqual([2, 2, 2, 2, 2]);
  });

  it("does not keep the process alive for its timer", async () => {
    const timers: NodeJS.Timeout[] = [];
    const fakeSetInterval = globalThis.setInterval;
    vi.stubGlobal("setInterval", (...args: Parameters<typeof setInterval>) => {
      const timer = fakeSetInterval(...args);
      timers.push(timer);
      return timer;
    });

    await startPlugin();

    expect(timers).toHaveLength(1);
    expect(timers[0]!.hasRef()).toBe(false);
  });

  it("keeps going when one purge fails, and says which one", async () => {
    purges.purgeOldReasons.mockImplementation(() => {
      throw new Error("database is locked");
    });
    const log = vi.fn();
    const { runHousekeeping } = await import("~/server/services/housekeeping.service");

    runHousekeeping(Date.now(), undefined, log);

    expect(calls()).toEqual([1, 1, 1, 1, 1]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("[housekeeping] absence reasons: purge failed", expect.objectContaining({ message: "database is locked" }));
  });
});
