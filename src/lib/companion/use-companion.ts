"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import type { Address } from "@solana/kit";
import type { GuestPet } from "@/lib/guest/pet";
import { usePets } from "@/lib/guest/use-pets";
import { fetchPetsOnChain, toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";
import { rpc, wallet, useWalletReady } from "@/lib/solana/browser-client";

export interface CompanionState {
  ready: boolean;
  reading: boolean;
  pet: GuestPet | null;
  active: PetOnChain | null;
  guest: GuestPet | null;
  guests: GuestPet[];
  owned: PetOnChain[];
  all: GuestPet[];
  owner: Address | null;
  canSign: boolean;
  chainError: unknown;
  refresh: () => Promise<void>;
  choose: (id: string) => void;
}

const ACTIVE_KEY = "pawket.active-pet";

let settledOnce = false;
const activeListeners = new Set<() => void>();

function readActive(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function choosePet(id: string) {
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {}
  for (const listener of activeListeners) listener();
}

interface OwnedRead {
  status: "loading" | "success" | "error";
  data?: PetOnChain[];
  error?: unknown;
  at?: number;
}

const READ_DEADLINE_MS = 12_000;
const FRESH_MS = 15_000;
const ownedReads = new Map<Address, OwnedRead>();
const ownedListeners = new Map<Address, Set<() => void>>();
const generations = new Map<Address, number>();

function publishOwned(owner: Address, read: OwnedRead) {
  ownedReads.set(owner, read);
  for (const listener of ownedListeners.get(owner) ?? []) listener();
}

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
  const walletReady = useWalletReady();
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
