"use client";

import { useMemo, useState } from "react";
import {
  PetPersonality,
  PetSpecies,
} from "@/lib/game/enums";
import { normalizePetName } from "@/lib/solana/pda";
import type { AdoptGuestInput } from "@/lib/guest/pet";

const SPECIES: Array<{ value: PetSpecies; label: string; hint: string }> = [
  { value: PetSpecies.LunaCat, label: "Luna cat", hint: "Night-eyed and curious" },
  { value: PetSpecies.MossPup, label: "Moss pup", hint: "Loyal, loves the rain" },
  { value: PetSpecies.CloudBun, label: "Cloud bun", hint: "Soft, drifts off often" },
];

const PERSONALITIES: Array<{ value: PetPersonality; label: string }> = [
  { value: PetPersonality.Curious, label: "Curious" },
  { value: PetPersonality.Cozy, label: "Cozy" },
  { value: PetPersonality.Brave, label: "Brave" },
  { value: PetPersonality.Mischief, label: "Mischief" },
];

interface GuestAdoptFormProps {
  onAdopt: (input: AdoptGuestInput) => void;
}

function nameError(name: string): string | null {
  try {
    normalizePetName(name);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "That name doesn't work.";
  }
}

/**
 * Wallet-free adoption. Names follow the on-chain rule so a guest pet can
 * graduate to a PDA adoption later without renaming.
 */
export function GuestAdoptForm({ onAdopt }: GuestAdoptFormProps) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<PetSpecies>(PetSpecies.LunaCat);
  const [personality, setPersonality] = useState<PetPersonality>(
    PetPersonality.Curious,
  );
  const [touched, setTouched] = useState(false);

  const error = useMemo(
    () => (touched || name ? nameError(name) : null),
    [name, touched],
  );

  return (
    <form
      aria-label="Adopt a guest companion"
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (nameError(name)) return;
        onAdopt({ name, species, personality });
      }}
    >
      <div className="space-y-2">
        <label
          htmlFor="guest-name"
          className="text-sm font-semibold text-slate-200"
        >
          Name your companion
        </label>
        <input
          id="guest-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="e.g. Mochi"
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "guest-name-error" : undefined}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-1 focus:ring-amber-300/60"
        />
        {error ? (
          <p id="guest-name-error" role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            2–24 characters. No wallet needed — this companion lives in your
            browser.
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-200">Species</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SPECIES.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm transition ${
                species === option.value
                  ? "border-amber-300/70 bg-amber-300/10 text-slate-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
              }`}
            >
              <input
                type="radio"
                name="species"
                value={option.value}
                checked={species === option.value}
                onChange={() => setSpecies(option.value)}
                className="sr-only"
              />
              <span className="block font-semibold">{option.label}</span>
              <span className="block text-xs opacity-70">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-200">
          Personality
        </legend>
        <div className="flex flex-wrap gap-2">
          {PERSONALITIES.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm transition ${
                personality === option.value
                  ? "border-amber-300/70 bg-amber-300/10 font-semibold text-slate-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
              }`}
            >
              <input
                type="radio"
                name="personality"
                value={option.value}
                checked={personality === option.value}
                onChange={() => setPersonality(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={Boolean(error) || !name}
        className="w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Adopt companion
      </button>
    </form>
  );
}
