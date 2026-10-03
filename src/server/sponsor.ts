import "server-only";

import {
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createNoopSigner,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  partiallySignTransactionMessageWithSigners,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Instruction,
  type KeyPairSigner,
  type Transaction,
  type TransactionSigner,
} from "@solana/kit";
import { getPublicEnv } from "@/config/env";
import { getServerEnv } from "@/config/server-env";
import { createPatientRpc } from "@/lib/solana/rpc";
import { checkSponsorable, createLimiter } from "@/lib/solana/sponsor";

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
  return createPatientRpc(getServerEnv().solanaRpcUrl ?? getPublicEnv().solanaRpcUrl);
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

const HOUR = 60 * 60 * 1000;
/** Shared by every route that sponsors. */
export const actionLimit = createLimiter(240, HOUR);
// Rent is the real cost — a new pet, a keepsake — so it is the scarce one. A
// venue shares one IP between many players, so the per-key limit is generous.
const rentPerKey = createLimiter(20, HOUR);
const allRent = createLimiter(120, HOUR);

/**
 * Whether the sponsor may pay one more rent, for this caller key. Keys are
 * cheap to change (a new keypair, a proxy's shared IP), so a cap on all of
 * it bounds the worst case: 120 an hour is under 0.5 SOL.
 */
export function mayPayRent(key: string): boolean {
  return rentPerKey(key) && allRent("all");
}

/** A transaction the sponsor builds and signs first, as fee payer, with any signer the instructions carry. */
export async function signedBySponsor(sponsor: KeyPairSigner, instructions: Instruction[]): Promise<Transaction> {
  const { value: blockhash } = await sponsorRpc().getLatestBlockhash({ commitment: "confirmed" }).send();
  const message = pipe(
    createTransactionMessage({ version: "legacy" }),
    (m) => setTransactionMessageFeePayerSigner(sponsor, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );
  return partiallySignTransactionMessageWithSigners(message);
}

/**
 * Pawket instructions for a player who signs after — a Solana Action. The
 * player is a no-op stand-in here; the same policy holds as for one the
 * player built.
 */
export async function sponsoredForPlayer(
  sponsor: KeyPairSigner,
  player: Address,
  instructions: (signers: { owner: TransactionSigner; payer: TransactionSigner }) => Instruction[],
): Promise<string> {
  const transaction = await signedBySponsor(sponsor, instructions({ owner: createNoopSigner(player), payer: sponsor }));
  const check = checkSponsorable(transaction, sponsor.address);
  if (!check.ok) throw new Error(check.reason);
  return getBase64EncodedWireTransaction(transaction);
}
