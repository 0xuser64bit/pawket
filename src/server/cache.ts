import "server-only";

import { unstable_cache } from "next/cache";

/**
 * A read shared across requests — and, on Vercel, across instances (the Data
 * Cache) — for `seconds`. Only the scans of the whole program go through it:
 * the public devnet RPC rate-limits a crowd of instances, and a scan is the
 * heaviest read Pawket makes. A failed read is never kept. Outside Next
 * (tests, scripts) the read runs as it is. The value must be plain JSON, and
 * an entry outlives a deploy: a change to its shape needs a new `key`.
 *
 * The Data Cache answers a stale entry at once and refreshes it behind the
 * request, and keeps it when that refresh fails: after a quiet hour the
 * first visitor would see an hour-old count as live. So each entry carries
 * when it was read, and one older than twice its life is read again here
 * instead — or fails, and says so.
 */
export function shared<T>(read: () => Promise<T>, key: string, seconds: number): () => Promise<T> {
  if (!process.env.NEXT_RUNTIME) return read;
  const dated = unstable_cache(async () => ({ at: Date.now(), value: await read() }), ["pawket", key, "dated"], { revalidate: seconds });
  return async () => {
    const entry = await dated();
    return Date.now() - entry.at > seconds * 2000 ? read() : entry.value;
  };
}
