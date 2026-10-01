import {
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageDecoder,
  getSignatureFromTransaction,
  getTransactionDecoder,
  partiallySignTransaction,
  type Address,
  type KeyPairSigner,
  type ReadonlyUint8Array,
  type Rpc,
  type SendTransactionApi,
  type Transaction,
} from "@solana/kit";
import { PAWKET_DISCRIMINATORS, PAWKET_PROGRAM_ID } from "./program";
import { extractProgramErrorCode, toUserFacingError } from "./transactions";

/**
 * The sponsor pays network fees, and rent for a new pet, so a player can
 * adopt and care with an empty wallet. It holds a small devnet float and
 * signs only what this module allows: a transaction whose every instruction
 * is Pawket's, where the sponsor is the fee payer and appears in no
 * instruction except as `adopt_pet`'s rent payer, and which every other
 * signer has already signed. A compute-budget instruction is refused too —
 * a priority fee is the one way a caller could spend the float faster.
 */

export type SponsoredKind = "adopt" | "care" | "round" | "dress";

const KIND_OF: Record<keyof typeof PAWKET_DISCRIMINATORS, SponsoredKind> = {
  adoptPet: "adopt",
  performCareAction: "care",
  finishRound: "round",
  dress: "dress",
};

/** Where the sponsor may appear in each instruction's accounts: adopt's `payer`, nowhere else. */
const SPONSOR_SLOTS: Record<SponsoredKind, readonly number[]> = {
  adopt: [1],
  care: [],
  round: [],
  dress: [],
};

const MAX_INSTRUCTIONS = 4;

export type SponsorCheck =
  | { ok: true; kinds: SponsoredKind[] }
  | { ok: false; reason: string };

function kindOf(data: ReadonlyUint8Array | undefined): SponsoredKind | null {
  if (!data || data.length < 8) return null;
  for (const [name, discriminator] of Object.entries(PAWKET_DISCRIMINATORS)) {
    if (discriminator.every((byte, i) => data[i] === byte)) {
      return KIND_OF[name as keyof typeof PAWKET_DISCRIMINATORS];
    }
  }
  return null;
}

const refuse = (reason: string): SponsorCheck => ({ ok: false, reason });

export function checkSponsorable(
  transaction: Transaction,
  sponsor: Address,
  programId: string = PAWKET_PROGRAM_ID,
): SponsorCheck {
  let message;
  try {
    message = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
  } catch {
    return refuse("That is not a transaction.");
  }
  if (message.version !== "legacy" && message.version !== 0) {
    return refuse("Only legacy and v0 transactions are sponsored.");
  }
  if ("addressTableLookups" in message && message.addressTableLookups?.length) {
    return refuse("Lookup tables are not sponsored.");
  }
  const accounts = message.staticAccounts;
  if (accounts[0] !== sponsor) return refuse("The sponsor must be the fee payer.");
  if (message.instructions.length === 0 || message.instructions.length > MAX_INSTRUCTIONS) {
    return refuse(`Between 1 and ${MAX_INSTRUCTIONS} instructions are sponsored.`);
  }

  const kinds: SponsoredKind[] = [];
  for (const ix of message.instructions) {
    if (accounts[ix.programAddressIndex] !== programId) {
      return refuse("Only Pawket instructions are sponsored.");
    }
    const kind = kindOf(ix.data);
    if (!kind) return refuse("That is not a Pawket instruction.");
    const misplaced = (ix.accountIndices ?? []).some(
      (index, position) => index === 0 && !SPONSOR_SLOTS[kind].includes(position),
    );
    if (misplaced) return refuse("The sponsor only pays; it takes no other part.");
    kinds.push(kind);
  }

  for (const signer of accounts.slice(1, message.header.numSignerAccounts)) {
    if (!transaction.signatures[signer]) return refuse("Every other signer must sign first.");
  }
  return { ok: true, kinds };
}

/**
 * A sliding-window limiter: true when `key` may act now.
 * ponytail: one process's memory. Per-instance on a serverless host, which is
 * enough to slow a script down; a shared store if the float ever matters.
 */
export function createLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string, now: number = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
    const allowed = recent.length < limit;
    if (allowed) recent.push(now);
    if (hits.size > 10_000) hits.clear();
    hits.set(key, recent);
    return allowed;
  };
}

export class SponsorRefusal extends Error {
  constructor(
    message: string,
    /** 400 not a transaction, 403 not one the sponsor signs, 422 the chain refused it, 429 slow down. */
    readonly status: 400 | 403 | 422 | 429,
    readonly programError?: number,
    readonly logs?: readonly string[],
  ) {
    super(message);
    this.name = "SponsorRefusal";
  }
}

/**
 * The sponsor's whole job: decode, check, co-sign as fee payer, and send
 * with preflight on, so a transaction that would fail is never paid for.
 * Returns the signature; throws `SponsorRefusal` with what went wrong.
 */
export async function cosignAndSend(
  rpc: Rpc<SendTransactionApi>,
  sponsor: KeyPairSigner,
  wireBase64: string,
  limit?: (kinds: SponsoredKind[]) => boolean,
): Promise<{ signature: string; kinds: SponsoredKind[] }> {
  let transaction: Transaction;
  try {
    transaction = getTransactionDecoder().decode(getBase64Encoder().encode(wireBase64));
  } catch {
    throw new SponsorRefusal("That is not a transaction.", 400);
  }
  const check = checkSponsorable(transaction, sponsor.address);
  if (!check.ok) throw new SponsorRefusal(check.reason, 403);
  if (limit && !limit(check.kinds)) {
    throw new SponsorRefusal("Too many in a row. Nothing was sent — try again in a while.", 429);
  }

  const signed = await partiallySignTransaction([sponsor.keyPair], transaction);
  const wire = getBase64EncodedWireTransaction(signed);
  try {
    await rpc.sendTransaction(wire, { encoding: "base64", preflightCommitment: "confirmed" }).send();
  } catch (error) {
    const logs = (error as { context?: { logs?: readonly string[] } }).context?.logs;
    throw new SponsorRefusal(
      toUserFacingError(error),
      422,
      extractProgramErrorCode(error) ?? undefined,
      logs ?? undefined,
    );
  }
  return { signature: getSignatureFromTransaction(signed), kinds: check.kinds };
}
