"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useRequest } from "@solana/react";
import { address, createNoopSigner, type Address, type Instruction, type KeyPairSigner, type TransactionSigner } from "@solana/kit";
import { record, type SendKind, type SendOutcome } from "@/lib/analytics/events";
import { dismissToast, showToast } from "@/components/pk/toast";
import { txToast } from "@/components/wallet/tx-toast";
import { getPublicEnv } from "@/config/env";
import { haptic } from "@/lib/native/android";
import { readPawketWallet, refreshPawketWallet, usePawketWallet, type PawketWalletState } from "@/lib/wallet/pawket-wallet";
import { rpc, useConnected } from "./browser-client";
import { PAWKET_DISCRIMINATORS, PAWKET_PROGRAM_ID, type PawketInstructionName } from "./program";
import { asDeviceInstruction } from "./instructions";
import { RelayError, sendPawket, sendPrepared, type SendOptions, type SendResult } from "./send";
import { extractProgramErrorCode, isActiveStage, isUserRejection, toUserFacingError, type TransactionStage } from "./transactions";

/** What a send is, for its count: read from its instructions, never from its words. */
const KIND: Partial<Record<PawketInstructionName, SendKind>> = {
  adoptPet: "adopt", performCareAction: "care", finishRound: "round", dress: "dress", dressOwned: "dress",
  foundGuild: "guild", joinGuild: "guild", leaveGuild: "guild",
  createEvent: "gathering", rsvp: "gathering", checkIn: "gathering", createPoll: "gathering", vote: "gathering",
  wave: "wave", buy: "market", buyWithWallet: "market",
  openWallet: "wallet", deposit: "wallet", withdraw: "wallet", linkDevice: "wallet", unlinkDevice: "wallet", closeWallet: "wallet",
};
const NOBODY = createNoopSigner(address("11111111111111111111111111111111"));
function kindOf(instructions: SendOptions["instructions"]): SendKind {
  let built: Instruction[] = [];
  try {
    built = instructions({ owner: NOBODY, payer: NOBODY });
  } catch {
    return "wallet";
  }
  for (const ix of built) {
    for (const [name, kind] of Object.entries(KIND) as Array<[PawketInstructionName, SendKind]>) {
      if (PAWKET_DISCRIMINATORS[name].every((byte, i) => ix.data?.[i] === byte)) return kind;
    }
  }
  return "wallet";
}

/** How a send ended, as one fixed word. */
function outcomeOf(result: SendResult | null, error?: unknown): SendOutcome {
  if (result) return result.outcome;
  if (error instanceof PawketWalletNeeded) return "needs-wallet";
  if (isUserRejection(error)) return "declined";
  return extractProgramErrorCode(error) !== null ? "refused" : "failed";
}

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
  error?: string;
  /** Nothing was tried: the Pawket Wallet needs this first — a link, a balance, or tomorrow. */
  needs?: PawketWalletNeed;
  /** What it did, said with the record once Solana has it: "Fed. +10 XP." One toast, not two. */
  done?: string;
}

export type PawketWalletNeed = "link" | "fund" | "limit";

/**
 * Pawket acts on Solana only through a linked, funded Pawket Wallet, never
 * the connected wallet on its own. When one is not ready, nothing is sent and
 * the player is told the next step, as a note rather than a failure.
 */
class PawketWalletNeeded extends Error {
  constructor(readonly need: PawketWalletNeed, message: string) {
    super(message);
    this.name = "PawketWalletNeeded";
  }
}

const NEEDS: Record<PawketWalletNeed, string> = {
  link: "Link this device in your Pawket Wallet first. Nothing was sent.",
  fund: "Add SOL to your Pawket Wallet first. Nothing was sent.",
  limit: "Your Pawket Wallet has used today's limit. Change it there, or come back after midnight UTC. Nothing was sent.",
};
const needed = (need: PawketWalletNeed) => new PawketWalletNeeded(need, NEEDS[need]);

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
    const response = await fetch("/api/sponsor", { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000), cache: "no-store" });
    return (await response.json()) as SponsorStatus;
  } catch {
    return { available: false, reason: "The sponsor did not answer." };
  }
}

