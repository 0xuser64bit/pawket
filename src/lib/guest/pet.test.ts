import { beforeEach, describe, expect, it } from "vitest";
import { CARE_COOLDOWN_SECONDS } from "@/lib/game/constants";
import {
  CareActionType,
  PetMood,
  PetPersonality,
  PetSpecies,
} from "@/lib/game/enums";
import { DAILY_GOAL_REWARD_XP } from "@/lib/game/constants";
import {
  applyGuestCare,
  cooldownsFor,
  createGuestPet,
  migrateStoredPet,
  nameTaken,
  projectGuestPet,
  recordPlay,
  setWearing,
  streakAsOf,
  todayFor,
} from "./pet";
import { loadPets, readPet, readPetsSnapshot, removePet, savePet } from "./storage";

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
    expect(pet.version).toBe(2);
    expect(pet.careLog).toEqual([]);
    expect(pet.streak).toEqual({ count: 0, lastDay: null });
    expect(pet.wearing).toBeNull();
  });

  it("derives the same id from the same name and instant", () => {
    const now = new Date("2026-09-19T12:00:00Z");
    const a = createGuestPet({ ...INPUT, now });
    const b = createGuestPet({ ...INPUT, now });
    expect(a.id).toBe(b.id);
    expect(a.id.length).toBeGreaterThan(0);
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
    expect(result.pet.careLog).toEqual([
      { action: CareActionType.Feed, at: now.toISOString(), xpGained: 10 },
    ]);
    expect(result.pet.streak).toEqual({ count: 1, lastDay: "2026-09-19" });
  });

  it("keeps a streak across UTC days and starts over after a gap", () => {
    const first = new Date("2026-02-28T18:00:00Z");
    const created = createGuestPet({ ...INPUT, now: first });
    const day1 = applyGuestCare(created, CareActionType.Feed, first);
    if (!day1.ok) return;
    const day2 = applyGuestCare(
      day1.pet,
      CareActionType.Feed,
      new Date("2026-03-01T01:00:00Z"),
    );
    if (!day2.ok) return;
    expect(day2.pet.streak.count).toBe(2);

    const sameDay = applyGuestCare(
      day2.pet,
      CareActionType.Play,
      new Date("2026-03-01T08:00:00Z"),
    );
    if (!sameDay.ok) return;
    expect(sameDay.pet.streak.count).toBe(2);

    const afterGap = applyGuestCare(
      sameDay.pet,
      CareActionType.Feed,
      new Date("2026-03-03T08:00:00Z"),
    );
    if (!afterGap.ok) return;
    expect(afterGap.pet.streak).toEqual({ count: 1, lastDay: "2026-03-03" });
  });

  it("prints a streak that has already lapsed as zero", () => {
    const pet = createGuestPet({ ...INPUT, now });
    const cared = applyGuestCare(pet, CareActionType.Feed, now);
    if (!cared.ok) return;
    expect(streakAsOf(cared.pet.streak, now)).toEqual({ count: 1, activeToday: true });
    expect(streakAsOf(cared.pet.streak, new Date("2026-09-20T12:00:00Z"))).toEqual({
      count: 1,
      activeToday: false,
    });
    expect(streakAsOf(cared.pet.streak, new Date("2026-09-21T12:00:00Z"))).toEqual({
      count: 0,
      activeToday: false,
    });
  });

  it("keeps only the latest care entries", () => {
    let pet = createGuestPet({ ...INPUT, now });
    for (let i = 0; i < 45; i++) {
      const at = new Date(now.getTime() + i * (CARE_COOLDOWN_SECONDS + 1) * 1000);
      const action = i % 2 === 0 ? CareActionType.Feed : CareActionType.Rest;
      const result = applyGuestCare(pet, action, at);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      pet = result.pet;
    }
    expect(pet.careLog).toHaveLength(40);
    expect(pet.careLog[0]?.at).not.toBe(now.toISOString());
    expect(pet.careLog.at(-1)?.action).toBe(CareActionType.Feed);
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
    // The bar is this level's width, not the cumulative threshold (200).
    expect(live.xpForNext).toBe(100);
  });
});

