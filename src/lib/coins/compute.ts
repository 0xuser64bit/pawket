export type CoinOperation = "trade" | "launch" | "graduate" | "claim";

/** Conservative ceilings for each coin operation. */
export const COIN_COMPUTE_LIMITS: Readonly<Record<CoinOperation, number>> = Object.freeze({
  trade: 400_000,
  launch: 600_000,
  graduate: 600_000,
  claim: 300_000,
});

/** Micro-lamports per compute unit: a modest default, and the most a coin may ask for. */
export const COIN_PRIORITY_FEE_MICRO_LAMPORTS = 10_000n;
export const COIN_PRIORITY_FEE_MAX_MICRO_LAMPORTS = 200_000n;

export const COMPUTE_BUDGET_PROGRAM = "ComputeBudget111111111111111111111111111111";
export const SET_COMPUTE_UNIT_LIMIT = 2;
export const SET_COMPUTE_UNIT_PRICE = 3;

export function coinComputeLimit(operation: CoinOperation): number {
  return COIN_COMPUTE_LIMITS[operation];
}
