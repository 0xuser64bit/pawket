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
import { getServerEnv, keypairBytes, serverRpcUrl } from "@/config/server-env";
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
    .then(() => createKeyPairSignerFromBytes(keypairBytes("SPONSOR_KEYPAIR", keypair)))
    .catch((error: unknown) => {
      signer = null;
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
  return Promise.resolve()
    .then(() => createKeyPairSignerFromBytes(keypairBytes("SPONSOR_KEYPAIR", keypair)))
    .then((key) => key.address, () => null);
}

const HOUR = 60 * 60 * 1000;
export const actionLimit = createLimiter(240, HOUR);
const rentPerKey = createLimiter(20, HOUR);

const HOURLY_BUDGET_LAMPORTS = 500_000_000n;
const ONE_RENT_LAMPORTS = 4_500_000n;
const ONE_FEE_LAMPORTS = 15_000n;
const IN_FLIGHT_MS = 120_000;

let spend: { since: number; from: bigint; now: bigint; signed: { at: number; lamports: bigint }[] } | null = null;

export function noteFloat(lamports: bigint, at = Date.now()) {
  if (!spend || at - spend.since >= HOUR || lamports > spend.from) spend = { since: at, from: lamports, now: lamports, signed: [] };
  else spend.now = lamports;
}

function withinBudget(lamports: bigint, at: number): boolean {
  if (!spend) return false;
  spend.signed = spend.signed.filter((signed) => at - signed.at < IN_FLIGHT_MS);
  const inFlight = spend.signed.reduce((sum, signed) => sum + signed.lamports, 0n);
  return spend.from - spend.now + inFlight + lamports <= HOURLY_BUDGET_LAMPORTS;
}

export function mayPayFee(at = Date.now()): boolean {
  if (!withinBudget(ONE_FEE_LAMPORTS, at)) return false;
  spend!.signed.push({ at, lamports: ONE_FEE_LAMPORTS });
  return true;
}

export function mayPayRent(keys: readonly string[], at = Date.now()): boolean {
  const lamports = ONE_RENT_LAMPORTS + ONE_FEE_LAMPORTS;
  if (!withinBudget(lamports, at) || !rentPerKey(keys, at)) return false;
  spend!.signed.push({ at, lamports });
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
