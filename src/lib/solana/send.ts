import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  createTransactionMessage,
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  getTransactionDecoder,
  isTransactionModifyingSigner,
  isTransactionPartialSigner,
  partiallySignTransactionMessageWithSigners,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type GetLatestBlockhashApi,
  type GetSignatureStatusesApi,
  type Instruction,
  type ReadonlyUint8Array,
  type Rpc,
  type SendTransactionApi,
  type Transaction,
  type TransactionSigner,
} from "@solana/kit";
import { waitForConfirmation, type ConfirmationOutcome, type TransactionStage } from "./transactions";

/**
 * The one way the app sends: the lifecycle in `transactions.ts`, end to end.
 *
 * With a sponsor, the sponsor signs first, as fee payer: `/api/sponsor`
 * checks the transaction and returns it with its signature. Then the wallet
 * signs as the owner — a transaction that already carries a signature is
 * one a wallet signs as it is, rather than rewriting it — and the message
 * is checked to be the one that was built before anything is sent. Without
 * a sponsor, the owner pays and signs alone. Either way the transaction goes
 * to the RPC with preflight on, so one that would fail lands nothing.
 */

export type SendRpc = Rpc<GetLatestBlockhashApi & SendTransactionApi & GetSignatureStatusesApi>;

export interface SendOptions {
  rpc: SendRpc;
  owner: TransactionSigner;
  /** The sponsor's address, or null when the owner pays. */
  sponsor: Address | null;
  /** The instructions, given the owner's signer and whoever pays rent (adoption needs it). */
  instructions: (signers: { owner: TransactionSigner; payer: TransactionSigner }) => Instruction[];
  onStage?: (stage: TransactionStage) => void;
  /** Hands the unsigned transaction to the sponsor; returns it with the sponsor's signature. */
  cosign?: (wireBase64: string) => Promise<string>;
}

export interface SendResult {
  signature: string;
  outcome: ConfirmationOutcome;
  sponsored: boolean;
}

/** A failure the sponsor reported, carrying what the UI needs to say it. */
export class RelayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RelayError";
  }
}

export async function askSponsor(wireBase64: string): Promise<string> {
  const response = await fetch("/api/sponsor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transaction: wireBase64 }),
  });
  const body = (await response.json().catch(() => ({}))) as { transaction?: string; error?: string };
  if (!response.ok || !body.transaction) {
    throw new RelayError(body.error ?? "The sponsor did not sign it. Nothing was sent.", response.status);
  }
  return body.transaction;
}

const decode = (wireBase64: string) => getTransactionDecoder().decode(getBase64Encoder().encode(wireBase64));

function same(a: ReadonlyUint8Array, b: ReadonlyUint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

/** The wallet's signature on a transaction that already has the sponsor's. */
async function walletSigns(signer: TransactionSigner, transaction: Transaction): Promise<Transaction> {
  if (isTransactionModifyingSigner(signer)) {
    const [signed] = await signer.modifyAndSignTransactions([transaction as Parameters<typeof signer.modifyAndSignTransactions>[0][number]]);
    return signed;
  }
  if (isTransactionPartialSigner(signer)) {
    const [signatures] = await signer.signTransactions([transaction as Parameters<typeof signer.signTransactions>[0][number]]);
    return { ...transaction, signatures: { ...transaction.signatures, ...signatures } };
  }
  throw new Error("This wallet can only send, not sign, so Pawket cannot pay its fee. Nothing was sent.");
}

export async function sendPawket({
  rpc,
  owner,
  sponsor,
  instructions,
  onStage,
  cosign = askSponsor,
}: SendOptions): Promise<SendResult> {
  onStage?.("signing");
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const base = pipe(createTransactionMessage({ version: "legacy" }), (m) =>
    setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
  );

  let signed: Transaction;
  if (sponsor) {
    const message = pipe(
      base,
      (m) => setTransactionMessageFeePayer(sponsor, m),
      (m) => appendTransactionMessageInstructions(instructions({ owner, payer: createNoopSigner(sponsor) }), m),
    );
    const built = compileTransaction(message);
    const sponsored = decode(await cosign(getBase64EncodedWireTransaction(built)));
    if (!same(sponsored.messageBytes, built.messageBytes)) {
      throw new Error("The sponsor returned a different transaction. Nothing was sent.");
    }
    signed = await walletSigns(owner, sponsored);
    if (!same(signed.messageBytes, built.messageBytes)) {
      throw new Error("Your wallet changed the transaction, so Pawket's signature no longer fits it. Nothing was sent.");
    }
  } else {
    const message = pipe(
      base,
      (m) => setTransactionMessageFeePayerSigner(owner, m),
      (m) => appendTransactionMessageInstructions(instructions({ owner, payer: owner }), m),
    );
    signed = await partiallySignTransactionMessageWithSigners(message);
  }

  onStage?.("sending");
  const wire = getBase64EncodedWireTransaction(signed);
  const signature = getSignatureFromTransaction(signed);
  await rpc.sendTransaction(wire, { encoding: "base64", preflightCommitment: "confirmed" }).send();

  onStage?.("confirming");
  let outcome: ConfirmationOutcome;
  try {
    outcome = await waitForConfirmation({ rpc }, signature);
  } catch (error) {
    // It landed and the program refused it: the signature is the receipt.
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), { signature });
  }
  onStage?.(outcome);
  return { signature, outcome, sponsored: sponsor !== null };
}
