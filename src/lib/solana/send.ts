import {
  appendTransactionMessageInstructions,
  createNoopSigner,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  partiallySignTransactionMessageWithSigners,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type GetLatestBlockhashApi,
  type GetSignatureStatusesApi,
  type Instruction,
  type Rpc,
  type SendTransactionApi,
  type TransactionSigner,
} from "@solana/kit";
import { waitForConfirmation, type ConfirmationOutcome, type TransactionStage } from "./transactions";

/**
 * The one way the app sends: the lifecycle in `transactions.ts`, end to end.
 * The wallet signs as the owner. With a sponsor, the sponsor is the fee
 * payer and its stand-in signs nothing here — `/api/sponsor` checks the
 * transaction, adds its signature and sends it. Without one, the owner pays
 * and the transaction goes straight to the RPC. Preflight is on either way.
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
  /** Hands the owner-signed transaction to the sponsor; returns the signature. */
  relay?: (wireBase64: string) => Promise<string>;
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
    readonly programError?: number,
  ) {
    super(message);
    this.name = "RelayError";
  }
}

export async function relayToSponsor(wireBase64: string): Promise<string> {
  const response = await fetch("/api/sponsor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transaction: wireBase64 }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    signature?: string;
    error?: string;
    programError?: number;
  };
  if (!response.ok || !body.signature) {
    throw new RelayError(body.error ?? "The sponsor did not send it. Nothing changed.", response.status, body.programError);
  }
  return body.signature;
}

export async function sendPawket({
  rpc,
  owner,
  sponsor,
  instructions,
  onStage,
  relay = relayToSponsor,
}: SendOptions): Promise<SendResult> {
  const payer = sponsor ? createNoopSigner(sponsor) : owner;

  onStage?.("signing");
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const message = pipe(
    createTransactionMessage({ version: "legacy" }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(instructions({ owner, payer }), m),
  );
  const signed = await partiallySignTransactionMessageWithSigners(message);
  const wire = getBase64EncodedWireTransaction(signed);

  onStage?.("sending");
  const signature = sponsor
    ? await relay(wire)
    : await rpc.sendTransaction(wire, { encoding: "base64", preflightCommitment: "confirmed" }).send();

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
