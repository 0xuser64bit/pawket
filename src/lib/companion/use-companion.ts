"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useConnectedWallet, useIsWalletReady } from "@solana/kit-plugin-wallet/react";
import { useRequest } from "@solana/react";
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
  refresh: () => void;
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

/** The connected wallet's pets on Solana. Disabled while no wallet is connected. */
export function useOwnedPets(owner: Address | null) {
  const fetcher = useCallback(
    async () =>
      (await fetchPetsOnChain(rpc, owner!)).sort((a, b) => b.pet.birthTimestamp - a.pet.birthTimestamp),
    [owner],
  );
  return useRequest(owner ? fetcher : null);
}

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
  useEffect(() => {
    if (settled) settledOnce = true;
  }, [settled]);

  return {
    ready: settled || (settledOnce && guestReady),
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
