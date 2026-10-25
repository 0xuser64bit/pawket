import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  createTransactionMessage,
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageDecoder,
  getSignatureFromTransaction,
  getSignersFromTransactionMessage,
  getTransactionDecoder,
  isTransactionModifyingSigner,
  isTransactionPartialSigner,
  isSolanaError,
  partiallySignTransactionMessageWithSigners,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
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
import { deriveWalletPda } from "./pda";
import { PAWKET_DISCRIMINATORS, PAWKET_PROGRAM_ID } from "./program";
import { CONFIRMATION_TIMEOUT_MS, waitForConfirmation, type ConfirmationOutcome, type TransactionStage } from "./transactions";

export type SendRpc = Rpc<GetLatestBlockhashApi & SendTransactionApi & GetSignatureStatusesApi>;

export interface SendOptions {
  rpc: SendRpc;
  owner: TransactionSigner;
  sponsor: Address | null;
  feePayer?: TransactionSigner;
  instructions: (signers: { owner: TransactionSigner; payer: TransactionSigner }) => Instruction[];
  onStage?: (stage: TransactionStage) => void;
  cosign?: (wireBase64: string) => Promise<string>;
}

export interface SendResult {
  signature: string;
  outcome: ConfirmationOutcome;
  sponsored: boolean;
  blockhash: string;
}

export class RelayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RelayError";
  }
}

async function askSponsor(wireBase64: string): Promise<string> {
  const response = await fetch("/api/sponsor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transaction: wireBase64 }),
    signal: AbortSignal.timeout(CONFIRMATION_TIMEOUT_MS),
  });
  const body = (await response.json().catch(() => ({}))) as { transaction?: string; error?: string };
  if (!response.ok || !body.transaction) {
    throw new RelayError(body.error ?? "The sponsor did not sign it. Nothing was sent.", response.status);
  }
  return body.transaction;
}

const decode = (wireBase64: string) => getTransactionDecoder().decode(getBase64Encoder().encode(wireBase64));

/**
 * Outlasts the patched Mobile Wallet Adapter's own limits (a minute to open, 85 s to answer),
 * so a retry never opens a second wallet session over the first.
 */
async function signingDeadline<T>(sign: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([sign(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Your wallet did not finish signing in time. Nothing was sent.")), 150_000);
    })]);
  } finally {
    clearTimeout(timer!);
  }
}

function same(a: ReadonlyUint8Array, b: ReadonlyUint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

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
  feePayer,
  instructions,
  onStage,
  cosign = askSponsor,
}: SendOptions): Promise<SendResult> {
  onStage?.("preparing");
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send({ abortSignal: AbortSignal.timeout(CONFIRMATION_TIMEOUT_MS) });
  const base = pipe(createTransactionMessage({ version: "legacy" }), (m) =>
    setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
  );

  let signed: Transaction;
  if (sponsor || feePayer) {
    const payerAddress = sponsor ?? feePayer!.address;
    const message = pipe(
      base,
      (m) => setTransactionMessageFeePayer(payerAddress, m),
      (m) => appendTransactionMessageInstructions(instructions({ owner, payer: createNoopSigner(payerAddress) }), m),
    );
    const built = compileTransaction(message);
    const sponsored = sponsor ? decode(await cosign(getBase64EncodedWireTransaction(built))) : await walletSigns(feePayer!, built);
    if (!same(sponsored.messageBytes, built.messageBytes)) {
      throw new Error("The sponsor returned a different transaction. Nothing was sent.");
    }
    onStage?.("signing");
    signed = await signingDeadline(() => walletSigns(owner, sponsored));
    if (!same(signed.messageBytes, built.messageBytes)) {
      throw new Error("Your wallet changed the transaction, so Pawket's signature no longer fits it. Nothing was sent.");
    }
    for (const other of getSignersFromTransactionMessage(message)) {
      if (other.address === owner.address || other.address === payerAddress || !isTransactionPartialSigner(other)) continue;
      const [signatures] = await other.signTransactions([signed as Parameters<typeof other.signTransactions>[0][number]]);
      signed = { ...signed, signatures: { ...signed.signatures, ...signatures } };
    }
  } else {
    const message = pipe(
      base,
      (m) => setTransactionMessageFeePayerSigner(owner, m),
      (m) => appendTransactionMessageInstructions(instructions({ owner, payer: owner }), m),
    );
    onStage?.("signing");
    signed = await signingDeadline(() => partiallySignTransactionMessageWithSigners(message));
  }

  return land(rpc, signed, onStage, sponsor !== null);
}

export async function sendPrepared({
  rpc,
  owner,
  prepare,
  onStage,
  sponsored = true,
  extraSigner,
}: Pick<SendOptions, "rpc" | "owner" | "onStage"> & {
  prepare: () => Promise<string>;
  sponsored?: boolean;
  extraSigner?: TransactionSigner;
}): Promise<SendResult> {
  onStage?.("preparing");
  let prepared = decode(await prepare());
  if (extraSigner) {
    const message = getCompiledTransactionMessageDecoder().decode(prepared.messageBytes);
    if (message.version !== "legacy") throw new Error("This transaction does not use your Pawket Wallet. Nothing was signed or sent.");
    const keys = message.staticAccounts;
    const first = message.instructions[0];
    const last = message.instructions.at(-1);
    const wallet = (await deriveWalletPda(owner.address)).address;
    const matches = (ix: typeof first | undefined, discriminator: readonly number[]) => ix && keys[ix.programAddressIndex] === PAWKET_PROGRAM_ID && discriminator.every((byte, i) => ix.data?.[i] === byte) && keys[ix.accountIndices?.[0] ?? -1] === owner.address && keys[ix.accountIndices?.[1] ?? -1] === wallet && keys[ix.accountIndices?.[2] ?? -1] === extraSigner.address;
    if (keys[0] !== extraSigner.address || !matches(first, PAWKET_DISCRIMINATORS.fundWalletSpend) || !matches(last, PAWKET_DISCRIMINATORS.settleWalletSpend)) {
      throw new Error("This transaction does not use your Pawket Wallet. Nothing was signed or sent.");
    }
    prepared = await walletSigns(extraSigner, prepared);
  }
  onStage?.("signing");
  const signed = await signingDeadline(() => walletSigns(owner, prepared));
  const signedBefore = Object.entries(prepared.signatures).some(([address, signature]) => address !== owner.address && signature);
  if (signedBefore && !same(signed.messageBytes, prepared.messageBytes)) {
    throw new Error("Your wallet changed the transaction, so Pawket's signature no longer fits it. Nothing was sent.");
  }
  return land(rpc, signed, onStage, sponsored);
}

async function land(
  rpc: SendRpc,
  signed: Transaction,
  onStage: SendOptions["onStage"],
  sponsored: boolean,
): Promise<SendResult> {
  onStage?.("sending");
  const wire = getBase64EncodedWireTransaction(signed);
  const signature = getSignatureFromTransaction(signed);
  const blockhash = getCompiledTransactionMessageDecoder().decode(signed.messageBytes).lifetimeToken;
  try {
    await rpc.sendTransaction(wire, { encoding: "base64", preflightCommitment: "confirmed" })
      .send({ abortSignal: AbortSignal.timeout(CONFIRMATION_TIMEOUT_MS) });
  } catch (error) {
    if (isSolanaError(error, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE)) throw error;
  }

  onStage?.("confirming");
  let outcome: ConfirmationOutcome;
  try {
    outcome = await waitForConfirmation({ rpc }, signature);
  } catch (error) {
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), { signature });
  }
  onStage?.(outcome);
  return { signature, outcome, sponsored, blockhash };
}
