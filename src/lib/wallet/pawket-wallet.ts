"use client";

import { useSyncExternalStore } from "react";
import type { Address, KeyPairSigner } from "@solana/kit";
import { fetchWallet, type ChainWallet } from "@/lib/solana/accounts";
import { rpc } from "@/lib/solana/browser-client";
import { PAWKET_ACCOUNTS, WALLET_LIMITS } from "@/lib/solana/program";
import { loadDevice } from "./device";

export interface PawketWalletState {
  owner: Address;
  status: "loading" | "ready" | "error";
  wallet: ChainWallet | null;
  balance: bigint;
  device: KeyPairSigner | null;
  deviceLamports: bigint;
  linked: boolean;
  canAct: boolean;
  paysOwnWay: boolean;
  error?: unknown;
}

/** 890,880 lamports: a system account's rent-exempt minimum. */
const DEVICE_MINIMUM = 890_880n + WALLET_LIMITS.feePerSignature;

let walletRent: Promise<bigint> | null = null;
export function rentOfWallet(): Promise<bigint> {
  walletRent ??= rpc
    .getMinimumBalanceForRentExemption(BigInt(PAWKET_ACCOUNTS.wallet.size))
    .send({ abortSignal: AbortSignal.timeout(30_000) })
    .catch((error: unknown) => {
      walletRent = null;
      throw error;
    });
  return walletRent;
}

function deviceMayAct(wallet: ChainWallet | null, device: Address | null, deviceLamports: bigint, now = Date.now() / 1000) {
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
    const deviceLamports = device ? (await rpc.getBalance(device.address, { commitment: "confirmed" }).send({ abortSignal: AbortSignal.timeout(30_000) })).value : 0n;
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
    publish(owner, { ...(before ?? empty(owner)), status: before?.status === "ready" ? "ready" : "error", error });
  }
}

function empty(owner: Address): PawketWalletState {
  return { owner, status: "loading", wallet: null, balance: 0n, device: null, deviceLamports: 0n, linked: false, canAct: false, paysOwnWay: false };
}

export function refreshPawketWallet(owner: Address): Promise<void> {
  const existing = reading.get(owner);
  if (existing) return existing;
  const pending = read(owner).finally(() => reading.delete(owner));
  reading.set(owner, pending);
  return pending;
}

export async function readPawketWallet(owner: Address): Promise<PawketWalletState> {
  await refreshPawketWallet(owner);
  return states.get(owner)!;
}

function subscribe(owner: Address | null, listener: () => void) {
  if (!owner) return () => {};
  const set = listeners.get(owner) ?? new Set();
  set.add(listener);
  listeners.set(owner, set);
  if (!states.has(owner) && !reading.has(owner)) {
    states.set(owner, empty(owner));
    void refreshPawketWallet(owner);
  }
  return () => set.delete(listener);
}

export function usePawketWallet(owner: Address | null): PawketWalletState | null {
  return useSyncExternalStore(
    (listener) => subscribe(owner, listener),
    () => (owner ? (states.get(owner) ?? null) : null),
    () => null,
  );
}
