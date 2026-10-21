import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyStatDecay, calculateLevelFromXp, elapsedSecondsBetween } from "@/lib/game/math";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import { applyGuestCare, createGuestPet, recordPlay, streakAsOf, type GuestPet } from "./pet";

const SCRIPT = readFileSync(path.join(process.cwd(), "src/lib/game/lockstep.txt"), "utf8");
const ADOPTED_AT = Date.UTC(2026, 9, 1, 10, 0, 0);
const at = (seconds: number) => new Date(ADOPTED_AT + seconds * 1000);

function record(pet: GuestPet, now: Date): Record<string, number> {
  return {
    ...pet.stats,
    xp: pet.xp,
    level: calculateLevelFromXp(pet.xp),
    streak: streakAsOf(pet.streak, now).count,
    plays: pet.plays,
  };
}

function fields(parts: string[]): Record<string, number> {
  return Object.fromEntries(parts.map((part) => {
    const [key, value] = part.split("=");
    return [key, Number(value)];
  }));
}

describe("lockstep with the program", () => {
  it("replays lockstep.txt to the same numbers", () => {
    let pet = createGuestPet({
      name: "Lockstep",
      species: PetSpecies.LunaCat,
      personality: PetPersonality.Curious,
      now: at(0),
    });
    let clock = 0;
    let checked = 0;

    for (const raw of SCRIPT.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const [head, ...rest] = line.split(/\s+/);

      if (head === "expect") {
        expect(record(pet, at(clock)), line).toEqual(fields(rest));
        checked++;
        continue;
      }
      if (head === "project") {
        const [when, ...wanted] = rest;
        const elapsed = elapsedSecondsBetween(pet.statsUpdatedAt, at(Number(when)));
        expect(applyStatDecay(pet.stats, elapsed), line).toEqual(fields(wanted));
        checked++;
        continue;
      }

      clock = Number(head);
      const [act, refused] = rest;
      if (act === "round") {
        pet = recordPlay(pet, at(clock)).pet;
        continue;
      }
      const result = applyGuestCare(pet, act as CareActionType, at(clock));
      expect(result.ok, line).toBe(refused !== "cooldown");
      if (result.ok) pet = result.pet;
    }

    expect(checked).toBeGreaterThanOrEqual(7);
  });
});
