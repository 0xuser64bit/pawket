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
import { DEVICE_VARIANTS, PAWKET_DISCRIMINATORS, PAWKET_PROGRAM_ID, type PawketInstructionName } from "./program";

/**
 * The sponsor pays network fees, and rent for a new pet, so a player can
 * adopt and care with an empty wallet. It holds a small devnet float and
 * signs only what this module allows: a transaction whose every instruction
 * is Pawket's, where the sponsor is the fee payer and appears in no
 * instruction except as the rent payer of `adopt_pet`, `found_guild`,
 * `join_guild`, `open_wallet`, `buy` (the closet, never the price),
 * `create_event`, `rsvp`, `create_poll`, `vote` and `wave`, or as the account
 * `leave_guild` hands that rent back to. A compute-budget instruction is
 * refused too, and more signatures than any Pawket transaction needs: a
 * priority fee and a padding of signers are the ways a caller could spend
 * the float faster.
 *
 * A linked device's action (`*_by_device`) is sponsored as its owner's would
 * be: the same kind, with the device and the Pawket Wallet where the owner
 * was, so the sponsor's one allowed place is one account later. The owner's
 * daily limit on the device bounds how often. It pays the fee for looking
 * after a Pawket Wallet too, and its rent — which `close_wallet` hands back
 * to whoever paid it (the sponsor may stand there to take it back), so
 * opening and closing cannot drain the float.
 *
 * The sponsor signs first and the wallet second. A wallet rewrites a
 * transaction that carries no signature yet (Phantom adds priority fees and
 * guard instructions), and the sponsor would refuse the rewrite; one that
 * already carries a signature it signs as it is. The client checks the
 * message came back unchanged before sending it.
 */

export type SponsoredKind =
  | "adopt"
  | "care"
  | "round"
  | "dress"
  | "found"
  | "join"
  | "leave"
  | "open-wallet"
  | "deposit"
  | "withdraw"
  | "link"
  | "unlink"
  | "close-wallet"
  | "buy"
  | "fund"
  | "settle"
  | "dress-owned"
  | "event"
  | "rsvp"
  | "check-in"
  | "poll"
  | "vote"
  | "wave";

type DeviceName = (typeof DEVICE_VARIANTS)[keyof typeof DEVICE_VARIANTS];

/** Each instruction's kind. A device's twin is its owner instruction's kind (`kindOf`). */
export const KIND_OF: Record<Exclude<PawketInstructionName, DeviceName>, SponsoredKind> = {
  adoptPet: "adopt",
  performCareAction: "care",
  finishRound: "round",
  dress: "dress",
  foundGuild: "found",
  joinGuild: "join",
  leaveGuild: "leave",
  openWallet: "open-wallet",
  deposit: "deposit",
  withdraw: "withdraw",
  linkDevice: "link",
  unlinkDevice: "unlink",
  closeWallet: "close-wallet",
  buy: "buy",
  buyWithWallet: "buy",
  fundWalletSpend: "fund",
  settleWalletSpend: "settle",
  dressOwned: "dress-owned",
  createEvent: "event",
  rsvp: "rsvp",
  checkIn: "check-in",
  createPoll: "poll",
  vote: "vote",
  wave: "wave",
};

const OWNER_OF = new Map<string, keyof typeof KIND_OF>(
  Object.entries(DEVICE_VARIANTS).map(([owner, device]) => [device, owner as keyof typeof KIND_OF]),
);

/**
 * Where the sponsor may appear in each instruction's accounts: the account
 * the program calls `payer` (rent it pays, or `leave_guild`'s rent it gets
 * back) or `rent_payer` (`close_wallet`'s). Nowhere else — `sponsor.test.ts`
 * holds every index to that name in the IDL.
 */
export const SPONSOR_SLOTS: Record<SponsoredKind, readonly number[]> = {
  adopt: [1],
  care: [],
  round: [],
  dress: [],
  found: [1],
  join: [1],
  leave: [4],
  "open-wallet": [1],
  deposit: [],
  withdraw: [],
  link: [],
  unlink: [],
  // The rent it paid for the wallet, back to it.
  "close-wallet": [2],
  // The payer of each: the closet's, the event's, the RSVP's, the poll's, the ballot's and the guestbook's rent.
  buy: [1],
  fund: [],
  settle: [],
  "dress-owned": [],
  event: [1],
  rsvp: [1],
  "check-in": [],
  poll: [1],
  vote: [1],
  wave: [1],
};