async function requirePawketWallet(owner: Address) {
  const state = await readPawketWallet(owner);
  if (state.error) throw new Error("Pawket could not read your Pawket Wallet. Try again once you are online. Nothing was sent.");
  if (!state.wallet || !state.device || !state.linked) throw needed("link");
  if (state.balance <= 0n) throw needed("fund");
  return state;
}

let sends = 0;
let sending = false;
const sendListeners = new Set<() => void>();
const subscribeSends = (listener: () => void) => {
  sendListeners.add(listener);
  return () => { sendListeners.delete(listener); };
};
function setSending(value: boolean) {
  sending = value;
  for (const listener of sendListeners) listener();
}

/** Whether Pawket is covering fees right now, for the sentence beside a send. */
export function useSponsor() {
  return useRequest(fetchSponsor);
}

/**
 * Whether actions that open an account wait: the sponsor has answered, and is
 * not paying. A linked device never pays rent itself (`act` refuses), so a
 * screen disables those actions and says they wait, rather than promising a cost.
 */
export const rentWaits = (status: SponsorStatus | undefined) => status !== undefined && !status.available;

/**
 * Sends through `sendPawket` with the connected wallet as the owner and the
 * sponsor as fee payer while it is up — asked fresh at each send, so a
 * sponsor that went down is never relied on. One send at a time; the state
 * is what a receipt draws.
 */