describe("wardrobe and play", () => {
  const now = new Date("2026-09-19T12:00:00Z");

  it("wears a known look and ignores anything else", () => {
    const pet = createGuestPet({ ...INPUT, now });
    const worn = setWearing(pet, "wool-scarf");
    expect(worn.wearing).toBe("wool-scarf");
    expect(worn.stats).toEqual(pet.stats);
    expect(setWearing(worn, "wool-scarf").wearing).toBeNull();
    expect(setWearing(pet, "stat-cape")).toBe(pet);
    expect(setWearing(worn, null).wearing).toBeNull();
  });

  it("grants the daily play bonus once per UTC day without touching vitals", () => {
    const pet = createGuestPet({ ...INPUT, now });
    const first = recordPlay(pet, now);
    expect(first.xpGained).toBe(DAILY_GOAL_REWARD_XP);
    expect(first.pet.xp).toBe(DAILY_GOAL_REWARD_XP);
    expect(first.pet.plays).toBe(1);
    expect(first.pet.stats).toEqual(pet.stats);
    expect(first.pet.streak).toEqual({ count: 1, lastDay: "2026-09-19" });

    const again = recordPlay(first.pet, new Date("2026-09-19T23:00:00Z"));
    expect(again.xpGained).toBe(0);
    expect(again.pet.plays).toBe(2);
    expect(again.pet.xp).toBe(DAILY_GOAL_REWARD_XP);

    const next = recordPlay(again.pet, new Date("2026-09-20T00:30:00Z"));
    expect(next.xpGained).toBe(DAILY_GOAL_REWARD_XP);
    expect(next.pet.streak.count).toBe(2);
  });
});

