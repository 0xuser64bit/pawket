import type { SolanaCluster } from "@/config/env";

export type PresetId = "gentle" | "lively";

export type CoinCluster = Extract<SolanaCluster, "devnet" | "mainnet-beta">;

export interface CoinPreset {
  id: PresetId;
  name: string;
  line: string;
  rise: number;
  marketCap: Record<CoinCluster, { start: number; graduation: number }>;
}

export const COIN_PRESETS: readonly CoinPreset[] = [
  {
    id: "gentle",
    name: "Gentle curve",
    line: "For a guild that wants members more than traders: the last coin before graduation costs three times the first, so arriving early buys little.",
    rise: 3,
    marketCap: { devnet: { start: 2, graduation: 6 }, "mainnet-beta": { start: 10, graduation: 30 } },
  },
  {
    id: "lively",
    name: "Lively curve",
    line: "For a guild with a crowd already: the price rises ten times along the curve, so it moves faster and swings harder.",
    rise: 10,
    marketCap: { devnet: { start: 1, graduation: 10 }, "mainnet-beta": { start: 5, graduation: 50 } },
  },
];

export const COIN_TERMS = {
  supply: 1_000_000_000,
  decimals: 6,
  feeBps: 100,
  meteoraSharePercent: 20,
  founderSharePercent: 50,
  graduatedFeeBps: 100,
  lockedLiquidityPercent: { founder: 50, pawket: 50 },
  launchFeeLamports: 10_000_000n,
  minMembers: 3,
} as const;

export const COIN_CONFIGS: Partial<Record<CoinCluster, Record<PresetId, string>>> = {
  devnet: {
    gentle: "AyvaZmnBDpDfRDXZqXjHbcJKUq1WPLfGL4hT79miBkLJ",
    lively: "4Sj8NYMxqkXcW1Ep6Cv8n9C3zN6gKqkQXHYmaBQASEwX",
  },
};

export const PAWKET_TREASURY = "SEpAw5iTAXf4j5YUsgpLD8UTKLCT6xqUAkecnvJvWfw";

export function findPreset(id: string | null | undefined): CoinPreset | undefined {
  return COIN_PRESETS.find((preset) => preset.id === id);
}

export function presetConfig(cluster: SolanaCluster, id: PresetId): string | null {
  return COIN_CONFIGS[cluster as CoinCluster]?.[id] ?? null;
}

export function presetForConfig(cluster: SolanaCluster, config: string): PresetId | null {
  const configs = COIN_CONFIGS[cluster as CoinCluster];
  if (!configs) return null;
  return (Object.keys(configs) as PresetId[]).find((id) => configs[id] === config) ?? null;
}

export function feeSplitBps(): { total: number; meteora: number; founder: number; pawket: number } {
  const total = COIN_TERMS.feeBps;
  const meteora = (total * COIN_TERMS.meteoraSharePercent) / 100;
  const founder = ((total - meteora) * COIN_TERMS.founderSharePercent) / 100;
  return { total, meteora, founder, pawket: total - meteora - founder };
}

export function coinName(guildName: string): string {
  const suffix = " Coin";
  const encoder = new TextEncoder();
  let name = guildName.trim();
  while (encoder.encode(name + suffix).length > 32) name = name.slice(0, -1).trimEnd();
  return name + suffix;
}

export function coinSymbol(slug: string): string {
  const first = slug.split("-")[0] ?? slug;
  const word = first.length >= 3 ? first : slug.replace(/-/g, "");
  return word.toUpperCase().slice(0, 10);
}
