import { COIN_TERMS } from "./presets";

/** The DAMM pool's lifetime quote-side fees, in lamports. */
export interface PoolFeeMetrics {
  totalLpBFee: { toString(): string };
  totalProtocolBFee: { toString(): string };
}

/**
 * The curve reports its own lifetime quote fees. A graduated coin keeps
 * trading in a DAMM pool, whose lifetime LP and protocol quote fees are the
 * other half of the same total.
 */
export function totalTradingFees(curveLamports: bigint, pool: PoolFeeMetrics | null | undefined): bigint {
  if (!pool) return curveLamports;
  return curveLamports + BigInt(pool.totalLpBFee.toString()) + BigInt(pool.totalProtocolBFee.toString());
}

export function graduatedFeeLine(): string {
  const base = COIN_TERMS.graduatedFeeBps / 100;
  const max = COIN_TERMS.graduatedMaxFeeBps / 100;
  return `${base}% base, up to ${max}% with Meteora's dynamic fee`;
}
