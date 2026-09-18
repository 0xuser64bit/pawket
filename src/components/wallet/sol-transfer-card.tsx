"use client";

import { address, lamports } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import { useState } from "react";
import type { AppClient } from "@/lib/solana/browser-client";
import { getPublicEnv } from "@/config/env";
import { explorerTxUrl } from "@/lib/solana/cluster";
import { toUserFacingError } from "@/lib/solana/transactions";
import { parseSolToLamports } from "@/lib/utils/format";
import { TransactionStatus } from "@/components/transaction-status";
import type { TransactionStage } from "@/lib/solana/transactions";

/**
 * Minimal representative send flow: proves wallet signing, simulation,
 * confirmation handling, error mapping, and Explorer linking end to end.
 * This is foundation verification — not a product feature.
 */
export function SolTransferCard() {
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const env = getPublicEnv();

  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [stage, setStage] = useState<TransactionStage>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSending =
    stage === "simulating" ||
    stage === "signing" ||
    stage === "sending" ||
    stage === "confirming";

  async function sendSol() {
    if (!connected?.signer) {
      setStage("failed");
      setError("Connect a wallet first.");
      return;
    }
    const amountLamports = parseSolToLamports(amount);
    if (amountLamports === null) {
      setStage("failed");
      setError("Enter an amount greater than 0 (up to 9 decimals).");
      return;
    }
    const dest = destination.trim();
    if (!dest) {
      setStage("failed");
      setError("Enter a destination address.");
      return;
    }

    setError(null);
    setSignature(null);
    setStage("signing");
    try {
      const instruction = getTransferSolInstruction({
        source: connected.signer,
        destination: address(dest),
        amount: lamports(amountLamports),
      });
      // The Kit executor simulates (preflight) before sending by default.
      setStage("sending");
      const result = await client.sendTransaction([instruction]);
      setSignature(result.context.signature);
      setStage("confirmed");
      setAmount("0.001");
    } catch (err) {
      setStage("failed");
      setError(toUserFacingError(err));
    }
  }

  return (
    <section
      aria-label="SOL transfer verification"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Foundation check · devnet
        </p>
        <h2 className="text-xl font-semibold text-slate-900">
          Send SOL with the connected wallet
        </h2>
        <p className="text-sm text-slate-600">
          {connected
            ? "Uses the connected signer as fee payer. Simulated before send."
            : "Connect a wallet above to enable sending."}
        </p>
      </div>

      <div className="space-y-2">
        <label
          className="text-sm font-semibold text-slate-800"
          htmlFor="sol-destination"
        >
          Destination address
        </label>
        <input
          id="sol-destination"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          placeholder="Destination wallet address"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800" htmlFor="sol-amount">
          Amount (SOL)
        </label>
        <input
          id="sol-amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          type="number"
          min="0"
          step="0.001"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => void sendSol()}
          disabled={!connected?.signer || isSending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? "Sending…" : "Send SOL"}
        </button>
      </div>

      <TransactionStatus
        stage={stage}
        signature={signature}
        error={error}
        explorerUrl={
          signature ? explorerTxUrl(signature, env.solanaCluster) : null
        }
      />
    </section>
  );
}
