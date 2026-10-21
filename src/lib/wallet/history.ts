import {
  getBase58Encoder,
  type Address,
  type GetSignaturesForAddressApi,
  type GetTransactionApi,
  type Rpc,
  type Signature,
} from "@solana/kit";
import { MPL_CORE_PROGRAM_ID, PAWKET_COLLECTION } from "@/lib/solana/core";
import { WEARABLES } from "@/lib/closet/catalog";
import { CareActionType } from "@/lib/game/enums";
import { CARE_ACTION_VARIANTS, PAWKET_DISCRIMINATORS, PAWKET_PROGRAM_ID } from "@/lib/solana/program";

type WalletEntryKind =
  | "open"
  | "deposit"
  | "withdraw"
  | "link"
  | "unlink"
  | "close"
  | "care"
  | "round"
  | "dress"
  | "adopt"
  | "found"
  | "join"
  | "leave"
  | "event"
  | "rsvp"
  | "check-in"
  | "poll"
  | "vote"
  | "wave"
  | "purchase"
  | "coin"
  | "card";

export interface WalletEntry {
  signature: string;
  at: number | null;
  kinds: WalletEntryKind[];
  action?: CareActionType;
  wearing?: string | null;
  pet?: Address;
  change: bigint;
  amount?: bigint;
  toDevice?: bigint;
  fee: bigint;
  feePayer: Address;
  ok: boolean;
}

const KIND: Partial<Record<keyof typeof PAWKET_DISCRIMINATORS, WalletEntryKind>> = {
  buyWithWallet: "purchase",
  fundWalletSpend: "coin",
  openWallet: "open",
  deposit: "deposit",
  withdraw: "withdraw",
  linkDevice: "link",
  unlinkDevice: "unlink",
  closeWallet: "close",
  careByDevice: "care",
  finishRoundByDevice: "round",
  dressByDevice: "dress",
  dressOwnedByDevice: "dress",
  adoptPetByDevice: "adopt",
  foundGuildByDevice: "found",
  joinGuildByDevice: "join",
  leaveGuildByDevice: "leave",
  createEventByDevice: "event",
  rsvpByDevice: "rsvp",
  checkInByDevice: "check-in",
  createPollByDevice: "poll",
  voteByDevice: "vote",
  waveByDevice: "wave",
};
const PET_AT: Partial<Record<WalletEntryKind, number>> = { care: 2, round: 2, dress: 2, leave: 2, "check-in": 2, adopt: 3, found: 3, join: 3, rsvp: 3, vote: 3, wave: 3 };
const ACTION_OF = Object.fromEntries(Object.entries(CARE_ACTION_VARIANTS).map(([action, index]) => [index, action])) as Record<
  number,
  CareActionType
>;

export interface ReadTransaction {
  blockTime: bigint | number | null;
  meta: { fee: bigint | number; err: unknown; preBalances: readonly (bigint | number)[]; postBalances: readonly (bigint | number)[] } | null;
  transaction: {
    message: {
      accountKeys: readonly string[];
      instructions: readonly { programIdIndex: number; accounts: readonly number[]; data: string }[];
    };
  };
}

const base58 = getBase58Encoder();

const u64At = (data: ArrayLike<number>, offset: number) =>
  Array.from({ length: 8 }, (_, i) => BigInt(data[offset + i])).reduce((sum, byte, i) => sum + (byte << BigInt(8 * i)), 0n);

export function entryFrom(signature: string, tx: ReadTransaction, wallet: Address, rent = 0n): WalletEntry | null {
  const { accountKeys, instructions } = tx.transaction.message;
  const delta = (index: number) =>
    tx.meta && index >= 0 ? BigInt(tx.meta.postBalances[index]) - BigInt(tx.meta.preBalances[index]) : 0n;
  const entry: WalletEntry = {
    signature,
    at: tx.blockTime === null ? null : Number(tx.blockTime),
    kinds: [],
    change: 0n,
    fee: BigInt(tx.meta?.fee ?? 0),
    feePayer: accountKeys[0] as Address,
    ok: tx.meta?.err == null,
  };
  for (const ix of instructions) {
    const data = base58.encode(ix.data);
    if (accountKeys[ix.programIdIndex] === MPL_CORE_PROGRAM_ID && data[0] === 20 && accountKeys[ix.accounts[1]] === PAWKET_COLLECTION && ix.accounts.some((i) => accountKeys[i] === wallet)) {
      entry.kinds.push("card");
      continue;
    }
    if (accountKeys[ix.programIdIndex] !== PAWKET_PROGRAM_ID) continue;
    const name = (Object.keys(PAWKET_DISCRIMINATORS) as (keyof typeof PAWKET_DISCRIMINATORS)[]).find((key) =>
      PAWKET_DISCRIMINATORS[key].every((byte, i) => data[i] === byte),
    );
    const kind = name ? KIND[name] : undefined;
    if (!kind) continue;
    entry.kinds.push(kind);
    if (kind === "care") entry.action = ACTION_OF[data[8]];
    if (kind === "dress") entry.wearing = data[8] === 0 ? null : (WEARABLES[data[8] - 1]?.id ?? null);
    if (PET_AT[kind] !== undefined) entry.pet = accountKeys[ix.accounts[PET_AT[kind]]] as Address;
    if ((kind === "deposit" || kind === "withdraw") && data.length >= 16) entry.amount = u64At(data, 8);
    if (kind === "link") {
      const device = ix.accounts[2];
      entry.toDevice = delta(device) + (device === 0 ? entry.fee : 0n);
    }
  }
  if (entry.kinds.length === 0) return null;
  const at = accountKeys.indexOf(wallet);
  if (at >= 0 && tx.meta) {
    const pre = BigInt(tx.meta.preBalances[at]);
    const post = BigInt(tx.meta.postBalances[at]);
    entry.change = (post > 0n ? post - rent : 0n) - (pre > 0n ? pre - rent : 0n);
  }
  return entry;
}

export type HistoryRpc = Rpc<GetSignaturesForAddressApi & GetTransactionApi>;

export async function fetchWalletHistory(
  rpc: HistoryRpc,
  wallet: Address,
  { before, limit = 12, rent = 0n }: { before?: string; limit?: number; rent?: bigint } = {},
): Promise<{ entries: WalletEntry[]; next: string | null }> {
  const signatures = await rpc
    .getSignaturesForAddress(wallet, { limit, before: before as Signature | undefined, commitment: "confirmed" })
    .send();
  const entries: WalletEntry[] = [];
  for (let i = 0; i < signatures.length; i += 4) {
    const read = await Promise.all(
      signatures.slice(i, i + 4).map(async ({ signature }) => {
        const tx = await rpc
          .getTransaction(signature, { encoding: "json", maxSupportedTransactionVersion: 0, commitment: "confirmed" })
          .send();
        return tx ? entryFrom(signature, tx as unknown as ReadTransaction, wallet, rent) : null;
      }),
    );
    for (const entry of read) if (entry) entries.push(entry);
  }
  return { entries, next: signatures.length === limit ? signatures[signatures.length - 1].signature : null };
}
