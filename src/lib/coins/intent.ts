import { address, getAddressDecoder, getAddressEncoder, getProgramDerivedAddress, type Address, type Instruction, type ReadonlyUint8Array } from "@solana/kit";
import type { SolanaCluster } from "@/config/env";
import { COIN_TERMS, presetConfig, type PresetId } from "./presets";

/** Values captured from the player's action, never from the prepared-transaction response. */
type MarketIntent = Readonly<{ cluster: SolanaCluster; mint: string; preset: PresetId }>;
export type CoinIntent = MarketIntent & (
  | Readonly<{ kind: "trade"; route: "curve" | "pool"; side: "buy" | "sell"; amountIn: bigint; minimumOut: bigint }>
  | Readonly<{ kind: "launch"; firstBuy: bigint; name: string; symbol: string; metadataUri: string }>
  | Readonly<{ kind: "graduate" }>
  | Readonly<{ kind: "claim"; from: "curve" | "pool" }>
);

/** Conservative ceilings, shown by the controls. Unspent funding settles back atomically. */
export const COIN_RENT_LIMITS = Object.freeze({ trade: 5_000_000n, claim: 5_000_000n, launch: 30_000_000n, graduate: 50_000_000n });
export function coinFundingLimit(intent: CoinIntent): bigint {
  const input = intent.kind === "trade" && intent.side === "buy" ? intent.amountIn : intent.kind === "launch" ? intent.firstBuy : 0n;
  check(input >= 0n && input <= U64_MAX, "Invalid coin input.");
  const total = input + COIN_RENT_LIMITS[intent.kind] + (intent.kind === "launch" ? COIN_TERMS.launchFeeLamports : 0n);
  check(total <= U64_MAX, "Invalid coin funding budget.");
  return total;
}

const U64_MAX = (1n << 64n) - 1n;
const SYSTEM = "11111111111111111111111111111111";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const ATA = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const SOL = "So11111111111111111111111111111111111111112";
const DBC = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
const DAMM = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG";
const METADATA = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
/** FixedBps100, the only migration fee option in Pawket's presets. SDK parity is tested. */
const DAMM_CONFIG = "Hv8Lmzmnju6m7kcokVKvwqz7QPmdX9XfKjJsXz8RXcjp";
const INSTRUCTIONS = "Sysvar1nstructions1111111111111111111111111";
const COMPUTE = "ComputeBudget111111111111111111111111111111";

// Installed upstream DBC 1.5.13 / DAMM 1.5.1 IDLs. Never accept a discriminator alone.
const SWAP = [248, 198, 158, 145, 225, 117, 135, 200];
const SWAP2 = [65, 75, 63, 76, 235, 91, 91, 136];
const INITIALIZE = [140, 85, 215, 176, 102, 54, 104, 79];
const CLAIM_CREATOR = [82, 220, 250, 189, 3, 85, 107, 45];
const CLAIM_POSITION = [180, 38, 154, 17, 133, 33, 162, 211];
const MIGRATE = [156, 169, 230, 103, 53, 228, 80, 64];

function check(condition: unknown, message = "This transaction does not match your coin intent. Nothing was signed or sent."): asserts condition {
  if (!condition) throw new Error(message);
}
const bytes = (key: string) => getAddressEncoder().encode(address(key));
const utf8 = (value: string) => new TextEncoder().encode(value);
const pda = async (program: string, seeds: readonly (string | ReadonlyUint8Array)[]) =>
  (await getProgramDerivedAddress({ programAddress: address(program), seeds: seeds.map((seed) => typeof seed === "string" ? utf8(seed) : seed) }))[0];
