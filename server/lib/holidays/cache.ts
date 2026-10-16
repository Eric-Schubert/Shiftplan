import { getHolidayCacheDurationMs } from "~/server/config/holiday-config";

// Holiday answers per year, country and states. Bounded, so requests for arbitrary years cannot grow it.
const MAX_ENTRIES = 64;

type Entry<T> = { data: T; timestamp: number };

/**
 * A cache in front of the holiday API: fresh entries are served as they are, parallel requests for the
 * same key share one fetch, and when the API fails an expired entry stands in, so an outage keeps the
 * holidays the plan already showed instead of answering with an error.
 */
export function createHolidayCache<T>(label: string): (key: string, load: () => Promise<T>) => Promise<T> {
  const entries = new Map<string, Entry<T>>();
  const pending = new Map<string, Promise<T>>();

  function store(key: string, data: T): void {
    entries.delete(key);
    entries.set(key, { data, timestamp: Date.now() });
    const oldest = entries.keys().next().value;
    if (entries.size > MAX_ENTRIES && oldest !== undefined) entries.delete(oldest);
  }

  return (key, load) => {
    const entry = entries.get(key);
    if (entry && Date.now() - entry.timestamp < getHolidayCacheDurationMs()) return Promise.resolve(entry.data);

    const running = pending.get(key);
    if (running) return running;

    const request = load()
      .then((data) => {
        store(key, data);
        return data;
      })
      .catch((error: unknown) => {
        if (!entry) throw error;
        console.warn(`[holidays] ${label}: the API failed, serving the last answer.`, error instanceof Error ? error.message : error);
        return entry.data;
      })
      .finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  };
}
