import "server-only";

import { createLimiter } from "@/lib/solana/sponsor";

export type CoinOperation = "quote" | "trade" | "launch" | "graduate" | "claim" | "position";

const HOUR = 60 * 60 * 1000;

/** Coin traffic gets its own buckets, so quoting cannot use up a trade's allowance. */
const LIMITS = {
  quote: createLimiter(240, HOUR),
  trade: createLimiter(120, HOUR),
  launch: createLimiter(10, HOUR),
  graduate: createLimiter(20, HOUR),
  claim: createLimiter(60, HOUR),
  position: createLimiter(240, HOUR),
} satisfies Record<CoinOperation, ReturnType<typeof createLimiter>>;

export const COIN_RETRY_AFTER_SECONDS = 60;

/** Writes count both the caller and the account, so neither one alone can spend the allowance. */
export function coinLimit(operation: CoinOperation, keys: string | readonly string[], now = Date.now()): boolean {
  return LIMITS[operation](keys, now);
}