const dataOf = (ix: Instruction) => ix.data ?? new Uint8Array();
const accountsOf = (ix: Instruction) => (ix.accounts ?? []).map((meta) => meta.address);
function uint(data: ReadonlyUint8Array, offset: number, size = 8): bigint {
  check(data.length >= offset + size);
  let out = 0n;
  for (let i = size - 1; i >= 0; i--) out = (out << 8n) | BigInt(data[offset + i]);
  return out;
}
const starts = (data: ReadonlyUint8Array, discriminator: readonly number[]) => discriminator.every((byte, i) => data[i] === byte);
function accounts(ix: Instruction, expected: readonly string[], requiredWritable: readonly number[] = [], requiredSigners: readonly number[] = []) {
  const metas = ix.accounts ?? [];
  check(metas.length === expected.length && expected.every((key, i) => key === metas[i].address));
  check(requiredWritable.every((i) => (metas[i].role & 1) === 1));
  check(requiredSigners.every((i) => metas[i].role >= 2));
}
function core(ix: Instruction, program: string, discriminator: readonly number[], length: number) {
  check(ix.programAddress === program && dataOf(ix).length === length && starts(dataOf(ix), discriminator));
}
function stringArgs(data: ReadonlyUint8Array): string[] {
  const out: string[] = [];
  let offset = 8;
  for (let i = 0; i < 3; i++) {
    const length = Number(uint(data, offset, 4));
    offset += 4;
    check(length <= 1024 && offset + length <= data.length);
    out.push(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(data.slice(offset, offset + length))));
    offset += length;
  }
  check(offset === data.length);
  return out;
}

/** Resolve addresses independently of the SDK and of the prepared transaction. */
async function market(intent: MarketIntent, owner: Address) {
  const config = presetConfig(intent.cluster, intent.preset);
  check(config, "This coin preset is unavailable. Nothing was signed or sent.");
  const a = bytes(intent.mint), b = bytes(SOL);
  const larger = a.findIndex((value, i) => value !== b[i]);
  const [first, second] = larger >= 0 && a[larger] > b[larger] ? [a, b] : [b, a];
  const curve = await pda(DBC, ["pool", bytes(config), first, second]);
  const pool = await pda(DAMM, ["pool", bytes(DAMM_CONFIG), first, second]);
  const vault = (program: string, pool: string, mint: string) => pda(program, ["token_vault", bytes(mint), bytes(pool)]);
  const associated = (mint: string) => pda(ATA, [bytes(owner), bytes(TOKEN), bytes(mint)]);
  const [coinAta, solAta, dbcAuthority, dammAuthority, dbcEvent, dammEvent, curveBase, curveQuote, poolBase, poolQuote] = await Promise.all([
    associated(intent.mint), associated(SOL), pda(DBC, ["pool_authority"]), pda(DAMM, ["pool_authority"]),
    pda(DBC, ["__event_authority"]), pda(DAMM, ["__event_authority"]),
    vault(DBC, curve, intent.mint), vault(DBC, curve, SOL), vault(DAMM, pool, intent.mint), vault(DAMM, pool, SOL),
  ]);
  return { config, curve, pool, coinAta, solAta, dbcAuthority, dammAuthority, dbcEvent, dammEvent, curveBase, curveQuote, poolBase, poolQuote };
}

