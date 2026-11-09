import "server-only";

import { readDeadline } from "@/lib/utils/deadline";

/**
 * A shared read with a short life. Concurrent callers share one load, a
 * rejected or timed-out load is never kept, and the oldest entry is dropped
 * once the cache reaches its cap.
 */
export function createCachedRead<T>({ ttlMs, maxEntries = 64 }: { ttlMs: number; maxEntries?: number }) {
  const entries = new Map<string, { at: number; value: Promise<T> }>();
  return (key: string, load: () => Promise<T>, now = Date.now()): Promise<T> => {
    const cached = entries.get(key);
    if (cached && now - cached.at < ttlMs) return cached.value;
    entries.delete(key);
    const value = Promise.resolve().then(load);
    entries.set(key, { at: now, value });
    value.catch(() => {
      if (entries.get(key)?.value === value) entries.delete(key);
    });
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
    return value;
  };
}

/** Runs a read inside its own budget, always clearing the timer and parent listener. */
export async function withinDeadline<T>(load: (signal: AbortSignal) => Promise<T>, timeoutMs: number, parent?: AbortSignal): Promise<T> {
  const deadline = readDeadline(timeoutMs, parent);
  if (deadline.signal.aborted) {
    deadline.dispose();
    throw deadline.signal.reason;
  }
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => load(deadline.signal)),
      new Promise<never>((_resolve, reject) => {
        onAbort = () => reject(deadline.signal.reason);
        deadline.signal.addEventListener("abort", onAbort, { once: true });
      }),
    ]);
  } finally {
    if (onAbort) deadline.signal.removeEventListener("abort", onAbort);
    deadline.dispose();
  }
}
