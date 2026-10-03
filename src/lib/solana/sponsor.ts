import {
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  partiallySignTransaction,
  type Address,
  type KeyPairSigner,
  type ReadonlyUint8Array,
  type Transaction,
} from "@solana/kit";
import { PAWKET_DISCRIMINATORS, PAWKET_PROGRAM_ID } from "./program";

/**
 * The sponsor pays network fees, and rent for a new pet, so a player can
 * adopt and care with an empty wallet. It holds a small devnet float and
 * signs only what this module allows: a transaction whose every instruction
 * is Pawket's, where the sponsor is the fee payer and appears in no
 * instruction except as the rent payer of `adopt_pet`, `found_guild` and
 * `join_guild`, or as the account `leave_guild` hands that rent back to. A
 * compute-budget
 * instruction is refused too — a priority fee is the one way a caller could
 * spend the float faster.
 *
 * The sponsor signs first and the wallet second. A wallet rewrites a
 * transaction that carries no signature yet (Phantom adds priority fees and
 * guard instructions), and the sponsor would refuse the rewrite; one that
 * already carries a signature it signs as it is. The client checks the
 * message came back unchanged before sending it.
 */

export type SponsoredKind = "adopt" | "care" | "round" | "dress" | "found" | "join" | "leave";

const KIND_OF: Record<keyof typeof PAWKET_DISCRIMINATORS, SponsoredKind> = {
  adoptPet: "adopt",
  performCareAction: "care",
  finishRound: "round",
  dress: "dress",
  foundGuild: "found",
  joinGuild: "join",
  leaveGuild: "leave",
};

/**
 * Where the sponsor may appear in each instruction's accounts: the `payer`
 * of an adoption, a founding or a join (rent it pays), and `leave_guild`'s
 * `payer` (rent it gets back). Nowhere else.
 */
const SPONSOR_SLOTS: Record<SponsoredKind, readonly number[]> = {
  adopt: [1],
  care: [],
  round: [],
  dress: [],
  found: [1],
  join: [1],
  leave: [4],
};

/** The kinds that cost the sponsor rent: the scarce part of its float. */
export const RENT_KINDS: readonly SponsoredKind[] = ["adopt", "found", "join"];

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
    /** 400 not a transaction, 403 not one the sponsor signs, 429 slow down. */
    readonly status: 400 | 403 | 429,
  ) {
    super(message);
    this.name = "SponsorRefusal";
  }
}

/**
 * The sponsor's whole job: decode, check, and sign as fee payer — first,
 * before the player. Returns the transaction with the sponsor's signature
 * and every other slot as it came; throws `SponsorRefusal` with the reason.
 * A transaction that would fail is still never paid for: the client sends
 * it with preflight on, and a failed preflight lands nothing.
 */
export async function cosign(
  sponsor: KeyPairSigner,
  wireBase64: string,
  limit?: (kinds: SponsoredKind[]) => boolean,
): Promise<{ transaction: string; kinds: SponsoredKind[] }> {
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
  return { transaction: getBase64EncodedWireTransaction(signed), kinds: check.kinds };
}
