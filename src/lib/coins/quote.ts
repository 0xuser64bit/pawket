import type { SolanaCluster } from "@/config/env";
import type { PresetId } from "./presets";

export type TradeSide = "buy" | "sell";
export type TradeRoute = "curve" | "pool";

/** The math result shown on the ticket. A sealed quote adds the server's token. */
export interface CoinQuote {
  slug: string;
  mint: string;
  preset: PresetId;
  side: TradeSide;
  route: TradeRoute;
  amountIn: string;
  amountUsed: string;
  amountOut: string;
  minimumOut: string;
  fee: string;
  priceImpact: number;
  slippageBps: number;
  quotedAt: number;
}

/** What the quote endpoint returns and what the ticket signs. */
export interface SealedQuote extends CoinQuote {
  token: string;
}

/** The claims the server signs. The trade route rebuilds this from the request. */
export interface QuoteClaims {
  v: 1;
  cluster: SolanaCluster;
  slug: string;
  mint: string;
  preset: PresetId;
  route: TradeRoute;
  side: TradeSide;
  amountIn: string;
  minimumOut: string;
  slippageBps: number;
  quotedAt: number;
  expiresAt: number;
}

/** The UI stops signing at 20 seconds; the server keeps a short backstop. */
export const QUOTE_TTL_MS = 30_000;
