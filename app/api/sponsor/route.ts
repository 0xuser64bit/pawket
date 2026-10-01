import { NextResponse } from "next/server";
import { z } from "zod";
import { cosignAndSend, SponsorRefusal } from "@/lib/solana/sponsor";
import { actionLimit, adoptionLimit, sponsorRpc, sponsorSpent, sponsorState, type SponsorState } from "@/server/sponsor";

/**
 * The sponsor: pays the network fee, and a new pet's rent, for transactions
 * the player has already signed. What it will sign is `checkSponsorable`'s
 * call. GET says whether it is up; POST { transaction } returns { signature }.
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

  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  try {
    const { signature } = await cosignAndSend(sponsorRpc(), current.signer, body.data.transaction, (kinds) =>
      (kinds.includes("adopt") ? adoptionLimit(caller) : true) && actionLimit(caller),
    );
    sponsorSpent();
    return NextResponse.json({ signature });
  } catch (error) {
    if (error instanceof SponsorRefusal) {
      return NextResponse.json(
        { error: error.message, programError: error.programError, logs: error.logs?.slice(-12) },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "The sponsor could not send it. Nothing changed." }, { status: 502 });
  }
}
