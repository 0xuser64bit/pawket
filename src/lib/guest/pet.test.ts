import { beforeEach, describe, expect, it } from "vitest";
import { CARE_COOLDOWN_SECONDS } from "@/lib/game/constants";
import {
  CareActionType,
  PetMood,
  PetPersonality,
  PetSpecies,
} from "@/lib/game/enums";
import {
  applyGuestCare,
  cooldownsFor,
  createGuestPet,
  projectGuestPet,
} from "./pet";
import { clearGuestPet, loadGuestPet, saveGuestPet } from "./storage";

const INPUT = {
  name: "Mochi",
  species: PetSpecies.LunaCat,
  personality: PetPersonality.Curious,
};

describe("createGuestPet", () => {
  it("starts at 72s with zero XP", () => {
    const pet = createGuestPet({ ...INPUT, now: new Date("2026-09-19T12:00:00Z") });
    expect(pet.stats).toEqual({ hunger: 72, happiness: 72, energy: 72, hygiene: 72 });
    expect(pet.xp).toBe(0);
    expect(pet.version).toBe(1);
  });

  it("trims names and rejects invalid ones like the on-chain rule", () => {
    expect(createGuestPet({ ...INPUT, name: "  Mochi  " }).name).toBe("Mochi");
    expect(() => createGuestPet({ ...INPUT, name: "x" })).toThrow();
    expect(() => createGuestPet({ ...INPUT, name: "a".repeat(25) })).toThrow();
  });
});

describe("applyGuestCare", () => {
  const now = new Date("2026-09-19T12:00:00Z");

  it("applies deltas and earns XP", () => {
    const pet = createGuestPet({ ...INPUT, now });
    const result = applyGuestCare(pet, CareActionType.Feed, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pet.stats.hunger).toBe(95);
    expect(result.pet.xp).toBe(10);
    expect(result.xpGained).toBe(10);
  });

  it("blocks a repeat action inside the cooldown window", () => {
    const pet = createGuestPet({ ...INPUT, now });
    const first = applyGuestCare(pet, CareActionType.Play, now);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = applyGuestCare(first.pet, CareActionType.Play, now);
    expect(second.ok).toBe(false);
    // …but a different action is still allowed.
    expect(
      applyGuestCare(first.pet, CareActionType.Groom, now).ok,
    ).toBe(true);
  });

  it("allows the same action after the window", () => {
    const pet = createGuestPet({ ...INPUT, now });
    const first = applyGuestCare(pet, CareActionType.Rest, now);
    if (!first.ok) return;
    const later = new Date(now.getTime() + (CARE_COOLDOWN_SECONDS + 60) * 1000);
    expect(applyGuestCare(first.pet, CareActionType.Rest, later).ok).toBe(true);
  });
});

describe("projectGuestPet", () => {
  it("decays stats forward and derives mood + level", () => {
    const start = new Date("2026-09-18T12:00:00Z");
    const pet = createGuestPet({ ...INPUT, now: start });
    const live = projectGuestPet(pet, new Date("2026-09-19T12:00:00Z"));
    expect(live.stats.hunger).toBe(12);
    expect(live.mood).toBe(PetMood.Hungry);
    expect(live.level).toBe(1);
    expect(live.xpIntoLevel).toBe(0);
    expect(live.xpForNext).toBe(100);
  });

  it("levels up with XP", () => {
    const pet = { ...createGuestPet(INPUT), xp: 135 };
    const live = projectGuestPet(pet);
    expect(live.level).toBe(2);
    expect(live.xpIntoLevel).toBe(35);
  });
});

describe("cooldownsFor", () => {
  it("reports full window right after care, zero when ready", () => {
    const now = new Date("2026-09-19T12:00:00Z");
    const pet = createGuestPet({ ...INPUT, now });
    const cared = applyGuestCare(pet, CareActionType.Feed, now);
    if (!cared.ok) return;
    const cooldowns = cooldownsFor(cared.pet, now);
    expect(cooldowns[CareActionType.Feed]).toBe(CARE_COOLDOWN_SECONDS);
    expect(cooldowns[CareActionType.Play]).toBe(0);
  });
});

describe("guest storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a pet", () => {
    const pet = createGuestPet(INPUT);
    saveGuestPet(pet);
    expect(loadGuestPet()).toEqual(pet);
  });

  it("returns null and clears corrupt entries", () => {
    window.localStorage.setItem("pawket.guest-pet.v1", "{broken");
    expect(loadGuestPet()).toBeNull();
    expect(window.localStorage.getItem("pawket.guest-pet.v1")).toBeNull();
  });

  it("clears on start-over", () => {
    saveGuestPet(createGuestPet(INPUT));
    clearGuestPet();
    expect(loadGuestPet()).toBeNull();
  });
});
