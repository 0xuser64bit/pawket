import Link from "next/link";
import { NetworkBadge } from "@/components/network-badge";
import { SolTransferCard } from "@/components/wallet/sol-transfer-card";
import { WalletSection } from "@/components/wallet/wallet-section";

/**
 * Server Component by default — no `"use client"` here. Interactive leaves
 * (`WalletSection`, `SolTransferCard`) carry their own client boundary.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-12">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Pawket · web-first foundation
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          A living companion on Solana
        </h1>
        <p className="max-w-2xl text-base text-slate-600">
          Adopt, care for, and grow an on-chain companion from the browser.
          This foundation proves the shell, wallet plumbing, and transaction
          path — product features build on top.
        </p>
        <NetworkBadge />
      </header>

      <WalletSection />
      <SolTransferCard />

      <footer className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <p>Nothing here spends without your explicit signature.</p>
        <Link href="/api/health" className="font-medium text-sky-700 underline">
          /api/health
        </Link>
      </footer>
    </main>
  );
}
