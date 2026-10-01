import { NextResponse } from "next/server";
import { createKeyPairSignerFromBytes, createSolanaRpc, type KeyPairSigner } from "@solana/kit";
import { z } from "zod";
import { getPublicEnv } from "@/config/env";
import { getServerEnv } from "@/config/server-env";
import { cosignAndSend, createLimiter, SponsorRefusal } from "@/lib/solana/sponsor";

/**
 * The sponsor: pays the network fee, and a new pet's rent, for transactions
 * the player has already signed. What it will sign is `checkSponsorable`'s
 * call. GET says whether it is up; POST { transaction } returns { signature }.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Below this the sponsor stops and players pay their own fees. */
const MIN_FLOAT_LAMPORTS = 50_000_000n;
const HOUR = 60 * 60 * 1000;
// Rent is the real cost, so adoption is the scarce one.
const adoptions = createLimiter(3, HOUR);
const actions = createLimiter(240, HOUR);

const bodySchema = z.object({ transaction: z.string().min(1).max(2_000) });

let signer: Promise<KeyPairSigner> | null = null;
let float: { checkedAt: number; lamports: bigint } | null = null;

function rpc() {
  return createSolanaRpc(getServerEnv().solanaRpcUrl ?? getPublicEnv().solanaRpcUrl);
}

type State = { available: true; address: string; signer: KeyPairSigner } | { available: false; reason: string };

async function state(): Promise<State> {
  if (getPublicEnv().solanaCluster === "mainnet-beta") {
    return { available: false, reason: "Pawket covers fees on devnet only." };
  }
  const keypair = getServerEnv().sponsorKeypair;
  if (!keypair) return { available: false, reason: "Fees are not covered on this deployment." };
  signer ??= createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(keypair) as number[]));
  const sponsor = await signer;
  if (!float || Date.now() - float.checkedAt > 30_000) {
    const { value } = await rpc().getBalance(sponsor.address, { commitment: "confirmed" }).send();
    float = { checkedAt: Date.now(), lamports: value };
  }
  if (float.lamports < MIN_FLOAT_LAMPORTS) {
    return { available: false, reason: "Pawket's fee float is empty for now." };
  }
  return { available: true, address: sponsor.address, signer: sponsor };
}

export async function GET() {
  try {
    const current = await state();
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
  let current: State;
  try {
    current = await state();
  } catch {
    return NextResponse.json({ error: "The sponsor cannot reach the network. Nothing was sent." }, { status: 503 });
  }
  if (!current.available) return NextResponse.json({ error: current.reason }, { status: 503 });

  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  try {
    const { signature } = await cosignAndSend(rpc(), current.signer, body.data.transaction, (kinds) =>
      (kinds.includes("adopt") ? adoptions(caller) : true) && actions(caller),
    );
    float = null;
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
