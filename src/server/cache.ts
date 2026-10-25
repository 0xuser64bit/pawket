import "server-only";

import { unstable_cache } from "next/cache";

/** Next's Data Cache outlives a deploy: change `key` when a value's shape changes. */
export function shared<T>(read: () => Promise<T>, key: string, seconds: number): () => Promise<T> {
  if (!process.env.NEXT_RUNTIME) return read;
  const dated = unstable_cache(async () => ({ at: Date.now(), value: await read() }), ["pawket", key, "dated"], { revalidate: seconds });
  return async () => {
    const entry = await dated();
    return Date.now() - entry.at > seconds * 2000 ? read() : entry.value;
  };
}
