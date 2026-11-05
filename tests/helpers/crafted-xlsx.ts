// Crafted files that once made the reader or the import do work per cell that grew with the input,
// blocking the server for seconds to minutes. Each case has to finish well inside this limit.
export const LIMIT_MS = 300;

export function timed(run: () => unknown): { ms: number; error: unknown } {
  const start = performance.now();
  let error: unknown = null;
  try {
    run();
  } catch (caught) {
    error = caught;
  }
  return { ms: performance.now() - start, error };
}

/** Text that hardly compresses at all (mulberry32), to pad an entry under the expansion limit. */
export function randomText(length: number, seed = 7): string {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let state = seed;
  return Array.from({ length }, () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return letters[Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * letters.length)];
  }).join("");
}
