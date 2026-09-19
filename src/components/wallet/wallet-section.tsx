"use client";

import { BalanceDisplay } from "./balance-display";
import { WalletConnectButton } from "./wallet-connect-button";

/** Wallet card: connection control + live balance. Client leaf. */
export function WalletSection() {
  return (
    <section
      aria-label="Wallet"
      className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/90">
            Wallet
          </p>
          <p className="text-sm text-slate-400">
            Wallet Standard discovery. Keys never leave the wallet.
          </p>
        </div>
        <div className="sm:w-64">
          <WalletConnectButton />
        </div>
      </div>
      <BalanceDisplay />
    </section>
  );
}
