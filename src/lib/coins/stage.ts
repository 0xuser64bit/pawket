/**
 * Where a guild's coin is in its life, decided once on the server from what
 * Solana holds — the screen draws what this says and never works it out
 * again (`LaunchStage` in `src/components/pk/guild.tsx`).
 *
 * - `none`: no coin. The guild is a social guild, as every guild starts.
 * - `dbc`: the coin is on its bonding curve: bought and sold there.
 * - `pending`: the curve has raised its threshold, or has migrated and the
 *   DAMM v2 pool it moved to is not yet checked. Trading pauses, because
 *   the curve takes no more trades and the pool is not yet confirmed as the
 *   one the preset promised.
 * - `damm`: graduated, and the DAMM v2 pool is the one derived from the
 *   preset and the coin — the only pool Pawket will quote or send to.
 * - `suspended`: Pawket stopped promoting the guild (`delisted.ts`). The
 *   coin and everything held in it are untouched on Solana; Pawket only
 *   stops offering trades in it.
 */
export type CoinStage = "none" | "dbc" | "pending" | "damm" | "suspended";

export interface CoinFacts {
  /** False when Pawket has delisted the guild. */
  listed: boolean;
  /** The coin's curve, or null when no coin was launched. */
  curve: { raised: bigint; threshold: bigint; migrated: boolean } | null;
  /** The graduated pool at the address the preset derives, once the curve has migrated. */
  graduated: { verified: boolean } | null;
}

export function coinStage({ listed, curve, graduated }: CoinFacts): CoinStage {
  if (!curve) return "none";
  if (!listed) return "suspended";
  if (curve.migrated && graduated?.verified) return "damm";
  if (curve.migrated || curve.raised >= curve.threshold) return "pending";
  return "dbc";
}

/** What a stage lets anyone do here. Trading goes only where the stage says the route is live. */
export function canTrade(stage: CoinStage): boolean {
  return stage === "dbc" || stage === "damm";
}

/**
 * Progress toward graduation as whole segments of `segments`, rounded down:
 * a meter shows nine of ten until the threshold is really met, and never
 * more than full.
 */
export function graduationSegments(raised: bigint, threshold: bigint, segments = 10): number {
  if (threshold <= 0n) return 0;
  if (raised >= threshold) return segments;
  return Number((raised * BigInt(segments)) / threshold);
}
