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
import { getServerEnv, serverRpcUrl } from "@/config/server-env";
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
  return createPatientRpc(serverRpcUrl());
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
    noteFloat(value);
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

/** What the sponsor may spend in an hour, measured by how far its balance falls. */
const RENT_BUDGET_LAMPORTS = 500_000_000n;
/** About the most one sponsored instruction's rent costs on devnet: a guild and its first member. */
const ONE_RENT_LAMPORTS = 3_500_000n;
/** How long a signed transaction can still land: a blockhash's life, with room to spare. */
const IN_FLIGHT_MS = 120_000;

/** This hour's spending, from the balance the sponsor started it with; rents signed lately count until they could no longer land. */
let spend: { since: number; from: bigint; now: bigint; signed: number[] } | null = null;

/** The sponsor's balance as just read. A refill, or a new hour, starts the count again. */
export function noteFloat(lamports: bigint, at = Date.now()) {
  if (!spend || at - spend.since >= HOUR || lamports > spend.from) spend = { since: at, from: lamports, now: lamports, signed: [] };
  else spend.now = lamports;
}

/**
 * Whether the sponsor may sign one more rent, for every key the caller goes
 * by (its address, the wallet it names). Keys are cheap to change, so the
 * whole is bounded too — by what the sponsor actually spends, read from its
 * balance, plus the rents signed in the last two minutes that may still land.
 * A request that never lands spends nothing, so asking alone cannot use the
 * budget up for everyone. Until the balance has been read, nothing is paid.
 */
export function mayPayRent(keys: readonly string[], at = Date.now()): boolean {
  if (!keys.every((key) => rentPerKey(key, at))) return false;
  if (!spend) return false;
  spend.signed = spend.signed.filter((signedAt) => at - signedAt < IN_FLIGHT_MS);
  const committed = spend.from - spend.now + BigInt(spend.signed.length + 1) * ONE_RENT_LAMPORTS;
  if (committed > RENT_BUDGET_LAMPORTS) return false;
  spend.signed.push(at);
  return true;
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
