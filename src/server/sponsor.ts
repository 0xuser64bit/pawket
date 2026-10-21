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

const MIN_FLOAT_LAMPORTS = 50_000_000n;

export type SponsorState =
  | { available: true; address: string; signer: KeyPairSigner }
  | { available: false; reason: string; address?: string };

let signer: Promise<KeyPairSigner> | null = null;
let float: { checkedAt: number; lamports: bigint } | null = null;

export function sponsorRpc() {
  return createPatientRpc(serverRpcUrl());
}

export function sponsorSpent() {
  float = null;
}

export async function sponsorState(): Promise<SponsorState> {
  if (getPublicEnv().solanaCluster === "mainnet-beta") {
    return { available: false, reason: "Pawket covers fees on devnet only." };
  }
  const keypair = getServerEnv().sponsorKeypair;
  if (!keypair) return { available: false, reason: "Fees are not covered on this deployment." };
  signer ??= Promise.resolve()
    .then(() => createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(keypair) as number[])))
    .catch((error: unknown) => {
      signer = null;
      // Name only: JSON.parse's message quotes its input — the secret key.
      console.error("[sponsor] SPONSOR_KEYPAIR is not a valid keypair:", error instanceof Error ? error.name : "unknown");
      throw new Error("The sponsor's key is not valid on this deployment.");
    });
  const sponsor = await signer;
  if (!float || Date.now() - float.checkedAt > 30_000) {
    const { value } = await sponsorRpc().getBalance(sponsor.address, { commitment: "confirmed" }).send();
    float = { checkedAt: Date.now(), lamports: value };
    noteFloat(value);
  }
  if (float.lamports < MIN_FLOAT_LAMPORTS) {
    return { available: false, reason: "Pawket's fee float is empty for now.", address: sponsor.address };
  }
  return { available: true, address: sponsor.address, signer: sponsor };
}

export async function sponsorAddress(): Promise<string | null> {
  const keypair = getServerEnv().sponsorKeypair;
  if (!keypair) return null;
  return createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(keypair) as number[]))
    .then((key) => key.address)
    .catch(() => null);
}

const HOUR = 60 * 60 * 1000;
export const actionLimit = createLimiter(240, HOUR);
const rentPerKey = createLimiter(20, HOUR);

const RENT_BUDGET_LAMPORTS = 500_000_000n;
const ONE_RENT_LAMPORTS = 3_500_000n;
const IN_FLIGHT_MS = 120_000;

let spend: { since: number; from: bigint; now: bigint; signed: number[] } | null = null;

export function noteFloat(lamports: bigint, at = Date.now()) {
  if (!spend || at - spend.since >= HOUR || lamports > spend.from) spend = { since: at, from: lamports, now: lamports, signed: [] };
  else spend.now = lamports;
}

export function mayPayRent(keys: readonly string[], at = Date.now()): boolean {
  if (!keys.every((key) => rentPerKey(key, at))) return false;
  if (!spend) return false;
  spend.signed = spend.signed.filter((signedAt) => at - signedAt < IN_FLIGHT_MS);
  const committed = spend.from - spend.now + BigInt(spend.signed.length + 1) * ONE_RENT_LAMPORTS;
  if (committed > RENT_BUDGET_LAMPORTS) return false;
  spend.signed.push(at);
  return true;
}

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
