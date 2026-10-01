"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useConnectedWallet, useIsWalletReady } from "@solana/kit-plugin-wallet/react";
import { useRequest } from "@solana/react";
import type { Address } from "@solana/kit";
import type { GuestPet } from "@/lib/guest/pet";
import { useGuestPet } from "@/lib/guest/use-guest-pet";
import { fetchPetsOnChain, toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";
import { rpc, wallet } from "@/lib/solana/browser-client";

/**
 * The pet a screen draws. With a wallet that holds pets on Solana, it is
 * the one in play there; otherwise it is the pet kept in this browser. Both
 * arrive as the same record shape, so every screen draws them with the same
 * functions — only how a care is saved differs.
 */
export interface CompanionState {
  /**
   * False until the browser pet, the wallet and the wallet's pets have all
   * settled once. After that it stays true: a wallet connected later swaps
   * its pet in when it arrives (`reading` meanwhile), without blanking the screen.
   */
  ready: boolean;
  /** The connected wallet's pets are being read for the first time. */
  reading: boolean;
  /** What the screen draws: the chain pet in play, else the browser pet. */
  pet: GuestPet | null;
  /** The chain pet in play, when `pet` is one. */
  active: PetOnChain | null;
  /** The pet kept in this browser, whether or not it is the one drawn. */
  guest: GuestPet | null;
  /** The connected wallet's address, or null. */
  owner: Address | null;
  /** Whether the connected wallet can sign (a read-only wallet cannot). */
  canSign: boolean;
  /** Every pet the connected wallet holds on Solana, most recently adopted first. */
  owned: PetOnChain[];
  /** Solana did not answer; the screen falls back to the browser pet. */
  chainError: unknown;
  refresh: () => void;
  choose: (address: string) => void;
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

function writeActive(address: string) {
  try {
    window.localStorage.setItem(ACTIVE_KEY, address);
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
  const { ready: guestReady, pet: guest } = useGuestPet();
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
  const active = owned.find((entry) => entry.pet.address === chosen) ?? owned[0] ?? null;
  const record = useMemo(() => (active ? toCompanionRecord(active) : null), [active]);
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
    owner,
    canSign: Boolean(connected?.signer),
    owned,
    chainError: pets.status === "error" ? pets.error : undefined,
    refresh: pets.refresh,
    choose: writeActive,
  };
}
