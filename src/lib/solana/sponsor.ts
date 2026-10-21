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
  "close-wallet": [2],
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

export const RENT_KINDS: readonly SponsoredKind[] = ["adopt", "found", "join", "open-wallet", "buy", "event", "rsvp", "poll", "vote", "wave"];

const MAX_INSTRUCTIONS = 4;
const MAX_RENT_INSTRUCTIONS = 1;
const MAX_SIGNATURES = 3;

export type SponsorCheck =
  | { ok: true; kinds: SponsoredKind[]; rent: number }
  | { ok: false; reason: string };

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
    if (RENT_KINDS.includes(kind) && indices.some((index) => index === 0)) rent++;
    kinds.push(kind);
  }
  if (rent > MAX_RENT_INSTRUCTIONS) return refuse("The sponsor pays one new account's rent a transaction. Send them one at a time.");
  return { ok: true, kinds, rent };
}

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
    readonly status: 400 | 403 | 429,
  ) {
    super(message);
    this.name = "SponsorRefusal";
  }
}

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
