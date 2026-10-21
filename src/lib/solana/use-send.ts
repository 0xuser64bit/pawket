"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRequest } from "@solana/react";
import { address, createNoopSigner, type Address, type Instruction, type KeyPairSigner, type TransactionSigner } from "@solana/kit";
import { record, type SendKind, type SendOutcome } from "@/lib/analytics/events";
import { dismissToast, showToast } from "@/components/pk/toast";
import { txToast } from "@/components/wallet/tx-toast";
import { getPublicEnv } from "@/config/env";
import { haptic } from "@/lib/native/android";
import { readPawketWallet, refreshPawketWallet, usePawketWallet, type PawketWalletState } from "@/lib/wallet/pawket-wallet";
import { PHONE_WALLETS, rpc, useConnected } from "./browser-client";
import { PAWKET_DISCRIMINATORS, PAWKET_PROGRAM_ID, type PawketInstructionName } from "./program";
import { asDeviceInstruction } from "./instructions";
import { RelayError, sendPawket, sendPrepared, type SendOptions, type SendResult } from "./send";
import { refreshOwnedPets } from "@/lib/companion/use-companion";
import { extractProgramErrorCode, isActiveStage, isUserRejection, settleSignature, toUserFacingError, type TransactionStage } from "./transactions";

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

export interface TxState {
  stage: TransactionStage;
  label?: string;
  signature?: string;
  sponsored?: boolean;
  by?: "wallet" | "device";
  phone?: boolean;
  error?: string;
  needs?: PawketWalletNeed;
  done?: string;
}

export type PawketWalletNeed = "link" | "fund" | "limit";

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

export type DeviceFallback = "unlinked" | "expired" | "limit";

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

async function requirePawketWallet(owner: Address, { spends }: { spends: boolean }) {
  const state = await readPawketWallet(owner);
  if (state.error) throw new Error("Pawket could not read your Pawket Wallet. Try again once you are online. Nothing was sent.");
  if (!state.wallet || !state.device || !state.linked) throw needed("link");
  if (spends && state.balance <= 0n) throw needed("fund");
  return state;
}

interface Pending {
  signature: string;
  blockhash: string;
  label: string;
  owner: string | null;
}
const PENDING_KEY = "pawket.pending-sends";
function pendingSends(): Pending[] {
  try {
    const list: unknown = JSON.parse(window.sessionStorage.getItem(PENDING_KEY) ?? "[]");
    return Array.isArray(list) ? (list as Pending[]).filter((each) => typeof each?.signature === "string" && typeof each?.blockhash === "string") : [];
  } catch {
    return [];
  }
}
function keepPending(list: Pending[]) {
  try {
    if (list.length) window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-5)));
    else window.sessionStorage.removeItem(PENDING_KEY);
  } catch {}
}

async function settleLater(pending: Pending, show: (next: Partial<TxState>) => void) {
  keepPending([...pendingSends().filter((each) => each.signature !== pending.signature), pending]);
  try {
    const settled = await settleSignature({ rpc }, pending.signature, pending.blockhash);
    if (settled === "confirmed") {
      show({ stage: "confirmed" });
      haptic("done");
      if (pending.owner) {
        await refreshPawketWallet(pending.owner as Address);
        void refreshOwnedPets(pending.owner as Address);
      }
    } else if (settled === "expired") {
      show({ stage: "failed", error: "It never reached Solana, so nothing changed. Try again." });
    }
  } catch (error) {
    show({ stage: "failed", error: toUserFacingError(error) });
  } finally {
    keepPending(pendingSends().filter((each) => each.signature !== pending.signature));
  }
}

export function ResumeSends() {
  useEffect(() => {
    for (const pending of pendingSends()) {
      const id = `settle-${pending.signature.slice(0, 16)}`;
      let state: TxState = { stage: "confirming", label: pending.label, signature: pending.signature };
      const show = (next: Partial<TxState>) => {
        state = { ...state, ...next };
        const toast = txToast(id, state, getPublicEnv().solanaCluster);
        if (toast) showToast(toast);
      };
      show({});
      void settleLater(pending, show);
    }
  }, []);
  return null;
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

export function useSponsor() {
  return useRequest(fetchSponsor);
}

export const needsSol = (balance: bigint, sponsored: boolean) => balance <= 0n && !sponsored;

export const rentWaits = (status: SponsorStatus | undefined) => status !== undefined && !status.available;

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
      if (sending) return null;
      setSending(true);
      const id = `send-${++sends}`;
      let state: TxState = { stage: "preparing", label, by, done, phone: by === "wallet" && connected?.wallet?.name === PHONE_WALLETS };
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
        if (result.outcome === "confirmed") haptic("done");
        else void settleLater({ signature: result.signature, blockhash: result.blockhash, label, owner }, show);
        return result;
      } catch (error) {
        record({ name: "send_outcome", kind, outcome: outcomeOf(null, error) });
        if (error instanceof PawketWalletNeeded) {
          show({ stage: "failed", error: error.message, needs: error.need });
          return null;
        }
        show({ stage: "failed", error: toUserFacingError(error), signature: (error as { signature?: string }).signature });
        if (isUserRejection(error)) dismissToast(id);
        else haptic("refuse");
        return null;
      } finally {
        if (owner && state.signature) await refreshPawketWallet(owner);
        setSending(false);
      }
    },
    [owner, connected],
  );

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
          const state = by === "wallet" && !management ? await requirePawketWallet(owner.address, { spends: true }) : null;
          const sponsor = built.every((ix) => ix.programAddress === PAWKET_PROGRAM_ID) ? await fetchSponsor() : { available: false };
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

  const sendFromServer = useCallback(
    (label: string, path: string, fields: Record<string, unknown> = {}, { sponsored = true } = {}): Promise<SendResult | null> =>
      run(label, path.startsWith("/api/keepsake/") ? "keepsake" : "coin", connected?.signer, "wallet", async (owner, onStage) => {
        const state = await requirePawketWallet(owner.address, { spends: !sponsored });
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
        }).catch((error: unknown) => {
          if (!sponsored && extractProgramErrorCode(error) === 6008) {
            throw Object.assign(new Error("Your wallet's SOL changed between the quote and your signature, so nothing moved. Quote it again."), { signature: (error as { signature?: string }).signature });
          }
          throw error;
        });
      }),
    [run, connected],
  );

  const asDevice = useCallback(
    (label: string, device: KeyPairSigner, instructions: SendOptions["instructions"]): Promise<SendResult | null> =>
      sendAs(label, device, "device", instructions),
    [sendAs],
  );

  const act = useCallback(
    (label: string, instructions: SendOptions["instructions"], done?: string): Promise<SendResult | null> =>
      run(label, kindOf(instructions), connected?.signer, "device", async (walletSigner, onStage) => {
        const state = await readPawketWallet(walletSigner.address);
        if (state.error) throw new Error("Pawket could not read your Pawket Wallet. Try again once you are online. Nothing was sent.");
        const fallback = deviceFallback(state);
        const sponsor = await fetchSponsor();
        const sponsorAddress = sponsor.available && sponsor.address ? sponsor.address as Address : null;
        if (fallback || !state.device || !state.wallet) throw needed(fallback === "limit" ? "limit" : "link");
        if (needsSol(state.balance, sponsorAddress !== null)) throw needed("fund");
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
    pawketWallet,
  };
}

export type PawketSender = ReturnType<typeof usePawketSend>;
