export type CoinStage = "none" | "dbc" | "pending" | "damm" | "suspended";

export interface CoinFacts {
  listed: boolean;
  curve: { raised: bigint; threshold: bigint; migrated: boolean } | null;
  graduated: { verified: boolean } | null;
}

export function coinStage({ listed, curve, graduated }: CoinFacts): CoinStage {
  if (!curve) return "none";
  if (!listed) return "suspended";
  if (curve.migrated && graduated?.verified) return "damm";
  if (curve.migrated || curve.raised >= curve.threshold) return "pending";
  return "dbc";
}

export function canTrade(stage: CoinStage): boolean {
  return stage === "dbc" || stage === "damm";
}

export function graduationSegments(raised: bigint, threshold: bigint, segments = 10): number {
  if (threshold <= 0n) return 0;
  if (raised >= threshold) return segments;
  return Number((raised * BigInt(segments)) / threshold);
}
