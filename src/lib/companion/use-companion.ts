"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useConnectedWallet, useIsWalletReady } from "@solana/kit-plugin-wallet/react";
import type { Address } from "@solana/kit";
import type { GuestPet } from "@/lib/guest/pet";
import { usePets } from "@/lib/guest/use-pets";
import { fetchPetsOnChain, toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";
import { rpc, wallet } from "@/lib/solana/browser-client";

/**
 * The pet a screen draws, and every pet the player keeps. A player keeps as
 * many as they adopt: the connected wallet's pets on Solana, and the pets in
 * this browser. One of them is at home — the one they chose, else the first
 * on Solana, else the first adopted here. All of them arrive as the same
 * record shape, so every screen draws them with the same functions — only
 * how a care is saved differs.
 */
export interface CompanionState {
  /**
   * False until the browser pets, the wallet and the wallet's pets have all
   * settled once. After that it stays true: a wallet connected later swaps
   * its pet in when it arrives (`reading` meanwhile), without blanking the screen.
   */
  ready: boolean;
  /** The connected wallet's pets are being read for the first time. */
  reading: boolean;
  /** The pet at home: what Home, the playground and the wardrobe draw. */
  pet: GuestPet | null;
  /** The chain entry of the pet at home, when it lives on Solana. */
  active: PetOnChain | null;
  /** The pet at home, when it lives in this browser. */
  guest: GuestPet | null;
  /** Every pet in this browser, oldest first. */
  guests: GuestPet[];
  /** Every pet the connected wallet keeps on Solana, most recently adopted first. */
  owned: PetOnChain[];
  /** Every pet, as records: on Solana first, then this browser's. */
  all: GuestPet[];
  /** The connected wallet's address, or null. */
  owner: Address | null;
  /** Whether the connected wallet can sign (a read-only wallet cannot). */
  canSign: boolean;
  /** Solana did not answer; the screen falls back to the browser pets. */
  chainError: unknown;
  /** Read the wallet's pets again, for every screen; resolves once they are read. */
  refresh: () => Promise<void>;
  /** Bring a pet home, by its id (a browser id or an address). Remembered on this device. */
  choose: (id: string) => void;
}

const ACTIVE_KEY = "pawket.active-pet";

/** Whether this page has settled once; see `CompanionState.ready`. */
let settledOnce = false;
const activeListeners = new Set<() => void>();

function readActive(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

/** Bring a pet home, from anywhere (adoption has no companion to ask). */
export function choosePet(id: string) {
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // Blocked storage: the choice lasts until the page reloads.
  }
  for (const listener of activeListeners) listener();
}

/**
 * The connected wallet's pets on Solana, read once and shared by every screen
 * that asks. A refresh reads again for all of them, and the newest read wins,
 * so a read started before a confirmation never overwrites one after it.
 * What was known stays shown when a read fails; the failure is said beside it.
 */
interface OwnedRead {
  status: "loading" | "success" | "error";
  data?: PetOnChain[];
  error?: unknown;
  /** When the read that answered began. */
  at?: number;
}

/** Past this a read is given up on, so a screen is never held by a node that will not answer. */
const READ_DEADLINE_MS = 12_000;
/** A screen arriving later than this after the last read asks again, as each screen used to on its own. */
const FRESH_MS = 15_000;
const ownedReads = new Map<Address, OwnedRead>();
const ownedListeners = new Map<Address, Set<() => void>>();
const generations = new Map<Address, number>();

function publishOwned(owner: Address, read: OwnedRead) {
  ownedReads.set(owner, read);
  for (const listener of ownedListeners.get(owner) ?? []) listener();
}

/** Read `owner`'s pets again, for every screen showing them. */
export function refreshOwnedPets(owner: Address): Promise<void> {
  const generation = (generations.get(owner) ?? 0) + 1;
  generations.set(owner, generation);
  const at = Date.now();
  if (!ownedReads.has(owner)) publishOwned(owner, { status: "loading" });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Solana did not answer in time.")), READ_DEADLINE_MS);
  });
  return Promise.race([fetchPetsOnChain(rpc, owner), deadline])
    .then(
      (pets) => {
        if (generations.get(owner) !== generation) return;
        publishOwned(owner, { status: "success", data: pets.sort((a, b) => b.pet.birthTimestamp - a.pet.birthTimestamp), at });
      },
      (error: unknown) => {
        if (generations.get(owner) !== generation) return;
        publishOwned(owner, { status: "error", data: ownedReads.get(owner)?.data, error, at });
      },
    )
    .finally(() => clearTimeout(timer));
}

