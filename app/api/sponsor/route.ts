import { NextResponse } from "next/server";
import { z } from "zod";
import { scrub } from "@/lib/analytics/scrub";
import { cosign, SponsorRefusal } from "@/lib/solana/sponsor";
import { caller as callerOf } from "@/server/actions";
import { actionLimit, mayPayRent, sponsorAddress, sponsorSpent, sponsorState, type SponsorState } from "@/server/sponsor";

export const runtime = "nodejs";

function logged(where: string, error: unknown) {
  console.error(JSON.stringify({ pawket: "sponsor", where, name: error instanceof Error ? error.name : typeof error, message: error instanceof Error ? scrub(error.message) : undefined }));
}
export const dynamic = "force-dynamic";

const bodySchema = z.object({ transaction: z.string().min(1).max(2_000) });

export async function GET() {
  try {
    const current = await sponsorState();
    return NextResponse.json(
      current.available ? { available: true, address: current.address } : current,
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    logged("status", error);
    const address = await sponsorAddress();
    return NextResponse.json(
      { available: false, reason: "The sponsor cannot reach the network.", ...(address ? { address } : {}) },
      { headers: { "cache-control": "no-store" } },
    );
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
  } catch (error) {
    logged("state", error);
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
    logged("cosign", error);
    return NextResponse.json({ error: "The sponsor could not sign it. Nothing changed." }, { status: 502 });
  }
}
