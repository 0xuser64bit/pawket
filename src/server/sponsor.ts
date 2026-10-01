import "server-only";

import { createKeyPairSignerFromBytes, createSolanaRpc, type KeyPairSigner } from "@solana/kit";
import { getPublicEnv } from "@/config/env";
import { getServerEnv } from "@/config/server-env";

/**
 * Whether the sponsor is up, and its signer when it is. One answer for the
 * API and for any page that says "Pawket pays the fee", so the sentence is
 * never on screen while the float is empty.
 */

/** Below this the sponsor stops and players pay their own fees. */
const MIN_FLOAT_LAMPORTS = 50_000_000n;

export type SponsorState =
  | { available: true; address: string; signer: KeyPairSigner }
  | { available: false; reason: string };

let signer: Promise<KeyPairSigner> | null = null;
let float: { checkedAt: number; lamports: bigint } | null = null;

export function sponsorRpc() {
  return createSolanaRpc(getServerEnv().solanaRpcUrl ?? getPublicEnv().solanaRpcUrl);
}

/** Forget the cached float, after the sponsor has spent some of it. */
export function sponsorSpent() {
  float = null;
}

export async function sponsorState(): Promise<SponsorState> {
  if (getPublicEnv().solanaCluster === "mainnet-beta") {
    return { available: false, reason: "Pawket covers fees on devnet only." };
  }
  const keypair = getServerEnv().sponsorKeypair;
  if (!keypair) return { available: false, reason: "Fees are not covered on this deployment." };
  signer ??= createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(keypair) as number[]));
  const sponsor = await signer;
  if (!float || Date.now() - float.checkedAt > 30_000) {
    const { value } = await sponsorRpc().getBalance(sponsor.address, { commitment: "confirmed" }).send();
    float = { checkedAt: Date.now(), lamports: value };
  }
  if (float.lamports < MIN_FLOAT_LAMPORTS) {
    return { available: false, reason: "Pawket's fee float is empty for now." };
  }
  return { available: true, address: sponsor.address, signer: sponsor };
}
