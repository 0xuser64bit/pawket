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
  AccountRole,
  getU64Decoder,
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
import { validateCoinInstructions, type CoinIntent } from "@/lib/coins/intent";
import { COIN_LOOKUP_TABLES, type CoinCluster } from "@/lib/coins/presets";
import { deriveWalletPda } from "./pda";
import { PAWKET_DISCRIMINATORS, PAWKET_PROGRAM_ID } from "./program";
import { attributeRefusal, CONFIRMATION_TIMEOUT_MS, waitForConfirmation, type ConfirmationOutcome, type TransactionStage } from "./transactions";

export type SendRpc = Rpc<GetLatestBlockhashApi & SendTransactionApi & GetSignatureStatusesApi>;

const COMPUTE_BUDGET = "ComputeBudget111111111111111111111111111111";
const SET_COMPUTE_UNIT_PRICE = 3;
/** The fee payer pays for each signature these verify, as for the transaction's own. */
const PRECOMPILES: ReadonlySet<string> = new Set([
  "Ed25519SigVerify111111111111111111111111111",
  "KeccakSecp256k11111111111111111111111111111",
  "Secp256r1SigVerify1111111111111111111111111",
]);
/** A graduation's: the device, the owner and two position mints. */
const MAX_COIN_SIGNATURES = 4;

export interface SendOptions {
  rpc: SendRpc;
  owner: TransactionSigner;
  sponsor: Address | null;
  feePayer?: TransactionSigner;
  instructions: (signers: { owner: TransactionSigner; payer: TransactionSigner }) => Instruction[];
  onStage?: (stage: TransactionStage) => void;
  onSigned?: (receipt: Omit<SendResult, "outcome">) => void;
  cosign?: (wireBase64: string) => Promise<string>;
}

export interface SendResult {
  signature: string;
  outcome: ConfirmationOutcome;
  sponsored: boolean;
  blockhash: string;
  /** The program each instruction calls, so a refusal that comes later can be told apart. */
  programs: readonly string[];
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
  onSigned,
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

  return land(rpc, signed, onStage, sponsor !== null, onSigned);
}

