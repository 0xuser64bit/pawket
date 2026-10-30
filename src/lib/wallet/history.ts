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
// The account the program checks is the Pawket Wallet; every other instruction holds it second. Any
// transaction may mention a wallet, so an instruction is this wallet's only when it holds it there.
const WALLET_AT: Partial<Record<keyof typeof PAWKET_DISCRIMINATORS, number>> = { openWallet: 2, buyWithWallet: 5 };
// `getCreateKeepsakeInstruction` names the Pawket Wallet after Core's eight accounts.
const CARD_WALLET_AT = 8;
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

export interface StatementOptions {
  /** The wallet account's rent, left out of its balance. */
  rent?: bigint;
  /** Who acts for the wallet. A refused transaction changed nothing, so it is listed only when one of them paid its fee. */
  owner?: Address;
  device?: Address | null;
}

export function entryFrom(
  signature: string,
  tx: ReadTransaction,
  wallet: Address,
  { rent = 0n, owner, device }: StatementOptions = {},
): WalletEntry | null {
  const { accountKeys, instructions } = tx.transaction.message;
  const ok = tx.meta?.err == null;
  // Nothing in a refused transaction was checked, so anyone could have named this wallet in it.
  if (!ok && accountKeys[0] !== owner && accountKeys[0] !== device) return null;
  const delta = (index: number) =>
    tx.meta && index >= 0 ? BigInt(tx.meta.postBalances[index]) - BigInt(tx.meta.preBalances[index]) : 0n;
  const entry: WalletEntry = {
    signature,
    at: tx.blockTime === null ? null : Number(tx.blockTime),
    kinds: [],
    change: 0n,
    fee: BigInt(tx.meta?.fee ?? 0),
    feePayer: accountKeys[0] as Address,
    ok,
  };
  for (const ix of instructions) {
    const data = base58.encode(ix.data);
    if (accountKeys[ix.programIdIndex] === MPL_CORE_PROGRAM_ID && data[0] === 20 && accountKeys[ix.accounts[1]] === PAWKET_COLLECTION && accountKeys[ix.accounts[CARD_WALLET_AT]] === wallet) {
      entry.kinds.push("card");
      continue;
    }
    if (accountKeys[ix.programIdIndex] !== PAWKET_PROGRAM_ID) continue;
    const name = (Object.keys(PAWKET_DISCRIMINATORS) as (keyof typeof PAWKET_DISCRIMINATORS)[]).find((key) =>
      PAWKET_DISCRIMINATORS[key].every((byte, i) => data[i] === byte),
    );
    const kind = name ? KIND[name] : undefined;
    if (!name || !kind || accountKeys[ix.accounts[WALLET_AT[name] ?? 1]] !== wallet) continue;
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

async function wasLinked(rpc: HistoryRpc, wallet: Address, device: Address, before: Signature): Promise<boolean> {
  const limit = 100;
  for (;;) {
    const signatures = await rpc.getSignaturesForAddress(device, { before, limit, commitment: "confirmed" }).send();
    for (let offset = 0; offset < signatures.length; offset += 4) {
      const transactions = await Promise.all(signatures.slice(offset, offset + 4).map(async ({ signature, err }) =>
        err ? null : rpc.getTransaction(signature, { encoding: "json", maxSupportedTransactionVersion: 0, commitment: "confirmed" }).send(),
      ));
      for (const transaction of transactions) {
        if (!transaction?.meta || transaction.meta.err !== null) continue;
        const { accountKeys, instructions } = transaction.transaction.message;
        if (instructions.some((instruction) => {
          if (accountKeys[instruction.programIdIndex] !== PAWKET_PROGRAM_ID || accountKeys[instruction.accounts[1]] !== wallet || accountKeys[instruction.accounts[2]] !== device) return false;
          const bytes = base58.encode(instruction.data);
          return PAWKET_DISCRIMINATORS.linkDevice.every((byte, index) => bytes[index] === byte);
        })) return true;
      }
    }
    if (signatures.length < limit) return false;
    before = signatures[signatures.length - 1].signature;
  }
}

export async function fetchWalletHistory(
  rpc: HistoryRpc,
  wallet: Address,
  { before, limit = 12, ...statement }: { before?: string; limit?: number } & StatementOptions = {},
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
        if (!tx) return null;
        const transaction = tx as unknown as ReadTransaction;
        const entry = entryFrom(signature, transaction, wallet, statement);
        if (entry || !tx.meta?.err || !statement.owner) return entry;
        const device = tx.transaction.message.accountKeys[0] as Address;
        const historical = entryFrom(signature, transaction, wallet, { ...statement, device });
        return historical && await wasLinked(rpc, wallet, device, signature) ? historical : null;
      }),
    );
    for (const entry of read) if (entry) entries.push(entry);
  }
  return { entries, next: signatures.length === limit ? signatures[signatures.length - 1].signature : null };
}
