import "server-only";

import { NextResponse } from "next/server";
import { isAddress } from "@solana/kit";
import { getPublicEnv } from "@/config/env";
import { isValidSlug } from "@/lib/guilds/guild";
import type { ChainGuild } from "@/lib/solana/accounts";
import { readGuild } from "@/server/solana";
import { CoinRefusal } from "./meteora";
import { scrub } from "@/lib/analytics/scrub";

const COIN_HEADERS = Object.freeze({ "Cache-Control": "no-store" });

/** Coin routes are Pawket's own same-origin endpoints, not a cross-origin Actions surface. */
export function coinJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: COIN_HEADERS });
}

export function coinProblem(message: string, status = 400) {
  return coinJson({ message }, status);
}

export function coinPreflight() {
  return new Response(null, { status: 204, headers: { ...COIN_HEADERS, Allow: "GET, POST, OPTIONS" } });
}

export async function guildOr404(slug: string, signal?: AbortSignal): Promise<ChainGuild | Response> {
  if (!isValidSlug(slug)) return coinProblem("No guild has that name.", 404);
  signal?.throwIfAborted();
  const guild = await readGuild(slug, signal).catch(() => undefined);
  signal?.throwIfAborted();
  if (guild === undefined) return coinProblem("Solana did not answer. Nothing was sent — try again.", 503);
  if (!guild) return coinProblem("No guild has that name.", 404);
  return guild;
}

export async function postedFields(request: Request): Promise<{ account: string; fields: Record<string, unknown> } | null> {
  const fields = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!fields || typeof fields.account !== "string" || !isAddress(fields.account)) return null;
  return { account: fields.account, fields };
}

export function units(value: unknown): bigint | null {
  if (typeof value !== "string" || !/^\d{1,20}$/.test(value)) return null;
  const amount = BigInt(value);
  return amount <= 18_446_744_073_709_551_615n ? amount : null;
}

export function coinError(error: unknown, operation: "quote" | "trade" | "launch" | "graduate" | "claim" | "position" = "quote", startedAt = Date.now()): Response {
  if (error instanceof CoinRefusal) return coinProblem(error.message, error.status);
  console.error(JSON.stringify({
    pawket: "coin-error", operation,
    name: scrub(error instanceof Error ? error.name : typeof error, 80),
    message: error instanceof Error ? scrub(error.message) : "Unexpected failure",
    elapsedMs: Math.max(0, Date.now() - startedAt),
  }));
  return coinProblem("Solana did not answer. Nothing was sent — try again.", 503);
}

export function coinMetadataUri(slug: string): string {
  return new URL(`/api/coins/${slug}/metadata`, getPublicEnv().appUrl).toString();
}