export async function sendPrepared({
  rpc,
  owner,
  prepare,
  onStage,
  onSigned,
  sponsored = true,
  extraSigner,
  coinIntent,
  resolveLookup,
}: Pick<SendOptions, "rpc" | "owner" | "onStage" | "onSigned"> & {
  prepare: () => Promise<string>;
  sponsored?: boolean;
  extraSigner?: TransactionSigner;
  coinIntent?: CoinIntent;
  resolveLookup?: (table: Address) => Promise<readonly Address[]>;
}): Promise<SendResult> {
  const intent = coinIntent ? Object.freeze({ ...coinIntent }) : undefined;
  onStage?.("preparing");
  if (!sponsored && !extraSigner) throw new Error("This transaction needs its linked Pawket Wallet device. Nothing was signed or sent.");
  let prepared = decode(await prepare());
  if (extraSigner) {
    const message = getCompiledTransactionMessageDecoder().decode(prepared.messageBytes);
    if (message.version !== "legacy" && message.version !== 0) throw new Error("This transaction does not use your Pawket Wallet. Nothing was signed or sent.");
    const keys = message.staticAccounts;
    const first = message.instructions[0];
    const last = message.instructions.at(-1);
    const wallet = (await deriveWalletPda(owner.address)).address;
    const matches = (ix: typeof first | undefined, discriminator: readonly number[]) => ix && keys[ix.programAddressIndex] === PAWKET_PROGRAM_ID && discriminator.every((byte, i) => ix.data?.[i] === byte) && keys[ix.accountIndices?.[0] ?? -1] === owner.address && keys[ix.accountIndices?.[1] ?? -1] === wallet && keys[ix.accountIndices?.[2] ?? -1] === extraSigner.address;
    if (keys[0] !== extraSigner.address || !matches(first, PAWKET_DISCRIMINATORS.fundWalletSpend) || !matches(last, PAWKET_DISCRIMINATORS.settleWalletSpend)) {
      throw new Error("This transaction does not use your Pawket Wallet. Nothing was signed or sent.");
    }
    const middle = message.instructions.slice(1, -1);
    if (
      message.header.numSignerAccounts > MAX_COIN_SIGNATURES ||
      middle.some((ix) => (ix.accountIndices ?? []).some((index) => keys[index] === extraSigner.address)) ||
      middle.some((ix) => keys[ix.programAddressIndex] === COMPUTE_BUDGET && ix.data?.[0] === SET_COMPUTE_UNIT_PRICE) ||
      middle.some((ix) => PRECOMPILES.has(keys[ix.programAddressIndex]))
    ) {
      throw new Error("This transaction asks this device for more than its network fee. Nothing was signed or sent.");
    }
    if (!intent) throw new Error("This transaction has no reviewed coin intent. Nothing was signed or sent.");
    const signatures = intent.kind === "graduate" ? 4 : intent.kind === "launch" ? 3 : 2;
    if (message.header.numSignerAccounts !== signatures) throw new Error("This coin transaction asks for unexpected signatures. Nothing was signed or sent.");
    const u64 = getU64Decoder();
    if (first!.data?.length !== 24 || last!.data?.length !== 16 || !same(first!.data.slice(16), last!.data.slice(8))) {
      throw new Error("This transaction does not match your coin intent. Nothing was signed or sent.");
    }
    const loadedWritable: Address[] = [], loadedReadonly: Address[] = [];
    if (message.version === 0 && message.addressTableLookups?.length) {
      if (intent.kind !== "graduate" || message.addressTableLookups.length !== 1 || !resolveLookup) throw new Error("This coin transaction uses an unsupported lookup table. Nothing was signed or sent.");
      for (const lookup of message.addressTableLookups) {
        if (lookup.lookupTableAddress !== COIN_LOOKUP_TABLES[intent.cluster as CoinCluster]) throw new Error("This coin transaction uses an unsupported lookup table. Nothing was signed or sent.");
        const addresses = await resolveLookup(lookup.lookupTableAddress);
        for (const [indices, output] of [[lookup.writableIndexes, loadedWritable], [lookup.readonlyIndexes, loadedReadonly]] as const) {
          for (const index of indices) {
            if (!addresses[index]) throw new Error("This coin lookup table is incomplete. Nothing was signed or sent.");
            output.push(addresses[index]);
          }
        }
      }
    }
    const resolved = [...keys, ...loadedWritable, ...loadedReadonly];
    const role = (index: number): AccountRole => {
      if (index >= keys.length) return index < keys.length + loadedWritable.length ? AccountRole.WRITABLE : AccountRole.READONLY;
      const signer = index < message.header.numSignerAccounts;
      const writable = signer ? index < message.header.numSignerAccounts - message.header.numReadonlySignerAccounts : index < keys.length - message.header.numReadonlyNonSignerAccounts;
      return (Number(writable) + Number(signer) * 2) as AccountRole;
    };
    for (const bracket of [first!, last!]) {
      if (bracket.accountIndices?.length !== 5 || resolved[bracket.accountIndices[3]] !== "Sysvar1nstructions1111111111111111111111111" || resolved[bracket.accountIndices[4]] !== "11111111111111111111111111111111" || role(bracket.accountIndices[0]) !== AccountRole.WRITABLE_SIGNER || role(bracket.accountIndices[1]) !== AccountRole.WRITABLE || role(bracket.accountIndices[2]) !== AccountRole.WRITABLE_SIGNER || role(bracket.accountIndices[3]) !== AccountRole.READONLY || role(bracket.accountIndices[4]) !== AccountRole.READONLY) {
        throw new Error("This transaction does not match your coin intent. Nothing was signed or sent.");
      }
    }
    await validateCoinInstructions({ owner: owner.address, intent, funding: u64.decode(first!.data!.slice(8, 16)), instructions: middle.map((ix) => {
      if (ix.programAddressIndex >= keys.length || !resolved[ix.programAddressIndex] || (ix.accountIndices ?? []).some((index) => !resolved[index] || resolved[index] === extraSigner.address)) throw new Error("This coin transaction has an unresolved account. Nothing was signed or sent.");
      return { programAddress: resolved[ix.programAddressIndex], data: ix.data, accounts: (ix.accountIndices ?? []).map((index) => ({ address: resolved[index], role: role(index) })) };
    }) });
    const deviceSigned = await walletSigns(extraSigner, prepared);
    if (!same(deviceSigned.messageBytes, prepared.messageBytes)) throw new Error("This device changed the transaction. Nothing was sent.");
    prepared = deviceSigned;
  }
  onStage?.("signing");
  const signed = await signingDeadline(() => walletSigns(owner, prepared));
  const signedBefore = Object.entries(prepared.signatures).some(([address, signature]) => address !== owner.address && signature);
  if (signedBefore && !same(signed.messageBytes, prepared.messageBytes)) {
    throw new Error("Your wallet changed the transaction, so Pawket's signature no longer fits it. Nothing was sent.");
  }
  return land(rpc, signed, onStage, sponsored, onSigned);
}

async function land(
  rpc: SendRpc,
  signed: Transaction,
  onStage: SendOptions["onStage"],
  sponsored: boolean,
  onSigned: SendOptions["onSigned"],
): Promise<SendResult> {
  const wire = getBase64EncodedWireTransaction(signed);
  const signature = getSignatureFromTransaction(signed);
  const message = getCompiledTransactionMessageDecoder().decode(signed.messageBytes);
  const blockhash = message.lifetimeToken;
  const programs = (message.version === 1
    ? message.instructionHeaders.map((ix) => ix.programAccountIndex)
    : message.instructions.map((ix) => ix.programAddressIndex)
  ).map((index) => message.staticAccounts[index]);
  onSigned?.({ signature, blockhash, programs, sponsored });
  onStage?.("sending");
  try {
    await rpc.sendTransaction(wire, { encoding: "base64", preflightCommitment: "confirmed" })
      .send({ abortSignal: AbortSignal.timeout(CONFIRMATION_TIMEOUT_MS) });
  } catch (error) {
    if (isSolanaError(error, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE)) throw attributeRefusal(error, programs);
  }

  onStage?.("confirming");
  let outcome: ConfirmationOutcome;
  try {
    outcome = await waitForConfirmation({ rpc }, signature);
  } catch (error) {
    throw attributeRefusal(Object.assign(error instanceof Error ? error : new Error(String(error)), { signature }), programs);
  }
  onStage?.(outcome);
  return { signature, outcome, sponsored, blockhash, programs };
}