/** The kinds that cost the sponsor rent: the scarce part of its float. */
export const RENT_KINDS: readonly SponsoredKind[] = ["adopt", "found", "join", "open-wallet", "buy", "event", "rsvp", "poll", "vote", "wave"];

const MAX_INSTRUCTIONS = 4;
/**
 * Rent is the scarce part of the float, and a limit is charged per transaction: so at most one
 * instruction a transaction may have the sponsor pay rent. No app action needs more — the
 * largest, a wallet's setup, opens one account.
 */
const MAX_RENT_INSTRUCTIONS = 1;
/**
 * Each signature is a fee the sponsor pays, and Anchor takes extra signer accounts without a
 * word: so no more than a Pawket transaction needs — the sponsor, the owner, a device being linked.
 */
const MAX_SIGNATURES = 3;

export type SponsorCheck =
  /** `rent`: how many of the instructions have the sponsor pay an account's rent (0 or 1). */
  | { ok: true; kinds: SponsoredKind[]; rent: number }
  | { ok: false; reason: string };

/**
 * The instruction's kind, and how many accounts later than its owner's the
 * sponsor's place is: 1 for a device's twin, which has the device and the
 * Pawket Wallet where the owner was. Null for none of Pawket's.
 */
function kindOf(data: ReadonlyUint8Array | undefined): { kind: SponsoredKind; shift: number } | null {
  if (!data || data.length < 8) return null;
  for (const [name, discriminator] of Object.entries(PAWKET_DISCRIMINATORS)) {
    if (!discriminator.every((byte, i) => data[i] === byte)) continue;
    const owner = OWNER_OF.get(name);
    return owner ? { kind: KIND_OF[owner], shift: 1 } : { kind: KIND_OF[name as keyof typeof KIND_OF], shift: 0 };
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
  if (message.header.numSignerAccounts > MAX_SIGNATURES) {
    return refuse(`At most ${MAX_SIGNATURES} signatures are sponsored.`);
  }
  if (message.instructions.length === 0 || message.instructions.length > MAX_INSTRUCTIONS) {
    return refuse(`Between 1 and ${MAX_INSTRUCTIONS} instructions are sponsored.`);
  }

  const kinds: SponsoredKind[] = [];
  let rent = 0;
  for (const ix of message.instructions) {
    if (accounts[ix.programAddressIndex] !== programId) {
      return refuse("Only Pawket instructions are sponsored.");
    }
    const found = kindOf(ix.data);
    if (!found) return refuse("That is not a Pawket instruction.");
    const { kind, shift } = found;
    if (kind === "fund" || kind === "settle") return refuse("Coin spending is never sponsored.");
    const indices = ix.accountIndices ?? [];
    const misplaced = indices.some((index, position) => index === 0 && !SPONSOR_SLOTS[kind].includes(position - shift));
    if (misplaced) return refuse("The sponsor only pays; it takes no other part.");
    // In a rent kind's payer slot the sponsor pays; in leave's and close's it is paid back.
    if (RENT_KINDS.includes(kind) && indices.some((index) => index === 0)) rent++;
    kinds.push(kind);
  }
  if (rent > MAX_RENT_INSTRUCTIONS) return refuse("The sponsor pays one new account's rent a transaction. Send them one at a time.");
  return { ok: true, kinds, rent };
}

/**
 * A sliding-window limiter: true when `key` may act now.
 * shortcut: Limits apply per instance; use a shared store before mainnet.
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
 * Pawket's client sends with preflight on, so its own failures land nothing;
 * a caller who skips preflight can land one that fails, and the float pays
 * its fee, inside the same limits as any other.
 */
export async function cosign(
  sponsor: KeyPairSigner,
  wireBase64: string,
  limit?: (check: { kinds: SponsoredKind[]; rent: number }) => boolean,
): Promise<{ transaction: string; kinds: SponsoredKind[] }> {
  let transaction: Transaction;
  try {
    transaction = getTransactionDecoder().decode(getBase64Encoder().encode(wireBase64));
  } catch {
    throw new SponsorRefusal("That is not a transaction.", 400);
  }
  const check = checkSponsorable(transaction, sponsor.address);
  if (!check.ok) throw new SponsorRefusal(check.reason, 403);
  if (limit && !limit(check)) {
    throw new SponsorRefusal("Too many in a row. Nothing was sent — try again in a while.", 429);
  }
  const signed = await partiallySignTransaction([sponsor.keyPair], transaction);
  return { transaction: getBase64EncodedWireTransaction(signed), kinds: check.kinds };
}