/** Strict operation grammar: no generic program allow-list and no token transfer/approval escape hatch. */
export async function validateCoinInstructions({ owner, instructions, intent, funding }: {
  owner: Address; instructions: readonly Instruction[]; intent: CoinIntent; funding: bigint;
}): Promise<void> {
  check(funding >= 0n && funding <= coinFundingLimit(intent), "Coin funding exceeds the approved operation budget. Nothing was signed or sent.");
  check(instructions.length > 0 && instructions.length <= 32);
  const m = await market(intent, owner);
  let swaps = 0, launches = 0, claims = 0, migrations = 0, wraps = 0, syncs = 0, closes = 0, compute = 0;
  const creates = new Set<string>();
  const allowedSigners = new Set<string>([owner]);
  if (intent.kind === "launch") allowedSigners.add(intent.mint);
  let swapSeen = false;
  let closeSeen = false;
  const input = intent.kind === "trade" ? intent.amountIn : intent.kind === "launch" ? intent.firstBuy : 0n;
  const buying = intent.kind === "trade" ? intent.side === "buy" : intent.kind === "launch" && intent.firstBuy > 0n;
  if (intent.kind === "trade") check(input > 0n && intent.minimumOut > 0n && intent.minimumOut <= U64_MAX);
  const swapAccounts = (route: "curve" | "pool", buy: boolean) => route === "curve"
    ? [m.dbcAuthority, m.config, m.curve, buy ? m.solAta : m.coinAta, buy ? m.coinAta : m.solAta, m.curveBase, m.curveQuote, intent.mint, SOL, owner, TOKEN, TOKEN, DBC, m.dbcEvent, DBC]
    : [m.dammAuthority, m.pool, buy ? m.solAta : m.coinAta, buy ? m.coinAta : m.solAta, m.poolBase, m.poolQuote, intent.mint, SOL, owner, TOKEN, TOKEN, DAMM, m.dammEvent, DAMM];

  for (const ix of instructions) {
    const data = dataOf(ix);
    const keys = accountsOf(ix);
    if (ix.programAddress === ATA) {
      if (closeSeen && intent.kind === "claim" && intent.from === "pool") { closeSeen = false; creates.clear(); }
      check(intent.kind !== "graduate" && data.length === 1 && data[0] === 1 && !swapSeen && !closeSeen);
      check(keys[3] === intent.mint || keys[3] === SOL);
      const ata = keys[3] === SOL ? m.solAta : m.coinAta;
      accounts(ix, [owner, ata, owner, keys[3], SYSTEM, TOKEN], [0, 1], [0]);
      check(!creates.has(ata));
      creates.add(ata);
    } else if (ix.programAddress === SYSTEM) {
      check(buying && !swapSeen && !closeSeen && ++wraps === 1);
      check(data.length === 12 && uint(data, 0, 4) === 2n && uint(data, 4) === input);
      accounts(ix, [owner, m.solAta], [0, 1], [0]);
    } else if (ix.programAddress === TOKEN) {
      if (data.length === 1 && data[0] === 17) {
        check(buying && wraps === 1 && !swapSeen && !closeSeen && ++syncs === 1);
        accounts(ix, [m.solAta], [0]);
      } else {
        check(data.length === 1 && data[0] === 9 && (swapSeen || claims > 0) && !closeSeen);
        accounts(ix, [m.solAta, owner, owner], [0, 1], [2]);
        closes++; closeSeen = true;
      }
    } else if (ix.programAddress === COMPUTE) {
      check(intent.kind === "graduate" && ++compute === 1 && data.length === 5 && data[0] === 2 && uint(data, 1, 4) <= 600_000n && uint(data, 1, 4) > 0n && keys.length === 0);
    } else if ((intent.kind === "trade" || intent.kind === "launch") && (starts(data, SWAP) || starts(data, SWAP2))) {
      check(!closeSeen && ++swaps === 1 && (!buying || (wraps === 1 && syncs === 1)));
      const route = intent.kind === "trade" ? intent.route : "curve";
      const partial = intent.kind === "trade" && route === "curve";
      core(ix, route === "curve" ? DBC : DAMM, partial ? SWAP2 : SWAP, partial ? 25 : 24);
      check(uint(data, 8) === input && uint(data, 16) === (intent.kind === "trade" ? intent.minimumOut : 0n));
      if (partial) check(data[24] === 1); // Upstream PartialFill enum; ExactOut never authorizes a sell.
      const expected = swapAccounts(route, Boolean(buying));
      // A launch first buy explicitly requests the SDK's instructions-sysvar remaining account.
      if (intent.kind === "launch") expected.push(INSTRUCTIONS);
      accounts(ix, expected, route === "curve" ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5], [route === "curve" ? 9 : 8]);
      if (intent.kind === "launch") check(launches === 1);
      swapSeen = true;
    } else if (intent.kind === "launch" && starts(data, INITIALIZE)) {
      check(ix.programAddress === DBC && ++launches === 1 && !swapSeen && !wraps && !creates.size);
      const strings = stringArgs(data);
      check(strings[0] === intent.name && strings[1] === intent.symbol && strings[2] === intent.metadataUri);
      const metadata = await pda(METADATA, ["metadata", bytes(METADATA), bytes(intent.mint)]);
      accounts(ix, [m.config, m.dbcAuthority, owner, intent.mint, SOL, m.curve, m.curveBase, m.curveQuote, metadata, METADATA, owner, TOKEN, TOKEN, SYSTEM, m.dbcEvent, DBC], [3, 5, 6, 7, 8, 10], [2, 3, 10]);
    } else if (intent.kind === "claim" && intent.from === "curve" && starts(data, CLAIM_CREATOR)) {
      core(ix, DBC, CLAIM_CREATOR, 24);
      check(++claims === 1 && !closeSeen && uint(data, 8) === U64_MAX && uint(data, 16) === U64_MAX);
      accounts(ix, [m.dbcAuthority, m.curve, m.coinAta, m.solAta, m.curveBase, m.curveQuote, intent.mint, SOL, owner, TOKEN, TOKEN, m.dbcEvent, DBC], [1, 2, 3, 4, 5], [8]);
    } else if (intent.kind === "claim" && intent.from === "pool" && starts(data, CLAIM_POSITION)) {
      core(ix, DAMM, CLAIM_POSITION, 8);
      check(++claims <= 4 && !closeSeen && keys[2] !== owner && keys[9] !== owner);
      accounts(ix, [m.dammAuthority, m.pool, keys[2], m.coinAta, m.solAta, m.poolBase, m.poolQuote, intent.mint, SOL, keys[9], owner, TOKEN, TOKEN, m.dammEvent, DAMM], [2, 3, 4, 5, 6], [10]);
      // The program binds this position and its NFT account to pool + signer. Neither can debit the signer.
    } else if (intent.kind === "graduate" && starts(data, MIGRATE)) {
      core(ix, DBC, MIGRATE, 8);
      check(++migrations === 1 && keys.length === 26);
      const firstMint = keys[5], secondMint = keys[8];
      check(firstMint !== secondMint && ![owner, intent.mint, SOL].includes(firstMint) && ![owner, intent.mint, SOL].includes(secondMint));
      allowedSigners.add(firstMint); allowedSigners.add(secondMint);
      const [migration, firstAccount, firstPosition, secondAccount, secondPosition] = await Promise.all([
        pda(DBC, ["damm_v2", bytes(m.curve)]), pda(DAMM, ["position_nft_account", bytes(firstMint)]), pda(DAMM, ["position", bytes(firstMint)]), pda(DAMM, ["position_nft_account", bytes(secondMint)]), pda(DAMM, ["position", bytes(secondMint)]),
      ]);
      accounts(ix, [m.curve, migration, m.config, m.dbcAuthority, m.pool, firstMint, firstAccount, firstPosition, secondMint, secondAccount, secondPosition, m.dammAuthority, DAMM, intent.mint, SOL, m.poolBase, m.poolQuote, m.curveBase, m.curveQuote, owner, TOKEN, TOKEN, TOKEN_2022, m.dammEvent, SYSTEM, DAMM_CONFIG], [0, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19], [5, 8, 19]);
    } else check(false);
  }
  for (const ix of instructions) for (const meta of ix.accounts ?? []) check(meta.role < 2 || allowedSigners.has(meta.address));
  if (intent.kind === "trade") check(swaps === 1 && closes === 1 && (buying ? wraps === 1 && syncs === 1 : wraps === 0 && syncs === 0));
  if (intent.kind === "launch") check(launches === 1 && swaps === (intent.firstBuy > 0n ? 1 : 0) && closes === (intent.firstBuy > 0n ? 1 : 0));
  if (intent.kind === "claim") check(claims >= 1 && closes === claims);
  if (intent.kind === "graduate") check(migrations === 1 && compute <= 1);
}

/** Raw account bytes from the browser's own RPC. Only frozen, active configured tables are usable. */
export function decodeFrozenCoinLookup(data: ReadonlyUint8Array): readonly Address[] {
  check(data.length >= 56 && (data.length - 56) % 32 === 0 && uint(data, 0, 4) === 1n && uint(data, 4) === U64_MAX && data[21] === 0);
  const decoder = getAddressDecoder();
  return Array.from({ length: (data.length - 56) / 32 }, (_, i) => decoder.decode(data.slice(56 + i * 32, 88 + i * 32)));
}
