import type { SolanaCluster } from "@/config/env";

/**
 * A guild coin: an optional coin a guild's founder can launch for the
 * guild, on Meteora's Dynamic Bonding Curve, that graduates to a DAMM v2
 * pool. Pawket offers presets, never free-form parameters: a founder picks
 * one, and every number below is the same for every coin on that preset —
 * published on the coin's page before anyone signs, and fixed on chain in
 * the preset's config account, which Pawket made once
 * (`scripts/coin-presets.mts`).
 *
 * What every preset shares, because it is what makes a coin safe to hold
 * next to a pet:
 *
 * - **A fixed supply.** One billion coins, minted at launch; nobody can
 *   mint more, and nobody holds any before the curve opens — the founder
 *   buys on the curve like everyone else.
 * - **Liquidity locked for good.** When the curve graduates, all of the
 *   liquidity it raised moves into a DAMM v2 pool and is locked there
 *   permanently, half in the founder's position and half in Pawket's. No
 *   one can withdraw it; both can only claim the fees it earns.
 * - **One fee, split three ways.** 1% of every trade: a fifth to Meteora,
 *   and the rest halved between the guild's founder and Pawket.
 * - **Nothing it touches is a pet.** A coin changes no vital, no XP, no
 *   score and no place in a guild (`src/lib/guilds/boundary.ts`).
 *
 * This module is pure and client-safe: it holds facts to show and to
 * check. Building transactions from them lives in `src/server/coins/`.
 */

export type PresetId = "gentle" | "lively";

/** Clusters a preset has a config account on. Mainnet waits for review (`docs/MAINNET.md`). */
export type CoinCluster = Extract<SolanaCluster, "devnet" | "mainnet-beta">;

export interface CoinPreset {
  id: PresetId;
  name: string;
  /** Who it suits, in one sentence a founder reads before choosing. */
  line: string;
  /** How many times the price of one coin rises from the curve's start to graduation. */
  rise: number;
  /**
   * The whole supply's value in SOL at the curve's start and at graduation.
   * Devnet's are a fifth of mainnet's, so a rehearsal graduates on devnet
   * SOL from a faucet; mainnet's clear the 10 SOL Meteora's keepers migrate at.
   */
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

/** What every coin shares, whatever its preset. Fees are basis points; shares are percent. */
export const COIN_TERMS = {
  supply: 1_000_000_000,
  decimals: 6,
  /** Of every trade on the curve and in the graduated pool. */
  feeBps: 100,
  /** Meteora's protocol share of each trading fee (`PROTOCOL_FEE_PERCENT`). */
  meteoraSharePercent: 20,
  /** The founder's share of what is left after Meteora's; Pawket keeps the rest. */
  founderSharePercent: 50,
  /** The graduated DAMM v2 pool's fee (`MigrationFeeOption.FixedBps100`). */
  graduatedFeeBps: 100,
  /** Of the graduated pool's liquidity, permanently locked in each position. */
  lockedLiquidityPercent: { founder: 50, pawket: 50 },
  /** Paid by the founder at launch, to Pawket; Meteora keeps a tenth of it. */
  launchFeeLamports: 10_000_000n,
  /** A guild launches a coin once it has this many pets: a community first, a coin second. */
  minMembers: 3,
} as const;

/** The config account each preset's coins are made from, per cluster (`scripts/coin-presets.mts`). */
export const COIN_CONFIGS: Partial<Record<CoinCluster, Record<PresetId, string>>> = {
  devnet: {
    gentle: "AyvaZmnBDpDfRDXZqXjHbcJKUq1WPLfGL4hT79miBkLJ",
    lively: "4Sj8NYMxqkXcW1Ep6Cv8n9C3zN6gKqkQXHYmaBQASEwX",
  },
};

/** The wallet that claims Pawket's share of coin fees and holds its locked positions. */
export const PAWKET_TREASURY = "SEpAw5iTAXf4j5YUsgpLD8UTKLCT6xqUAkecnvJvWfw";

export function findPreset(id: string | null | undefined): CoinPreset | undefined {
  return COIN_PRESETS.find((preset) => preset.id === id);
}

/** The config a preset uses on a cluster, or null where coins are not offered. */
export function presetConfig(cluster: SolanaCluster, id: PresetId): string | null {
  return COIN_CONFIGS[cluster as CoinCluster]?.[id] ?? null;
}

/** Which preset a config account is, or null for a config Pawket did not make. */
export function presetForConfig(cluster: SolanaCluster, config: string): PresetId | null {
  const configs = COIN_CONFIGS[cluster as CoinCluster];
  if (!configs) return null;
  return (Object.keys(configs) as PresetId[]).find((id) => configs[id] === config) ?? null;
}

/**
 * Where one trade's fee goes, in basis points of the trade. Meteora's fifth
 * is taken first; the founder and Pawket halve the rest. The three always
 * add up to the whole fee.
 */
export function feeSplitBps(): { total: number; meteora: number; founder: number; pawket: number } {
  const total = COIN_TERMS.feeBps;
  const meteora = (total * COIN_TERMS.meteoraSharePercent) / 100;
  const founder = ((total - meteora) * COIN_TERMS.founderSharePercent) / 100;
  return { total, meteora, founder, pawket: total - meteora - founder };
}

/** A coin's name: the guild's, with "Coin", inside the 32 bytes a token's name may take. */
export function coinName(guildName: string): string {
  const suffix = " Coin";
  const encoder = new TextEncoder();
  let name = guildName.trim();
  while (encoder.encode(name + suffix).length > 32) name = name.slice(0, -1).trimEnd();
  return name + suffix;
}

/** A coin's ticker: the slug's first word, upper case, 3 to 10 letters (the whole slug when the word is short). */
export function coinSymbol(slug: string): string {
  const first = slug.split("-")[0] ?? slug;
  const word = first.length >= 3 ? first : slug.replace(/-/g, "");
  return word.toUpperCase().slice(0, 10);
}
