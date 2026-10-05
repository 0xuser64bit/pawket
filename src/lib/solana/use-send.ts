"use client";

import { useCallback, useState } from "react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useRequest } from "@solana/react";
import { createNoopSigner, type Address, type KeyPairSigner, type TransactionSigner } from "@solana/kit";
import { dismissToast, showToast } from "@/components/pk/toast";
import { txToast } from "@/components/wallet/tx-toast";
import { getPublicEnv } from "@/config/env";
import { refreshPawketWallet, usePawketWallet, type PawketWalletState } from "@/lib/wallet/pawket-wallet";
import { rpc, wallet } from "./browser-client";
import { asDeviceInstruction } from "./instructions";
import { RelayError, sendPawket, sendPrepared, type SendOptions, type SendResult } from "./send";
import { isActiveStage, isUserRejection, toUserFacingError, type TransactionStage } from "./transactions";

export interface SponsorStatus {
  available: boolean;
  address?: string;
  reason?: string;
}

/** What one send looks like to the player, from the wallet prompt to the receipt. */
export interface TxState {
  stage: TransactionStage;
  /** What is being recorded, as the player would say it: "Feed Pepper". */
  label?: string;
  signature?: string;
  sponsored?: boolean;
  /** Who signed: the wallet (with a prompt), or this device, linked to the Pawket Wallet (without one). */
  by?: "wallet" | "device";
  /** Why the wallet signed something this device could have: what would let it next time. */
  fallback?: DeviceFallback;
  error?: string;
}

/** Why a linked device did not sign: none is linked here, its link ran out, or today's limit is used. */
export type DeviceFallback = "unlinked" | "expired" | "limit";

/** Why `state`'s device cannot act for its owner now, or null when it can. */
export function deviceFallback(state: PawketWalletState | null, now = Date.now() / 1000): DeviceFallback | null {
  const wallet = state?.wallet;
  if (!wallet || !state?.device || wallet.device !== state.device.address) return "unlinked";
  if (wallet.deviceExpiresAt <= now) return "expired";
  if (wallet.actionsToday >= wallet.dailyActions) return "limit";
  return null;
}

async function fetchSponsor(signal?: AbortSignal): Promise<SponsorStatus> {
  try {
    const response = await fetch("/api/sponsor", { signal, cache: "no-store" });
    return (await response.json()) as SponsorStatus;
  } catch {
    return { available: false, reason: "The sponsor did not answer." };
  }
}

let sends = 0;

/** Whether Pawket is covering fees right now, for the sentence beside a send. */
export function useSponsor() {
  return useRequest(fetchSponsor);
}

/**
 * Sends through `sendPawket` with the connected wallet as the owner and the
 * sponsor as fee payer while it is up — asked fresh at each send, so a
 * sponsor that went down is never relied on. One send at a time; the state
 * is what a receipt draws.
 */
