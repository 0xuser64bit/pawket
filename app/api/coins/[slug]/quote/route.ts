import { NextResponse } from "next/server";
import { quoteTrade, type TradeSide } from "@/server/coins/meteora";
import { coinError, guildOr404, units } from "@/server/coins/routes";
import { actionError, caller } from "@/server/actions";
import { actionLimit } from "@/server/sponsor";

/**
 * GET ?side=buy|sell&amount=<base units>&slippage=<bps>: what a trade in a
 * guild's coin gives now, and the least it will accept — read from the
 * curve or, once it has graduated, from the verified DAMM v2 pool. A quote
 * is a snapshot; the trade route takes its least as the trade's floor, so a
 * price that moved since then fails on Solana instead of filling worse.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Props) {
  const { slug } = await params;
  const query = new URL(request.url).searchParams;
  const side = query.get("side") as TradeSide | null;
  if (side !== "buy" && side !== "sell") return actionError("Choose to buy or to sell.");
  const amount = units(query.get("amount"));
  if (!amount) return actionError("Choose an amount above nothing.");
  const slippage = Number(query.get("slippage") ?? 100);
  if (!Number.isInteger(slippage) || slippage < 10 || slippage > 1000) return actionError("Slippage is 0.1% to 10%.");
  if (!actionLimit(caller(request))) return actionError("Too many in a row. Try again in a while.", 429);

  const guild = await guildOr404(slug);
  if (guild instanceof Response) return guild;
  try {
    return NextResponse.json(await quoteTrade(guild, side, amount, slippage), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return coinError(error);
  }
}
