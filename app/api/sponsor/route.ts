import { NextResponse } from "next/server";
import { z } from "zod";
import { cosign, SponsorRefusal } from "@/lib/solana/sponsor";
import { caller as callerOf } from "@/server/actions";
import { actionLimit, mayPayRent, sponsorSpent, sponsorState, type SponsorState } from "@/server/sponsor";

/**
 * The sponsor: pays the network fee, and the rent of a new pet, a new guild
 * or a pet's place in one. It signs first,
 * as fee payer, and hands the transaction back for the player's wallet to
 * sign and send (see `src/lib/solana/sponsor.ts` for why that order). What
 * it will sign is `checkSponsorable`'s call. GET says whether it is up; POST
 * { transaction } returns { transaction } with the sponsor's signature.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ transaction: z.string().min(1).max(2_000) });

export async function GET() {
  try {
    const current = await sponsorState();
    return NextResponse.json(
      current.available ? { available: true, address: current.address } : current,
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ available: false, reason: "The sponsor cannot reach the network." });
  }
}

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Send { transaction } as base64. Nothing was sent." }, { status: 400 });
  }
  let current: SponsorState;
  try {
    current = await sponsorState();
  } catch {
    return NextResponse.json({ error: "The sponsor cannot reach the network. Nothing was sent." }, { status: 503 });
  }
  if (!current.available) return NextResponse.json({ error: current.reason }, { status: 503 });

  const caller = callerOf(request);
  try {
    const { transaction } = await cosign(current.signer, body.data.transaction, ({ rent }) =>
      actionLimit(caller) && (rent === 0 || mayPayRent([caller])),
    );
    sponsorSpent();
    return NextResponse.json({ transaction });
  } catch (error) {
    if (error instanceof SponsorRefusal) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "The sponsor could not sign it. Nothing changed." }, { status: 502 });
  }
}
