"use client";

import { lamports } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import { useState } from "react";
import type { Address } from "@solana/kit";
import type { AppClient } from "@/lib/solana/browser-client";
import { getPublicEnv } from "@/config/env";
import { explorerTxUrl } from "@/lib/solana/cluster";
import { parseAddress } from "@/lib/solana/pda";
import { useSendTransaction } from "@/lib/solana/use-send-transaction";
import { parseSolToLamports } from "@/lib/utils/format";
import { useMounted } from "@/lib/utils/use-mounted";
import { TransactionStatus } from "@/components/transaction-status";

/**
 * Minimal representative send flow: proves wallet signing, simulation,
 * confirmation handling, error mapping, and Explorer linking end to end.
 * This is foundation verification — not a product feature.
 */
export function SolTransferCard() {
  const client = useClient<AppClient>();
  const mounted = useMounted();
  const connectedAccount = useConnectedWallet(client);
  // Server and first client render agree (disconnected); wallet state swaps
  // in after mount — the same hydration gate as the connect button.
  const connected = mounted ? connectedAccount : null;
  const env = getPublicEnv();
  const { stage, signature, error, send, isSending } = useSendTransaction();

  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("0.001");

  async function sendSol() {
    const amountLamports = parseSolToLamports(amount);
    let dest: Address | null = null;
    try {
      dest = destination.trim() ? parseAddress(destination.trim(), "destination") : null;
    } catch {
      dest = null;
    }
    if (!connected?.signer || amountLamports === null || !dest) return;
    const signer = connected.signer;
    const finalDest: Address = dest;
    const { outcome } = await send(() =>
      getTransferSolInstruction({
        source: signer,
        destination: finalDest,
        amount: lamports(amountLamports),
      }),
    );
    if (outcome === "confirmed") {
      setDestination("");
      setAmount("0.001");
    }
    // Any terminal outcome changes the balance — the display refreshes itself.
    window.dispatchEvent(new CustomEvent("pawket:transfer-settled"));
  }

  const amountValid = parseSolToLamports(amount) !== null;
  let destinationError: string | null = null;
  if (destination.trim()) {
    try {
      parseAddress(destination.trim(), "destination");
    } catch {
      destinationError = "Enter a valid Solana address.";
    }
  }

  return (
    <section
      aria-label="SOL transfer verification"
      className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur sm:p-6"
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/90">
          Foundation check · {env.solanaCluster}
        </p>
        <h2 className="text-xl font-bold text-slate-100">
          Send SOL with the connected wallet
        </h2>
        <p className="text-sm text-slate-400">
          {connected
            ? "Uses the connected signer as fee payer. Simulated before send."
            : "Connect a wallet above to enable sending."}
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void sendSol();
        }}
      >
        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-slate-200"
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
            disabled={isSending}
            aria-invalid={destinationError ? true : undefined}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-1 focus:ring-amber-300/60 disabled:opacity-50"
          />
          {destinationError ? (
            <p role="alert" className="text-sm font-medium text-rose-300">
              {destinationError}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200" htmlFor="sol-amount">
            Amount (SOL)
          </label>
          <input
            id="sol-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="text"
            inputMode="decimal"
            placeholder="0.001"
            autoComplete="off"
            disabled={isSending}
            aria-invalid={!amountValid || undefined}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-1 focus:ring-amber-300/60 disabled:opacity-50"
          />
          {!amountValid ? (
            <p role="alert" className="text-sm font-medium text-rose-300">
              Enter an amount greater than 0 (up to 9 decimals).
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="submit"
            disabled={!connected?.signer || isSending || !amountValid || Boolean(destinationError) || !destination.trim()}
            className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSending ? "Sending…" : "Send SOL"}
          </button>
        </div>
      </form>

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
