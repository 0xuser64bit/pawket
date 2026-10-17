import "server-only";

import { address, getBase58Decoder, getBase64Encoder, type Base58EncodedBytes } from "@solana/kit";
import { serverRpcUrl } from "@/config/server-env";
import { isListed } from "@/lib/guilds/delisted";
import { toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";
import { createPatientRpc } from "@/lib/solana/rpc";
import { MARKET, PAWKET_ACCOUNTS, PAWKET_PROGRAM_ID } from "@/lib/solana/program";
import { shared } from "./cache";
import { readAllPets, readGuilds } from "./solana";

/**
 * Pawket's pulse: what has happened, counted from the program's accounts
 * and read live — no database, no estimate, nothing added by hand. On
 * devnet the counts include the runs of Pawket's own tests, said on the
 * page. One read answers for thirty seconds, so a crowd is one scan.
 */
/** Of the pets adopted at least that many days ago, how many were looked after on a later day. */
export interface Returns {
  day: { back: number; of: number };
  week: { back: number; of: number };
}

export interface Pulse {
  pets: { kept: number; outToday: number; cares: number; rounds: number; bestRun: number; owners: number; returned: Returns };
  guilds: { listed: number; pets: number; events: number; going: number; came: number; polls: number; votes: number };
  coins: { launched: number; onCurve: number; graduating: number; graduated: number } | null;
  /** Lamports as decimal strings: the pulse is cached as plain JSON. */
  market: { closets: number; sold: number; paid: string; treasury: string };
  guestbook: { books: number; waves: number };
  wallets: { opened: number; deviceActions: number };
  readAt: number;
}

const base58 = getBase58Decoder();
const base64 = getBase64Encoder();
const rpc = () => createPatientRpc(serverRpcUrl());

/** Every account of one kind, as raw bytes. */
async function every(account: { discriminator: readonly number[]; size: number }): Promise<Uint8Array[]> {
  const accounts = await rpc()
    .getProgramAccounts(address(PAWKET_PROGRAM_ID), {
      encoding: "base64",
      filters: [
        { dataSize: BigInt(account.size) },
        {
          memcmp: {
            offset: 0n,
            bytes: base58.decode(Uint8Array.from(account.discriminator)) as Base58EncodedBytes,
            encoding: "base58",
          },
        },
      ],
    })
    .send();
  return accounts.map(({ account: found }) => Uint8Array.from(base64.encode(found.data[0])));
}

/**
 * Whether pets come back, from their own records and nothing else: a pet is
 * back after `n` days when its Passport's last active UTC day (its last care
 * or round) is at least `n` days after the day it was adopted. Counted among
 * the pets old enough to have had the chance.
 */
export function returnsOf(pets: readonly PetOnChain[], todayUtc: number): Returns {
  const born = (entry: PetOnChain) => Math.floor(entry.pet.birthTimestamp / 86_400);
  const after = (days: number) => {
    const old = pets.filter((entry) => todayUtc - born(entry) >= days);
    return { of: old.length, back: old.filter((entry) => entry.passport.lastActiveDay >= born(entry) + days).length };
  };
  return { day: after(1), week: after(7) };
}

const u16 = (bytes: Uint8Array, at: number) => new DataView(bytes.buffer, bytes.byteOffset).getUint16(at, true);
const u32 = (bytes: Uint8Array, at: number) => new DataView(bytes.buffer, bytes.byteOffset).getUint32(at, true);
const u64 = (bytes: Uint8Array, at: number) => new DataView(bytes.buffer, bytes.byteOffset).getBigUint64(at, true);

let cached: { at: number; pulse: Promise<Pulse> } | null = null;

/**
 * Thirty seconds of the Data Cache across instances, and the same in this
 * process. The Data Cache outlives a deploy, so its key names the shape of
 * what it holds: change the shape, change the name, or a new page reads an
 * old entry that lacks what it draws.
 */
const measured = shared(() => measure(), "pulse:returns", 30);

export function readPulse(): Promise<Pulse> {
  const now = Date.now();
  if (cached && now - cached.at < 30_000) return cached.pulse;
  const pulse = measured();
  const mine = { at: now, pulse };
  cached = mine;
  pulse.catch(() => {
    if (cached === mine) cached = null;
  });
  return pulse;
}

async function measure(): Promise<Pulse> {
  const [pets, guilds, events, polls, closets, books, wallets, treasury] = await Promise.all([
    readAllPets(),
    readGuilds(),
    every(PAWKET_ACCOUNTS.event),
    every(PAWKET_ACCOUNTS.poll),
    every(PAWKET_ACCOUNTS.closet),
    every(PAWKET_ACCOUNTS.guestbook),
    every(PAWKET_ACCOUNTS.wallet),
    rpc().getBalance(address(MARKET.treasury), { commitment: "confirmed" }).send(),
  ]);
  const listed = guilds.filter(isListed);
  const today = new Date().toISOString().slice(0, 10);
  // Coins are optional, and Meteora's SDK loads only on the server: the pulse shows without them if they cannot be read.
  const coins = await import("./coins/meteora")
    .then(({ readCoinStages }) => readCoinStages(listed))
    .then((stages) => {
      const all = [...stages.values()].filter((stage) => stage !== "none");
      return {
        launched: all.length,
        onCurve: all.filter((stage) => stage === "dbc").length,
        graduating: all.filter((stage) => stage === "pending").length,
        graduated: all.filter((stage) => stage === "damm").length,
      };
    })
    .catch(() => null);

  return {
    pets: {
      kept: pets.length,
      outToday: pets.filter((entry) => toCompanionRecord(entry).streak.lastDay === today).length,
      cares: pets.reduce((sum, entry) => sum + entry.passport.careCount, 0),
      rounds: pets.reduce((sum, entry) => sum + entry.passport.plays, 0),
      bestRun: Math.max(0, ...pets.map((entry) => entry.passport.bestStreak)),
      owners: new Set(pets.map((entry) => entry.pet.owner)).size,
      returned: returnsOf(pets, Math.floor(Date.now() / 86_400_000)),
    },
    guilds: {
      listed: listed.length,
      pets: listed.reduce((sum, guild) => sum + guild.memberCount, 0),
      events: events.length,
      // GuildEvent: discriminator 8, guild 32, creator 32, id 4, starts 8, ends 8, created 8, going u32, came u32.
      going: events.reduce((sum, bytes) => sum + u32(bytes, 100), 0),
      came: events.reduce((sum, bytes) => sum + u32(bytes, 104), 0),
      polls: polls.length,
      // GuildPoll: discriminator 8, guild 32, creator 32, id 4, created 8, closes 8, then four u32 counts.
      votes: polls.reduce((sum, bytes) => sum + [0, 1, 2, 3].reduce((s, i) => s + u32(bytes, 92 + 4 * i), 0), 0),
    },
    coins,
    market: {
      closets: closets.length,
      // Closet: discriminator 8, owner 32, items 32, count u16, spent u64.
      sold: closets.reduce((sum, bytes) => sum + u16(bytes, 72), 0),
      paid: closets.reduce((sum, bytes) => sum + u64(bytes, 74), 0n).toString(),
      treasury: treasury.value.toString(),
    },
    guestbook: {
      books: books.length,
      // Guestbook: discriminator 8, pet 32, waves u32.
      waves: books.reduce((sum, bytes) => sum + u32(bytes, 40), 0),
    },
    wallets: {
      opened: wallets.length,
      // PawketWallet: discriminator 8, owner 32, device 32, expires 8, daily u16, day u32, today u16, actions u32.
      deviceActions: wallets.reduce((sum, bytes) => sum + u32(bytes, 88), 0),
    },
    readAt: Date.now(),
  };
}