export function usePawketSend() {
  const connected = useConnected();
  const owner = (connected?.account.address as Address | undefined) ?? null;
  const pawketWallet = usePawketWallet(owner);
  const [tx, setTx] = useState<TxState>({ stage: "idle" });
  const busy = useSyncExternalStore(subscribeSends, () => sending, () => false);

  const run = useCallback(
    async (
      label: string,
      kind: SendKind,
      signer: TransactionSigner | null | undefined,
      by: NonNullable<TxState["by"]>,
      go: (signer: TransactionSigner, onStage: (stage: TransactionStage) => void, show: (next: Partial<TxState>) => void) => Promise<SendResult>,
      done?: string,
    ) => {
      // shortcut: One send per tab; use account-scoped slots if concurrent wallets are supported.
      // Never open competing wallet sessions or queue a send.
      if (sending) return null;
      setSending(true);
      // Each send is one toast, kept up to date to the end — even after the screen that sent it is gone.
      const id = `send-${++sends}`;
      let state: TxState = { stage: "preparing", label, by, done };
      const show = (next: Partial<TxState>) => {
        state = { ...state, ...next };
        setTx(state);
        const toast = txToast(id, state, getPublicEnv().solanaCluster);
        if (toast) showToast(toast);
      };
      if (!signer) {
        show({ stage: "failed", error: "This wallet cannot sign. Nothing was sent." });
        setSending(false);
        return null;
      }
      show({});
      try {
        const result = await go(signer, (stage) => show({ stage }), show);
        show({ stage: result.outcome, signature: result.signature, sponsored: result.sponsored });
        record({ name: "send_outcome", kind, outcome: outcomeOf(result) });
        // Felt when Solana has it, never before: "unknown" is still waiting.
        if (result.outcome === "confirmed") haptic("done");
        return result;
      } catch (error) {
        record({ name: "send_outcome", kind, outcome: outcomeOf(null, error) });
        if (error instanceof PawketWalletNeeded) {
          show({ stage: "failed", error: error.message, needs: error.need });
          return null;
        }
        show({ stage: "failed", error: toUserFacingError(error), signature: (error as { signature?: string }).signature });
        // Saying no in the wallet sent nothing and changed nothing: nothing to report.
        if (isUserRejection(error)) dismissToast(id);
        else haptic("refuse");
        return null;
      } finally {
        if (owner && state.signature) await refreshPawketWallet(owner);
        setSending(false);
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
    ) =>
      run(
        label,
        kindOf(instructions),
        signer,
        by,
        async (owner, onStage) => {
          const built = instructions({ owner, payer: owner });
          const management = built.every((ix) => ix.programAddress === PAWKET_PROGRAM_ID && ["openWallet", "deposit", "withdraw", "linkDevice", "unlinkDevice", "closeWallet"].some((name) =>
            PAWKET_DISCRIMINATORS[name as keyof typeof PAWKET_DISCRIMINATORS].every((byte, i) => ix.data?.[i] === byte)));
          if (by === "wallet" && !management && built.some((ix) => ix.programAddress !== PAWKET_PROGRAM_ID || !PAWKET_DISCRIMINATORS.buyWithWallet.every((byte, i) => ix.data?.[i] === byte))) {
            throw new Error("Pet actions must use your linked Pawket Wallet. Nothing was sent.");
          }
          const state = by === "wallet" && !management ? await requirePawketWallet(owner.address) : null;
          const sponsor = await fetchSponsor();
          if (state && !sponsor.available && !state.paysOwnWay) throw new Error("Add SOL and relink this device in your Pawket Wallet to cover its network fee. Nothing was sent.");
          return sendPawket({
            rpc,
            owner,
            sponsor: sponsor.available && sponsor.address ? (sponsor.address as Address) : null,
            instructions,
            feePayer: state?.device ?? undefined,
            onStage,
          });
        },
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
      run(label, path.startsWith("/api/keepsake/") ? "keepsake" : "coin", connected?.signer, "wallet", async (owner, onStage) => {
        const state = await requirePawketWallet(owner.address);
        return sendPrepared({
          rpc,
          owner,
          onStage,
          sponsored,
          extraSigner: sponsored ? undefined : state.device!,
          prepare: async () => {
            const response = await fetch(path, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ...fields, account: owner.address }),
              signal: AbortSignal.timeout(30_000),
            });
            const body = (await response.json().catch(() => ({}))) as { transaction?: string; message?: string };
            if (!response.ok || !body.transaction) {
              throw new RelayError(body.message ?? "Pawket could not prepare it. Nothing was sent.", response.status);
            }
            return body.transaction;
          },
        });
      }),
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
   * would sign it. Only a linked, funded device acts; there is no owner-wallet
   * fallback. Without sponsorship the device pays its fee; rent-bearing
   * actions wait for sponsorship.
   */
  const act = useCallback(
    (label: string, instructions: SendOptions["instructions"], done?: string): Promise<SendResult | null> =>
      run(label, kindOf(instructions), connected?.signer, "device", async (walletSigner, onStage) => {
        const state = await readPawketWallet(walletSigner.address);
        if (state.error) throw new Error("Pawket could not read your Pawket Wallet. Try again once you are online. Nothing was sent.");
        const fallback = deviceFallback(state);
        const sponsor = await fetchSponsor();
        const sponsorAddress = sponsor.available && sponsor.address ? sponsor.address as Address : null;
        if (fallback || !state.device || !state.wallet) throw needed(fallback === "limit" ? "limit" : "link");
        if (state.balance <= 0n) throw needed("fund");
        const device = state.device;
        const forOwner = createNoopSigner(walletSigner.address);
        const twins = (payer: TransactionSigner) => instructions({ owner: forOwner, payer })
          .map((ix) => asDeviceInstruction(ix, { device, wallet: state.wallet!.address }));
        const paysRent = twins(device).some((ix) => (ix.accounts ?? []).slice(1).some((meta) => meta.address === device.address));
        if (!sponsorAddress && (!state.paysOwnWay || paysRent)) {
          throw new Error(paysRent
            ? "Pawket cannot cover this action's account rent right now. Try again when sponsorship returns. Nothing was sent."
            : "Your Pawket Wallet needs SOL for this app's network fees while sponsorship is unavailable. Add SOL and relink this app in your Pawket Wallet. Nothing was sent.");
        }
        return sendPawket({ rpc, owner: device, sponsor: sponsorAddress, instructions: ({ payer }) => twins(payer), onStage });
      }, done),
    [connected, run],
  );

  const reset = useCallback(() => setTx({ stage: "idle" }), []);
  return {
    tx,
    send,
    act,
    asDevice,
    sendFromServer,
    reset,
    busy: busy || isActiveStage(tx.stage),
    /** This device can act for the connected wallet with no prompt. */
    noPrompt: !pawketWallet?.error && deviceFallback(pawketWallet) === null && (pawketWallet?.balance ?? 0n) > 0n,
    /** The connected wallet's Pawket Wallet, as every screen sees it. */
    pawketWallet,
  };
}

export type PawketSender = ReturnType<typeof usePawketSend>;
