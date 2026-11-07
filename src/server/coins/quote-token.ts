import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { isAddress } from "@solana/kit";
import type { SolanaCluster } from "@/config/env";
import { isValidSlug } from "@/lib/guilds/guild";
import { COIN_PRESETS, type PresetId } from "@/lib/coins/presets";
import { QUOTE_TTL_MS, type QuoteClaims, type TradeRoute, type TradeSide } from "@/lib/coins/quote";
import { derivedSeed } from "@/server/derive";

const MAX_TOKEN_LENGTH = 2_048;
const CLOCK_SKEW_MS = 5_000;
const U64_MAX = (1n << 64n) - 1n;
const CLUSTERS: readonly SolanaCluster[] = ["devnet", "testnet", "mainnet-beta", "localnet"];
const SIDES: readonly TradeSide[] = ["buy", "sell"];
const ROUTES: readonly TradeRoute[] = ["curve", "pool"];
const PRESETS: readonly PresetId[] = COIN_PRESETS.map((preset) => preset.id);

/**
 * The quote key is derived from the same server-only secret as coin addresses,
 * with a label of its own. A token is therefore useless on another deployment
 * and cannot be confused with a derived address.
 */
function quoteKey(): Buffer {
  const seed = derivedSeed("pawket coin quote token v1");
  if (!seed) throw new Error("Coin quotes are not available on this deployment.");
  return seed;
}

/** Fixed-order fields make the payload canonical without depending on JSON key order. */
function payloadOf(claims: QuoteClaims): string {
  return JSON.stringify([
    claims.v,
    claims.cluster,
    claims.slug,
    claims.mint,
    claims.preset,
    claims.route,
    claims.side,
    claims.amountIn,
    claims.minimumOut,
    claims.slippageBps,
    claims.quotedAt,
    claims.expiresAt,
  ]);
}

function mac(payload: string): Buffer {
  return createHmac("sha256", quoteKey()).update(payload).digest();
}

export function sealQuote(claims: QuoteClaims): string {
  const payload = payloadOf(claims);
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${mac(payload).toString("base64url")}`;
}

function validClaims(value: unknown, now: number): boolean {
  if (!Array.isArray(value) || value.length !== 12) return false;
  const [v, cluster, slug, mint, preset, route, side, amountIn, minimumOut, slippageBps, quotedAt, expiresAt] = value;
  if (v !== 1 || !CLUSTERS.includes(cluster) || !SIDES.includes(side) || !ROUTES.includes(route) || !PRESETS.includes(preset)) return false;
  if (typeof slug !== "string" || !isValidSlug(slug) || typeof mint !== "string" || !isAddress(mint)) return false;
  if (typeof amountIn !== "string" || !/^\d{1,20}$/.test(amountIn) || BigInt(amountIn) > U64_MAX) return false;
  if (typeof minimumOut !== "string" || !/^\d{1,20}$/.test(minimumOut) || BigInt(minimumOut) > U64_MAX) return false;
  if (!Number.isInteger(slippageBps) || slippageBps < 10 || slippageBps > 1_000) return false;
  if (!Number.isSafeInteger(quotedAt) || !Number.isSafeInteger(expiresAt)) return false;
  if (quotedAt > now + CLOCK_SKEW_MS || expiresAt <= quotedAt || expiresAt - quotedAt > QUOTE_TTL_MS + CLOCK_SKEW_MS) return false;
  return expiresAt > now;
}

/** Returns the claims only when the token is Pawket's, current, and well-formed. */
export function openQuote(token: unknown, now = Date.now()): QuoteClaims | null {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
  const [encoded, signature, ...rest] = token.split(".");
  if (!encoded || !signature || rest.length) return null;
  let payload: string;
  let presented: Buffer;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
    presented = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  const expected = mac(payload);
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) return null;
  let value: unknown;
  try {
    value = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!validClaims(value, now)) return null;
  const fields = value as unknown[];
  return {
    v: 1,
    cluster: fields[1] as SolanaCluster,
    slug: fields[2] as string,
    mint: fields[3] as string,
    preset: fields[4] as PresetId,
    route: fields[5] as TradeRoute,
    side: fields[6] as TradeSide,
    amountIn: fields[7] as string,
    minimumOut: fields[8] as string,
    slippageBps: fields[9] as number,
    quotedAt: fields[10] as number,
    expiresAt: fields[11] as number,
  };
}
