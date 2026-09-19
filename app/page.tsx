import Link from "next/link";
import { NetworkBadge } from "@/components/network-badge";
import { PetAvatar } from "@/components/pet/pet-avatar";
import { APP_VERSION } from "@/config/site";
import { PetMood, PetPersonality, PetSpecies } from "@/lib/game/enums";

function PawMark() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 26 26">
      <ellipse cx="13" cy="16.5" rx="5.4" ry="4.4" fill="#fcd34d" />
      <circle cx="5.6" cy="10.5" r="2.3" fill="#fcd34d" opacity="0.85" />
      <circle cx="10.2" cy="6.8" r="2.3" fill="#fcd34d" opacity="0.85" />
      <circle cx="15.8" cy="6.8" r="2.3" fill="#fcd34d" opacity="0.85" />
      <circle cx="20.4" cy="10.5" r="2.3" fill="#fcd34d" opacity="0.85" />
    </svg>
  );
}

const COMPANIONS = [
  { name: "Nova", species: PetSpecies.LunaCat, personality: PetPersonality.Curious, mood: PetMood.Radiant },
  { name: "Moss", species: PetSpecies.MossPup, personality: PetPersonality.Brave, mood: PetMood.Happy },
  { name: "Cirrus", species: PetSpecies.CloudBun, personality: PetPersonality.Cozy, mood: PetMood.Okay },
];

const RITUAL = [
  { title: "Feed", body: "A warm meal. Fullness restored." },
  { title: "Play", body: "A good romp. Happiness up." },
  { title: "Groom", body: "Brush and shine. Back to sleek." },
  { title: "Rest", body: "A quiet nap. Energy returns." },
];

/**
 * Landing only. One headline, one action, real product art — nothing that
 * doesn't exist yet. Server Component; no client boundary on this page.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-5">
      <header className="flex h-16 items-center justify-between gap-4 sm:h-[72px]">
        <p className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-slate-100">
          <PawMark />
          Pawket
        </p>
        <NetworkBadge />
      </header>

      <section className="flex flex-col items-center pt-14 text-center sm:pt-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-200/80">
          A Solana companion
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tighter text-slate-50 sm:text-6xl">
          A companion that <em>lives</em> on Solana.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
          Adopt one in seconds. Feed it, play with it, keep it glowing. No
          wallet needed.
        </p>
        <a
          href="#ritual"
          className="mt-7 inline-block rounded-full bg-amber-300 px-6 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-200 active:scale-[0.98]"
        >
          See the daily ritual
        </a>

        <div
          aria-label="Three Pawket companions"
          className="mt-12 flex items-end justify-center gap-2 sm:gap-6"
        >
          {COMPANIONS.map((c, i) => (
            <div
              key={c.name}
              className={
                i === 1
                  ? "animate-breathe rounded-[20px] border border-white/10 bg-white/5 px-4 pb-2 pt-4"
                  : "rounded-[20px] border border-white/5 bg-white/[0.03] px-3 pb-1 pt-3 opacity-90"
              }
            >
              <PetAvatar
                species={c.species}
                personality={c.personality}
                mood={c.mood}
                name={c.name}
                size={i === 1 ? 168 : 128}
              />
              <p className="pb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {c.name}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="ritual" aria-label="The daily ritual" className="py-20 sm:py-28">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
          Four small acts, every day.
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-white/10 bg-white/10 lg:grid-cols-4">
          {RITUAL.map((r) => (
            <div key={r.title} className="bg-[#0e0b1c] p-6 sm:p-8">
              <p className="text-base font-bold text-slate-100">{r.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{r.body}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-md text-center text-sm leading-relaxed text-slate-500">
          Vitals fade while you are away. There is no death, only a companion
          that misses you.
        </p>
      </section>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-6 text-sm text-slate-500">
        <p>Today it lives in your browser. Tomorrow, on-chain.</p>
        <p className="flex items-center gap-3">
          <span className="font-mono text-xs">v{APP_VERSION}</span>
          <Link href="/api/health" className="font-medium text-amber-200/80 underline">
            status
          </Link>
        </p>
      </footer>
    </main>
  );
}