function subscribeOwned(owner: Address | null, listener: () => void) {
  if (!owner) return () => {};
  const set = ownedListeners.get(owner) ?? new Set();
  set.add(listener);
  ownedListeners.set(owner, set);
  // The first screen to ask starts the read; the rest share it, unless it has grown old.
  const read = ownedReads.get(owner);
  if (!read || (read.at !== undefined && Date.now() - read.at > FRESH_MS)) void refreshOwnedPets(owner);
  return () => {
    set.delete(listener);
  };
}

function useOwnedPets(owner: Address | null) {
  const read = useSyncExternalStore(
    (listener) => subscribeOwned(owner, listener),
    () => (owner ? ownedReads.get(owner) : undefined),
    () => undefined,
  );
  const refresh = useCallback(() => (owner ? refreshOwnedPets(owner) : Promise.resolve()), [owner]);
  return { status: read?.status, data: read?.data, error: read?.error, refresh };
}

/**
 * How long a screen waits for a wallet's pets before it shows the browser's:
 * local play never waits on Solana, and a chain pet swaps in when it arrives.
 */
const PATIENCE_MS = 4_000;
let patienceOver = false;
let patienceStarted = false;
const patienceListeners = new Set<() => void>();
function subscribePatience(listener: () => void) {
  patienceListeners.add(listener);
  if (!patienceStarted) {
    patienceStarted = true;
    setTimeout(() => {
      patienceOver = true;
      for (const each of patienceListeners) each();
    }, PATIENCE_MS);
  }
  return () => {
    patienceListeners.delete(listener);
  };
}
const usePatienceOver = () => useSyncExternalStore(subscribePatience, () => patienceOver, () => false);

export function useCompanion(): CompanionState {
  const { ready: guestReady, pets: guests } = usePets();
  const walletReady = useIsWalletReady(wallet);
  const connected = useConnectedWallet(wallet);
  const owner = (connected?.account.address as Address | undefined) ?? null;
  const pets = useOwnedPets(owner);
  const chosen = useSyncExternalStore(
    (listener) => {
      activeListeners.add(listener);
      return () => activeListeners.delete(listener);
    },
    readActive,
    () => null,
  );

  const owned = useMemo(() => pets.data ?? [], [pets.data]);
  const chosenGuest = guests.find((pet) => pet.id === chosen) ?? null;
  const active = owned.find((entry) => entry.pet.address === chosen) ?? (chosenGuest ? null : (owned[0] ?? null));
  const guest = active ? null : (chosenGuest ?? guests[0] ?? null);
  const records = useMemo(() => owned.map(toCompanionRecord), [owned]);
  const record = active ? (records.find((r) => r.id === active.pet.address) ?? null) : null;
  const all = useMemo(() => [...records, ...guests], [records, guests]);
  const chainSettled = !owner || pets.status === "success" || pets.status === "error" || pets.data !== undefined;
  const settled = guestReady && walletReady && chainSettled;
  const patient = usePatienceOver();
  // A browser pet never waits on Solana: one chosen here shows at once, and any shows after a few seconds.
  const localFirst = guestReady && guests.length > 0 && (guests.some((each) => each.id === chosen) || patient);
  useEffect(() => {
    if (settled) settledOnce = true;
  }, [settled]);

  return {
    ready: settled || localFirst || (settledOnce && guestReady),
    reading: Boolean(owner) && !chainSettled,
    pet: record ?? guest,
    active,
    guest,
    guests,
    owned,
    all,
    owner,
    canSign: Boolean(connected?.signer),
    chainError: pets.status === "error" ? pets.error : undefined,
    refresh: pets.refresh,
    choose: choosePet,
  };
}
