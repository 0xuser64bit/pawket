import "server-only";

import { unstable_cache } from "next/cache";

/**
 * A read shared across requests — and, on Vercel, across instances (the Data
 * Cache) — for `seconds`. Only the scans of the whole program go through it:
 * the public devnet RPC rate-limits a crowd of instances, and a scan is the
 * heaviest read Pawket makes. A failed read is never kept. Outside Next
 * (tests, scripts) the read runs as it is. The value must be plain JSON, and
 * an entry outlives a deploy: a change to its shape needs a new `key`.
 */
export function shared<T>(read: () => Promise<T>, key: string, seconds: number): () => Promise<T> {
  if (!process.env.NEXT_RUNTIME) return read;
  return unstable_cache(read, ["pawket", key], { revalidate: seconds });
}
