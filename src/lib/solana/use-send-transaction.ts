"use client";

import { useClient } from "@solana/react";
import { useCallback, useState } from "react";
import type { Instruction } from "@solana/kit";
import type { AppClient } from "./browser-client";
import {
  CONFIRMATION_TIMEOUT_MS,
  isActiveStage,
  toUserFacingError,
  waitForConfirmation,
  type ConfirmationOutcome,
  type TransactionStage,
} from "./transactions";

export interface SendResult {
  outcome: ConfirmationOutcome | "failed";
  signature: string | null;
}

/**
 * The one sanctioned send path. Every send flow uses this — no ad-hoc
 * `client.sendTransaction` calls in feature components:
 *
 * signing → sending → confirming → confirmed | unknown | failed
 *
 * `build` runs before signing (validation, PDA derivation, instruction
 * building). Confirmation is a real status wait with a 30s timeout that
 * resolves to `unknown`, never `failed`. Callers refresh from the source
 * of truth on `confirmed` — no optimistic state.
 */
export function useSendTransaction() {
  const client = useClient<AppClient>();
  const [stage, setStage] = useState<TransactionStage>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (
      build: () => Promise<Instruction> | Instruction,
      options: { confirmationTimeoutMs?: number } = {},
    ): Promise<SendResult> => {
      setError(null);
      setSignature(null);
      setStage("signing");
      try {
        const instruction = await build();
        setStage("sending");
        const result = await client.sendTransaction([instruction]);
        const sig = result.context.signature;
        setSignature(sig);
        setStage("confirming");
        const outcome = await waitForConfirmation(
          client,
          sig,
          options.confirmationTimeoutMs ?? CONFIRMATION_TIMEOUT_MS,
        );
        setStage(outcome === "confirmed" ? "confirmed" : "unknown");
        return { outcome, signature: sig };
      } catch (err) {
        setStage("failed");
        setError(toUserFacingError(err));
        return { outcome: "failed", signature: null };
      }
    },
    [client],
  );

  const reset = useCallback(() => {
    setStage("idle");
    setSignature(null);
    setError(null);
  }, []);

  return { stage, signature, error, send, reset, isSending: isActiveStage(stage) };
}
