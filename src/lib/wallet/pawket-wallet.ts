"use client";

import { useSyncExternalStore } from "react";
import type { Address, KeyPairSigner } from "@solana/kit";
import { fetchWallet, type ChainWallet } from "@/lib/solana/accounts";
import { rpc } from "@/lib/solana/browser-client";
import { PAWKET_ACCOUNTS, WALLET_LIMITS } from "@/lib/solana/program";
import { loadDevice } from "./device";

/**
 * A player's Pawket Wallet, as every screen sees it: what the chain says the
 * wallet holds and allows, and whether the key on this device is the one it
 * links. One read per owner, shared by every screen that asks, and asked
 * again after anything that changes it (`refreshPawketWallet`).
 */
export interface PawketWalletState {
  owner: Address;
  status: "loading" | "ready" | "error";
  /** The owner's Pawket Wallet, or null when they have not opened one. */
  wallet: ChainWallet | null;
  /** What it holds above its rent. */
  balance: bigint;
  /** This browser's device key for the owner, if it keeps one. */
  device: KeyPairSigner | null;
  /** What this device holds for its own fees. */
  deviceLamports: bigint;
  /** This device is the linked one, and its link has not run out. */
  linked: boolean;
  /** This device can act right now, with no prompt: linked and under today's limit. */
  canAct: boolean;
  /** It holds enough to pay a fee itself without dipping under its rent, for when no sponsor pays. */
  paysOwnWay: boolean;
  error?: unknown;
}

/** A system account's rent-exempt minimum, and one fee above it: what a device needs to pay its way. */
const DEVICE_MINIMUM = 890_880n + WALLET_LIMITS.feePerSignature;

let walletRent: Promise<bigint> | null = null;
/** What a Pawket Wallet account holds in rent, on this cluster: never part of its balance, back when it closes. */
export function rentOfWallet(): Promise<bigint> {
  walletRent ??= rpc
    .getMinimumBalanceForRentExemption(BigInt(PAWKET_ACCOUNTS.wallet.size))
    .send()
    .catch((error: unknown) => {
      walletRent = null;
      throw error;
    });
  return walletRent;
}

/** Whether `wallet` lets `device` act now, and whether the device could pay its own fee. */
export function deviceMayAct(wallet: ChainWallet | null, device: Address | null, deviceLamports: bigint, now = Date.now() / 1000) {
  const linked = Boolean(wallet && device && wallet.device === device && wallet.deviceExpiresAt > now);
  const canAct = linked && wallet!.actionsToday < wallet!.dailyActions;
  return { linked, canAct, paysOwnWay: deviceLamports >= DEVICE_MINIMUM };
}

const states = new Map<Address, PawketWalletState>();
const listeners = new Map<Address, Set<() => void>>();
const reading = new Map<Address, Promise<void>>();

function publish(owner: Address, state: PawketWalletState) {
  states.set(owner, state);
  for (const listener of listeners.get(owner) ?? []) listener();
}

async function read(owner: Address): Promise<void> {
  const before = states.get(owner);
  try {
    const [wallet, device, rent] = await Promise.all([fetchWallet(rpc, owner), loadDevice(owner), rentOfWallet()]);
    const deviceLamports = device ? (await rpc.getBalance(device.address, { commitment: "confirmed" }).send()).value : 0n;
    publish(owner, {
      owner,
      status: "ready",
      wallet,
      balance: wallet && wallet.lamports > rent ? wallet.lamports - rent : 0n,
      device,
      deviceLamports,
      ...deviceMayAct(wallet, device?.address ?? null, deviceLamports),
    });
  } catch (error) {
    // What was known stays shown; the trouble is said beside it.
    publish(owner, { ...(before ?? empty(owner)), status: before?.status === "ready" ? "ready" : "error", error });
  }
}

function empty(owner: Address): PawketWalletState {
  return { owner, status: "loading", wallet: null, balance: 0n, device: null, deviceLamports: 0n, linked: false, canAct: false, paysOwnWay: false };
}

/** Read `owner`'s Pawket Wallet again — after a deposit, a link, an action. Resolves once it is read. */
export function refreshPawketWallet(owner: Address): Promise<void> {
  const pending = read(owner).finally(() => reading.delete(owner));
  reading.set(owner, pending);
  return pending;
}

function subscribe(owner: Address | null, listener: () => void) {
  if (!owner) return () => {};
  const set = listeners.get(owner) ?? new Set();
  set.add(listener);
  listeners.set(owner, set);
  // The first screen to ask starts the read; the rest share it.
  if (!states.has(owner) && !reading.has(owner)) {
    states.set(owner, empty(owner));
    void refreshPawketWallet(owner);
  }
  return () => set.delete(listener);
}

/** `owner`'s Pawket Wallet, or null with no wallet connected. */
export function usePawketWallet(owner: Address | null): PawketWalletState | null {
  return useSyncExternalStore(
    (listener) => subscribe(owner, listener),
    () => (owner ? (states.get(owner) ?? null) : null),
    () => null,
  );
}
