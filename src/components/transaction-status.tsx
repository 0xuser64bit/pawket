import type { TransactionStage } from "@/lib/solana/transactions";

interface TransactionStatusProps {
  stage: TransactionStage;
  signature?: string | null;
  error?: string | null;
  explorerUrl?: string | null;
}

const STAGE_LABELS: Record<TransactionStage, string> = {
  idle: "Ready",
  simulating: "Simulating…",
  signing: "Waiting for wallet signature…",
  sending: "Sending…",
  confirming: "Confirming…",
  confirmed: "Confirmed",
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
  if (stage === "idle") return null;

  const isActive =
    stage === "simulating" ||
    stage === "signing" ||
    stage === "sending" ||
    stage === "confirming";

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        stage === "failed"
          ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
          : stage === "confirmed"
            ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            : "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
      }
    >
      <p className="font-semibold">
        {STAGE_LABELS[stage]}
        {isActive ? (
          <span aria-hidden="true" className="ml-2 inline-block animate-pulse">
            ●
          </span>
        ) : null}
      </p>
      {signature && explorerUrl ? (
        <a
          className="font-medium text-sky-700 underline"
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
        >
          View on Solana Explorer →
        </a>
      ) : null}
      {stage === "failed" && error ? <p>{error}</p> : null}
    </div>
  );
}
