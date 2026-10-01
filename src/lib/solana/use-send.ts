"use client";

import { useCallback, useState } from "react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useRequest } from "@solana/react";
import type { Address } from "@solana/kit";
import { rpc, wallet } from "./browser-client";
import { sendPawket, type SendOptions, type SendResult } from "./send";
import { isActiveStage, toUserFacingError, type TransactionStage } from "./transactions";

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
  error?: string;
}

async function fetchSponsor(signal?: AbortSignal): Promise<SponsorStatus> {
  try {
    const response = await fetch("/api/sponsor", { signal, cache: "no-store" });
    return (await response.json()) as SponsorStatus;
  } catch {
    return { available: false, reason: "The sponsor did not answer." };
  }
}

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
  const [tx, setTx] = useState<TxState>({ stage: "idle" });

  const send = useCallback(
    async (label: string, instructions: SendOptions["instructions"]): Promise<SendResult | null> => {
      const signer = connected?.signer;
      if (!signer) {
        setTx({ stage: "failed", label, error: "This wallet cannot sign. Nothing was sent." });
        return null;
      }
      setTx({ stage: "signing", label });
      const sponsor = await fetchSponsor();
      try {
        const result = await sendPawket({
          rpc,
          owner: signer,
          sponsor: sponsor.available && sponsor.address ? (sponsor.address as Address) : null,
          instructions,
          onStage: (stage) => setTx((current) => ({ ...current, stage })),
        });
        setTx({ stage: result.outcome, label, signature: result.signature, sponsored: result.sponsored });
        return result;
      } catch (error) {
        setTx({
          stage: "failed",
          label,
          error: toUserFacingError(error),
          signature: (error as { signature?: string }).signature,
        });
        return null;
      }
    },
    [connected],
  );

  const reset = useCallback(() => setTx({ stage: "idle" }), []);
  return { tx, send, reset, busy: isActiveStage(tx.stage) };
}

export type PawketSender = ReturnType<typeof usePawketSend>;
