import Link from "next/link";
import { CompanionChamber } from "@/components/pet/companion-chamber";
import { OnchainAdoptPanel } from "@/components/pet/onchain-adopt-panel";
import { NetworkBadge } from "@/components/network-badge";
import { SolTransferCard } from "@/components/wallet/sol-transfer-card";
import { WalletSection } from "@/components/wallet/wallet-section";
import { APP_VERSION } from "@/config/site";

function PawMark() {
  return (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 26 26">
      <ellipse cx="13" cy="16.5" rx="5.4" ry="4.4" fill="#fcd34d" />
      <circle cx="5.6" cy="10.5" r="2.3" fill="#fcd34d" opacity="0.85" />
      <circle cx="10.2" cy="6.8" r="2.3" fill="#fcd34d" opacity="0.85" />
      <circle cx="15.8" cy="6.8" r="2.3" fill="#fcd34d" opacity="0.85" />
      <circle cx="20.4" cy="10.5" r="2.3" fill="#fcd34d" opacity="0.85" />
    </svg>
  );
}

const STEPS = [
  {
    title: "Adopt free",
    body: "Name a guest companion. No wallet, no signature — it lives in this browser.",
  },
  {
    title: "Care daily",
    body: "Feed, play, groom, rest. Vitals fade while you're away; cooldowns keep it honest.",
  },
  {
    title: "Go on-chain",
    body: "Connect a wallet to adopt on Solana. You sign exactly once, then watch it confirm.",
  },
];

/**
 * Server Component by default — no `"use client"` here. Interactive leaves
 * carry their own client boundary.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-100">
          <PawMark />
          Pawket
        </p>
        <NetworkBadge />
      </header>

      <section className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
          A living companion on Solana
        </h1>
        <p className="text-base leading-relaxed text-slate-400">
          Adopt a guest companion in seconds and keep it thriving with daily
          care — or connect a wallet and bring a companion on-chain. Every
          send is simulated first, signed by you, and linked to the Explorer.
        </p>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CompanionChamber />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <OnchainAdoptPanel />
        </div>
      </div>

      <section aria-label="How it works" className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <div
            key={step.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <p className="font-mono text-xs font-bold text-amber-300/80">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-1 text-base font-bold text-slate-100">
              {step.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              {step.body}
            </p>
          </div>
        ))}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <WalletSection />
        <SolTransferCard />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-5 text-sm text-slate-500">
        <p>Nothing here spends without your explicit signature.</p>
        <p className="flex items-center gap-3">
          <span className="font-mono text-xs">v{APP_VERSION}</span>
          <Link href="/api/health" className="font-medium text-amber-200/90 underline">
            /api/health
          </Link>
        </p>
      </footer>
    </main>
  );
}