export function usePawketSend() {
  const connected = useConnectedWallet(wallet);
  const owner = (connected?.account.address as Address | undefined) ?? null;
  const pawketWallet = usePawketWallet(owner);
  const [tx, setTx] = useState<TxState>({ stage: "idle" });

  const run = useCallback(
    async (
      label: string,
      signer: TransactionSigner | null | undefined,
      by: NonNullable<TxState["by"]>,
      go: (signer: TransactionSigner, onStage: (stage: TransactionStage) => void) => Promise<SendResult>,
      fallback?: DeviceFallback,
    ) => {
      // Each send is one toast, kept up to date to the end — even after the screen that sent it is gone.
      const id = `send-${++sends}`;
      let state: TxState = { stage: "signing", label, by, fallback };
      const show = (next: Partial<TxState>) => {
        state = { ...state, ...next };
        setTx(state);
        const toast = txToast(id, state, getPublicEnv().solanaCluster);
        if (toast) showToast(toast);
      };
      if (!signer) {
        show({ stage: "failed", error: "This wallet cannot sign. Nothing was sent." });
        return null;
      }
      show({});
      try {
        const result = await go(signer, (stage) => show({ stage }));
        show({ stage: result.outcome, signature: result.signature, sponsored: result.sponsored });
        return result;
      } catch (error) {
        show({ stage: "failed", error: toUserFacingError(error), signature: (error as { signature?: string }).signature });
        // Saying no in the wallet sent nothing and changed nothing: nothing to report.
        if (isUserRejection(error)) dismissToast(id);
        return null;
      } finally {
        if (by === "device" && owner) void refreshPawketWallet(owner);
      }
    },
    [owner],
  );

  /** `instructions`, signed by `signer` — the wallet, or this device — with the sponsor paying while it is up. */
  const sendAs = useCallback(
    (
      label: string,
      signer: TransactionSigner | null | undefined,
      by: NonNullable<TxState["by"]>,
      instructions: SendOptions["instructions"],
      fallback?: DeviceFallback,
    ) =>
      run(
        label,
        signer,
        by,
        async (owner, onStage) => {
          const sponsor = await fetchSponsor();
          return sendPawket({
            rpc,
            owner,
            sponsor: sponsor.available && sponsor.address ? (sponsor.address as Address) : null,
            instructions,
            onStage,
          });
        },
        fallback,
      ),
    [run],
  );

  const send = useCallback(
    (label: string, instructions: SendOptions["instructions"]): Promise<SendResult | null> =>
      sendAs(label, connected?.signer, "wallet", instructions),
    [sendAs, connected],
  );

  /**
   * A transaction Pawket's server builds at `path` for this wallet (POST
   * { account, ...fields }), signed here and sent. `sponsored` says who pays
   * its fee: Pawket for a keepsake, the player for anything in a coin.
   */
  const sendFromServer = useCallback(
    (label: string, path: string, fields: Record<string, unknown> = {}, { sponsored = true } = {}): Promise<SendResult | null> =>
      run(label, connected?.signer, "wallet", (owner, onStage) =>
        sendPrepared({
          rpc,
          owner,
          onStage,
          sponsored,
          prepare: async () => {
            const response = await fetch(path, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ...fields, account: owner.address }),
            });
            const body = (await response.json().catch(() => ({}))) as { transaction?: string; message?: string };
            if (!response.ok || !body.transaction) {
              throw new RelayError(body.message ?? "Pawket could not prepare it. Nothing was sent.", response.status);
            }
            return body.transaction;
          },
        }),
      ),
    [run, connected],
  );

  /** Something this device signs on its own, with no prompt: letting go of its own link. */
  const asDevice = useCallback(
    (label: string, device: KeyPairSigner, instructions: SendOptions["instructions"]): Promise<SendResult | null> =>
      sendAs(label, device, "device", instructions),
    [sendAs],
  );

  /**
   * Anything for the connected wallet's pets that costs no money — care,
   * rounds, clothes, adoption, guilds, gatherings, waves — built as the owner
   * would sign it. This device signs it, with no prompt, while it is linked
   * and may act (`asDeviceInstruction`); otherwise the wallet does, and the
   * receipt says why. With no sponsor up, the device pays its own fee from its
   * float, and anything that would need it to pay rent goes to the wallet.
   */
  const act = useCallback(
    async (label: string, instructions: SendOptions["instructions"]): Promise<SendResult | null> => {
      const fallback = deviceFallback(pawketWallet);
      const device = pawketWallet?.device;
      const walletAddress = pawketWallet?.wallet?.address;
      if (fallback || !owner || !device || !walletAddress) {
        return sendAs(label, connected?.signer, "wallet", instructions, fallback ?? "unlinked");
      }
      const forOwner = createNoopSigner(owner);
      const twins = (payer: TransactionSigner) =>
        instructions({ owner: forOwner, payer }).map((ix) => asDeviceInstruction(ix, { device, wallet: walletAddress }));
      const sponsored = (await fetchSponsor()).available;
      const paysRent = twins(device).some((ix) => (ix.accounts ?? []).slice(1).some((meta) => meta.address === device.address));
      if (!sponsored && (!pawketWallet.paysOwnWay || paysRent)) return send(label, instructions);
      return sendAs(label, device, "device", ({ payer }) => twins(payer));
    },
    [pawketWallet, owner, connected, send, sendAs],
  );

  const reset = useCallback(() => setTx({ stage: "idle" }), []);
  return {
    tx,
    send,
    act,
    asDevice,
    sendFromServer,
    reset,
    busy: isActiveStage(tx.stage),
    /** This device can act for the connected wallet with no prompt. */
    noPrompt: deviceFallback(pawketWallet) === null,
    /** The connected wallet's Pawket Wallet, as every screen sees it. */
    pawketWallet,
  };
}

export type PawketSender = ReturnType<typeof usePawketSend>;
