"use client";

import { useState } from "react";
import { getDepositInstruction, getLinkDeviceInstruction, getOpenWalletInstruction } from "@/lib/solana/instructions";
import { deriveWalletPda } from "@/lib/solana/pda";
import { WALLET_LIMITS } from "@/lib/solana/program";
import { usePawketSend } from "@/lib/solana/use-send";
import { loadDevice, makeDevice } from "./device";
import { refreshPawketWallet } from "./pawket-wallet";
import { inAndroidApp } from "@/lib/native/android";

/** A link's end: a few minutes inside the program's 30 days, so a clock running ahead is not refused. */
export const linkEnds = (days: number) => Math.floor(Date.now() / 1000) + Math.min(days * 86_400, WALLET_LIMITS.maxDeviceSeconds) - 600;

/**
 * Linking this browser to the connected wallet's Pawket Wallet — opening it
 * first when there is none — in one approval, with the sponsor paying while
 * it is up. The browser's key is the one it keeps, or a new one made here.
 */
export function useLinkBrowser() {
  const sender = usePawketSend();
  const [problem, setProblem] = useState<string>();
  const [preparing, setPreparing] = useState(false);

  async function link({ days = 30, daily = 100, deposit = 0n }: { days?: number; daily?: number; deposit?: bigint } = {}) {
    if (preparing || sender.busy) return null;
    setPreparing(true);
    try {
      const state = sender.pawketWallet;
      if (!state || state.status === "loading") return null;
      if (state.error) {
        setProblem("Your Pawket Wallet could not be read. Try again once you are online. Nothing was linked.");
        return null;
      }
      const owner = state.owner;
      setProblem(undefined);
      let device;
      try {
        device = state.device ?? (await loadDevice(owner)) ?? (await makeDevice(owner));
      } catch (error) {
        setProblem(error instanceof Error ? error.message : `${inAndroidApp() ? "This app" : "This browser"} cannot keep a device key. Nothing was linked.`);
        return null;
      }
      const opening = !state.wallet;
      const wallet = state.wallet?.address ?? (await deriveWalletPda(owner)).address;
      const result = await sender.send(inAndroidApp() ? "Link this app" : "Link this browser", ({ owner: signer, payer }) => [
        ...(opening ? [getOpenWalletInstruction({ owner: signer, payer, wallet })] : []),
        ...(deposit > 0n ? [getDepositInstruction({ owner: signer, wallet, amount: deposit })] : []),
        getLinkDeviceInstruction({ owner: signer, wallet, device, expiresAt: linkEnds(days), dailyActions: daily }),
      ]);
      if (result) await refreshPawketWallet(owner);
      return result;
    } finally { setPreparing(false); }
  }

  return { link, problem, busy: preparing || sender.busy, state: sender.pawketWallet };
}
