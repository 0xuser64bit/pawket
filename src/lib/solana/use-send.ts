"use client";

import { useCallback, useState } from "react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useRequest } from "@solana/react";
import type { Address, TransactionSigner } from "@solana/kit";
import { rpc, wallet } from "./browser-client";
import { RelayError, sendPawket, sendPrepared, type SendOptions, type SendResult } from "./send";
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

  const run = useCallback(
    async (label: string, go: (signer: TransactionSigner, onStage: (stage: TransactionStage) => void) => Promise<SendResult>) => {
      const signer = connected?.signer;
      if (!signer) {
        setTx({ stage: "failed", label, error: "This wallet cannot sign. Nothing was sent." });
        return null;
      }
      setTx({ stage: "signing", label });
      try {
        const result = await go(signer, (stage) => setTx((current) => ({ ...current, stage })));
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

  const send = useCallback(
    (label: string, instructions: SendOptions["instructions"]): Promise<SendResult | null> =>
      run(label, async (owner, onStage) => {
        const sponsor = await fetchSponsor();
        return sendPawket({
          rpc,
          owner,
          sponsor: sponsor.available && sponsor.address ? (sponsor.address as Address) : null,
          instructions,
          onStage,
        });
      }),
    [run],
  );

  /** A transaction Pawket's server builds at `path` for this wallet (POST { account }), signed here and sent. */
  const sendFromServer = useCallback(
    (label: string, path: string): Promise<SendResult | null> =>
      run(label, (owner, onStage) =>
        sendPrepared({
          rpc,
          owner,
          onStage,
          prepare: async () => {
            const response = await fetch(path, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ account: owner.address }),
            });
            const body = (await response.json().catch(() => ({}))) as { transaction?: string; message?: string };
            if (!response.ok || !body.transaction) {
              throw new RelayError(body.message ?? "Pawket could not prepare it. Nothing was sent.", response.status);
            }
            return body.transaction;
          },
        }),
      ),
    [run],
  );

  const reset = useCallback(() => setTx({ stage: "idle" }), []);
  return { tx, send, sendFromServer, reset, busy: isActiveStage(tx.stage) };
}

export type PawketSender = ReturnType<typeof usePawketSend>;
