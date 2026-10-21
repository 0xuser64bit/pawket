import "server-only";

import { unstable_cache } from "next/cache";

/**
 * Next's Data Cache outlives a deploy, so a change to a value's shape needs a new `key`. It also
 * keeps serving a stale entry when its refresh fails, so entries are dated and re-read here once
 * twice their age.
 */
export function shared<T>(read: () => Promise<T>, key: string, seconds: number): () => Promise<T> {
  if (!process.env.NEXT_RUNTIME) return read;
  const dated = unstable_cache(async () => ({ at: Date.now(), value: await read() }), ["pawket", key, "dated"], { revalidate: seconds });
  return async () => {
    const entry = await dated();
    return Date.now() - entry.at > seconds * 2000 ? read() : entry.value;
  };
}
