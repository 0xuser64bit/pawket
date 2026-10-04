import "server-only";

import { isAddress } from "@solana/kit";
import { getPublicEnv } from "@/config/env";
import { isValidSlug } from "@/lib/guilds/guild";
import type { ChainGuild } from "@/lib/solana/accounts";
import { actionError } from "@/server/actions";
import { readGuild } from "@/server/solana";
import { CoinRefusal } from "./meteora";

/**
 * What every coin route shares: the guild it is about, the body it was
 * sent, the amounts in it, and one sentence for whatever went wrong.
 */

/** The guild at `slug`, or a refusal to answer with. */
export async function guildOr404(slug: string): Promise<ChainGuild | Response> {
  if (!isValidSlug(slug)) return actionError("No guild has that name.", 404);
  const guild = await readGuild(slug).catch(() => undefined);
  if (guild === undefined) return actionError("Solana did not answer. Nothing was sent — try again.", 503);
  if (!guild) return actionError("No guild has that name.", 404);
  return guild;
}

/** The JSON a route was posted, with the wallet that will sign; null when it is not that. */
export async function postedFields(request: Request): Promise<{ account: string; fields: Record<string, unknown> } | null> {
  const fields = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!fields || typeof fields.account !== "string" || !isAddress(fields.account)) return null;
  return { account: fields.account, fields };
}

/** A whole number of base units (lamports, or a coin's smallest units), as sent; null for anything else. */
export function units(value: unknown): bigint | null {
  if (typeof value !== "string" || !/^\d{1,20}$/.test(value)) return null;
  const amount = BigInt(value);
  return amount <= 18_446_744_073_709_551_615n ? amount : null;
}

/** A refusal the coin module raised, in its own words; anything else, as Solana not answering. */
export function coinError(error: unknown): Response {
  if (error instanceof CoinRefusal) return actionError(error.message, error.status);
  console.error("coin route failed", error);
  return actionError("Solana did not answer. Nothing was sent — try again.", 503);
}

/** Where a coin's token metadata lives, on the canonical host so it outlives any one deployment. */
export function coinMetadataUri(slug: string): string {
  return new URL(`/api/coins/${slug}/metadata`, getPublicEnv().appUrl).toString();
}