describe("migrateStoredPet", () => {
  it("upgrades a version-1 blob without inventing a history", () => {
    const legacy = {
      version: 1,
      name: "Mochi",
      species: PetSpecies.LunaCat,
      personality: PetPersonality.Curious,
      stats: { hunger: 72, happiness: 72, energy: 72, hygiene: 72 },
      xp: 10,
      createdAt: "2026-09-19T12:00:00.000Z",
      statsUpdatedAt: "2026-09-19T12:00:00.000Z",
      lastActionAt: {
        feed: "2026-09-19T12:00:00.000Z",
        play: null,
        groom: null,
        rest: null,
      },
    };
    const pet = migrateStoredPet(legacy);
    expect(pet?.version).toBe(2);
    expect(pet?.name).toBe("Mochi");
    expect(pet?.xp).toBe(10);
    expect(pet?.lastActionAt.feed).toBe(legacy.lastActionAt.feed);
    expect(pet?.careLog).toEqual([]);
    expect(pet?.streak).toEqual({ count: 0, lastDay: null });
    expect(pet?.id).toBe(migrateStoredPet(legacy)?.id);
  });

  it("drops an unknown wearable and a broken log line, and keeps the pet", () => {
    const pet = createGuestPet(INPUT);
    const raw = {
      ...pet,
      wearing: "not-a-look",
      careLog: [...pet.careLog, { action: "feed", at: "nope", xpGained: 10 }, "nope"],
    };
    const loaded = migrateStoredPet(raw);
    expect(loaded?.wearing).toBeNull();
    expect(loaded?.name).toBe(pet.name);
  });

  it("returns null for garbage", () => {
    expect(migrateStoredPet(null)).toBeNull();
    expect(migrateStoredPet({ name: "x" })).toBeNull();
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

describe("todayFor", () => {
  it("ticks each care given and the round finished on today's UTC day, and nothing from yesterday", () => {
    const morning = new Date("2026-10-03T08:00:00Z");
    let pet = createGuestPet({ ...INPUT, now: new Date("2026-10-02T20:00:00Z") });
    const fed = applyGuestCare(pet, CareActionType.Feed, new Date("2026-10-02T23:59:00Z"));
    if (fed.ok) pet = fed.pet;
    expect(todayFor(pet, morning)).toMatchObject({ done: 0, of: 5, round: false });
    const played = applyGuestCare(pet, CareActionType.Play, morning);
    if (played.ok) pet = played.pet;
    pet = recordPlay(pet, morning).pet;
    const today = todayFor(pet, morning);
    expect(today.cares[CareActionType.Play]).toBe(true);
    expect(today.cares[CareActionType.Feed]).toBe(false);
    expect(today.round).toBe(true);
    expect(today.done).toBe(2);
  });
});

describe("nameTaken", () => {
  it("matches a name already used, whatever its case or spaces", () => {
    const pets = [{ name: "Pepper" }, { name: "Miso" }];
    expect(nameTaken(pets, "pepper")).toBe(true);
    expect(nameTaken(pets, "  MISO ")).toBe(true);
    expect(nameTaken(pets, "Peppers")).toBe(false);
    expect(nameTaken([], "Pepper")).toBe(false);
  });
});

describe("pet storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps as many pets as are adopted, oldest first", () => {
    const pepper = createGuestPet({ ...INPUT, name: "Pepper", now: new Date("2026-09-19T12:00:00Z") });
    const miso = createGuestPet({ ...INPUT, name: "Miso", now: new Date("2026-09-20T12:00:00Z") });
    expect(savePet(pepper)).toBe(true);
    expect(savePet(miso)).toBe(true);
    expect(loadPets().map((p) => p.name)).toEqual(["Pepper", "Miso"]);
  });

  it("replaces a pet in place when it is saved again", () => {
    const pepper = createGuestPet({ ...INPUT, name: "Pepper" });
    const miso = createGuestPet({ ...INPUT, name: "Miso" });
    savePet(pepper);
    savePet(miso);
    savePet({ ...pepper, xp: 40 });
    expect(loadPets().map((p) => [p.name, p.xp])).toEqual([
      ["Pepper", 40],
      ["Miso", 0],
    ]);
    expect(readPet(pepper.id)?.xp).toBe(40);
  });

  it("lets one pet go and keeps the rest", () => {
    const pepper = createGuestPet({ ...INPUT, name: "Pepper" });
    const miso = createGuestPet({ ...INPUT, name: "Miso" });
    savePet(pepper);
    savePet(miso);
    removePet(pepper.id);
    expect(loadPets().map((p) => p.name)).toEqual(["Miso"]);
    expect(readPet(pepper.id)).toBeNull();
  });

  it("moves the one pet from before into the list, and only then forgets the old key", () => {
    const pet = createGuestPet(INPUT);
    window.localStorage.setItem("pawket.guest-pet.v1", JSON.stringify(pet));
    expect(loadPets()).toEqual([pet]);
    expect(window.localStorage.getItem("pawket.guest-pet.v1")).toBeNull();
    expect(JSON.parse(window.localStorage.getItem("pawket.pets.v1")!)).toEqual([pet]);
  });

  it("drops a damaged entry and keeps the others", () => {
    const pet = createGuestPet(INPUT);
    window.localStorage.setItem("pawket.pets.v1", JSON.stringify([{ name: 3 }, pet, pet]));
    expect(loadPets()).toEqual([pet]);
  });

  it("returns nothing and clears a list that is not JSON", () => {
    window.localStorage.setItem("pawket.pets.v1", "{broken");
    expect(loadPets()).toEqual([]);
    expect(window.localStorage.getItem("pawket.pets.v1")).toBeNull();
  });

  it("refuses to store an invalid record", () => {
    expect(savePet({ ...createGuestPet(INPUT), xp: -1 })).toBe(false);
    expect(loadPets()).toEqual([]);
  });

  it("hands useSyncExternalStore the same array until something changes", () => {
    savePet(createGuestPet(INPUT));
    const first = readPetsSnapshot();
    expect(readPetsSnapshot()).toBe(first);
    savePet(createGuestPet({ ...INPUT, name: "Miso" }));
    expect(readPetsSnapshot()).not.toBe(first);
    expect(readPetsSnapshot()).toHaveLength(2);
  });
});
