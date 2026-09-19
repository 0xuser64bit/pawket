"use client";

import { useState } from "react";
import { CareActionType, type PetStats } from "@/lib/game/enums";
import { cooldownsFor } from "@/lib/guest/pet";
import { useGuestPet } from "@/lib/guest/use-guest-pet";
import { formatCountdown } from "@/lib/utils/format";
import { GuestAdoptForm } from "./guest-adopt-form";
import { PetAvatar } from "./pet-avatar";

const ACTIONS: Array<{ type: CareActionType; label: string; hint: string }> = [
  { type: CareActionType.Feed, label: "Feed", hint: "A warm meal" },
  { type: CareActionType.Play, label: "Play", hint: "A good romp" },
  { type: CareActionType.Groom, label: "Groom", hint: "Brush and shine" },
  { type: CareActionType.Rest, label: "Rest", hint: "A quiet nap" },
];

const STATS: Array<{ key: keyof PetStats; label: string }> = [
  { key: "hunger", label: "Fullness" },
  { key: "happiness", label: "Happiness" },
  { key: "energy", label: "Energy" },
  { key: "hygiene", label: "Hygiene" },
];

function StatBar({ label, value }: { label: string; value: number }) {
  const low = value < 25;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <span
          className={`font-mono font-bold ${low ? "text-rose-300" : "text-slate-200"}`}
        >
          {value}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className={`h-full rounded-full transition-[width] ${low ? "bg-rose-400" : "bg-amber-300"}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/**
 * The living loop: portrait, vitals, XP, and four care actions with honest
 * cooldown countdowns. Stats are a live estimate — vitals drain while away.
 */
export function CompanionChamber() {
  const { pet, hydrated, now, live, care, adopt, startOver } = useGuestPet();
  const [careError, setCareError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  if (!hydrated) {
    return (
      <div
        aria-label="Loading companion"
        className="h-96 animate-pulse rounded-3xl bg-white/5"
      />
    );
  }

  if (!pet || !live) {
    return (
      <section
        aria-label="Adopt"
        className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/90">
          No wallet needed
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-100">
          Adopt your first companion
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          It lives in this browser and needs you back every day — vitals fade
          while you are away.
        </p>
        <div className="mt-5">
          <GuestAdoptForm onAdopt={adopt} />
        </div>
      </section>
    );
  }

  const cooldowns = cooldownsFor(pet, now);
  const xpPct = Math.round((live.xpIntoLevel / live.xpForNext) * 100);

  return (
    <section
      aria-label={`${pet.name}'s chamber`}
      className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
    >
      <div className="flex flex-col items-center gap-2 px-6 pt-8 text-center">
        <div className="rounded-full bg-amber-300/10 p-4 shadow-[0_0_60px_-10px_rgba(252,211,77,0.5)]">
          <PetAvatar
            species={pet.species}
            personality={pet.personality}
            mood={live.mood}
            name={pet.name}
            size={168}
          />
        </div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
          {pet.name}
        </h2>
        <p className="text-sm text-slate-400">
          Feeling <span className="font-semibold capitalize text-amber-200">{live.mood}</span>
          {" · "}Level {live.level}
          {" · "}{live.xpIntoLevel}/{live.xpForNext} XP
        </p>
        <div
          role="progressbar"
          aria-label="Experience to next level"
          aria-valuenow={live.xpIntoLevel}
          aria-valuemin={0}
          aria-valuemax={live.xpForNext}
          className="h-1.5 w-48 overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-amber-300" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      <div className="grid gap-3 px-6 pt-6 sm:grid-cols-2">
        {STATS.map(({ key, label }) => (
          <StatBar key={key} label={label} value={live.stats[key]} />
        ))}
      </div>
      <p className="px-6 pt-2 text-xs text-slate-500">
        Live estimate — vitals fade while you are away. There is no death, only
        a companion that misses you.
      </p>

      <div className="grid grid-cols-2 gap-2 p-6 sm:grid-cols-4">
        {ACTIONS.map(({ type, label, hint }) => {
          const remaining = cooldowns[type];
          const ready = remaining <= 0;
          return (
            <button
              key={type}
              type="button"
              disabled={!ready}
              onClick={() => setCareError(care(type))}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:border-amber-300/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="block text-sm font-bold text-slate-100">
                {label}
              </span>
              <span className="block text-xs text-slate-400">
                {ready ? hint : `Ready in ${formatCountdown(remaining)}`}
              </span>
            </button>
          );
        })}
      </div>

      {careError ? (
        <p role="alert" className="px-6 pb-2 text-sm font-medium text-rose-300">
          {careError}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
        <p className="text-xs text-slate-500">
          Saved in this browser ·{" "}
          {pet.personality} {pet.species.replace("_", " ")}
        </p>
        {confirmingReset ? (
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                startOver();
                setConfirmingReset(false);
              }}
              className="rounded-lg bg-rose-400/15 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-400/25"
            >
              Yes, say goodbye
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-slate-200"
          >
            Start over
          </button>
        )}
      </div>
    </section>
  );
}
