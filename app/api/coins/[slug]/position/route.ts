import { NextResponse } from "next/server";
import { isAddress } from "@solana/kit";
import { readPositionFees } from "@/server/coins/meteora";
import { coinError, guildOr404 } from "@/server/coins/routes";
import { actionError, caller } from "@/server/actions";
import { actionLimit } from "@/server/sponsor";

/** GET ?account=: a wallet's locked positions in a graduated coin's pool, and their unclaimed fees. */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Props) {
  const { slug } = await params;
  const account = new URL(request.url).searchParams.get("account");
  if (!account || !isAddress(account)) return actionError("That is not a wallet address.");
  if (!actionLimit(caller(request))) return actionError("Too many in a row. Try again in a while.", 429);
  const guild = await guildOr404(slug);
  if (guild instanceof Response) return guild;
  try {
    return NextResponse.json(await readPositionFees(guild, account), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return coinError(error);
  }
}
