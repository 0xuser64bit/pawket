"use client";

import { useState } from "react";
import type { TransactionStage } from "@/lib/solana/transactions";
import { truncateAddress } from "@/lib/utils/format";

interface TransactionStatusProps {
  stage: TransactionStage;
  signature?: string | null;
  error?: string | null;
  explorerUrl?: string | null;
}

const STAGE_LABELS: Record<TransactionStage, string> = {
  idle: "Ready",
  signing: "Waiting for wallet signature…",
  sending: "Sending…",
  confirming: "Confirming…",
  confirmed: "Confirmed",
  unknown: "Sent — confirmation timed out",
  failed: "Failed",
};

/**
 * One consistent transaction-status surface. Every send flow renders this —
 * no ad-hoc signature/error markup in feature components.
 */
export function TransactionStatus({
  stage,
  signature,
  error,
  explorerUrl,
}: TransactionStatusProps) {
  const [copied, setCopied] = useState(false);

  if (stage === "idle") return null;

  const isActiveStage =
    stage === "signing" || stage === "sending" || stage === "confirming";

  async function copySignature() {
    if (!signature) return;
    try {
      await navigator.clipboard.writeText(signature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the truncated address + Explorer link remain.
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        stage === "failed"
          ? "rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
          : stage === "confirmed"
            ? "rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200"
            : stage === "unknown"
              ? "rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-200"
              : "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300"
      }
    >
      <p className="font-semibold">
        {STAGE_LABELS[stage]}
        {isActiveStage ? (
          <span aria-hidden="true" className="ml-2 inline-block animate-pulse">
            ●
          </span>
        ) : null}
      </p>
      {stage === "unknown" ? (
        <p>
          The transaction may still land. Check the Explorer link before trying
          again — never re-send blindly.
        </p>
      ) : null}
      {signature ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono" title={signature}>
            {truncateAddress(signature, 6)}
          </span>
          <button
            type="button"
            onClick={() => void copySignature()}
            className="font-medium text-amber-200/90 underline"
          >
            {copied ? "Copied" : "Copy signature"}
          </button>
          {explorerUrl ? (
            <a
              className="font-medium text-amber-200/90 underline"
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
            >
              View on Solana Explorer →
            </a>
          ) : null}
        </p>
      ) : (
        explorerUrl && (
          <a
            className="font-medium text-amber-200/90 underline"
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
          >
            View on Solana Explorer →
          </a>
        )
      )}
      {stage === "failed" ? (
        <p>{error ?? "Try again, or check your wallet activity."}</p>
      ) : null}
    </div>
  );
}
