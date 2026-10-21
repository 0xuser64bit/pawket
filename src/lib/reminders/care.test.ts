import { describe, expect, it } from "vitest";
import { PetMood } from "@/lib/game/enums";
import { careReminder, firstNeed } from "./care";

const even = { hunger: 72, happiness: 72, energy: 72, hygiene: 72 };
const HUNGRY_AFTER_MS = 68_401_000;

function petDue(name: string, due: Date) {
  return { name, stats: even, statsUpdatedAt: new Date(due.getTime() - HUNGRY_AFTER_MS).toISOString() };
}

describe("the first need", () => {
  it("is the second the mood first turns, by the program's decay", () => {
    expect(firstNeed({ stats: even, statsUpdatedAt: "2026-10-18T00:00:00.000Z" })).toEqual({
      at: new Date("2026-10-18T19:00:01.000Z"),
      mood: PetMood.Hungry,
    });
    expect(firstNeed({ stats: { ...even, energy: 20 }, statsUpdatedAt: "2026-10-18T00:00:00.000Z" })).toEqual({
      at: new Date("2026-10-18T00:00:00.000Z"),
      mood: PetMood.Tired,
    });
    expect(firstNeed({ stats: even, statsUpdatedAt: "not a time" })).toBeNull();
  });
});

describe("the one reminder", () => {
  it("names the pet that needs care first, in the words Home uses", () => {
    const due = new Date(2026, 9, 18, 15, 0, 0);
    const reminder = careReminder([petDue("Pepper", new Date(2026, 9, 18, 17, 0, 0)), petDue("Mango", due)], new Date(2026, 9, 18, 8, 0, 0));
    expect(reminder).toEqual({ at: due, title: "Mango is hungry. A meal would help.", text: "An estimate of time away. Look in on them at home." });
  });

  it("waits for a waking hour", () => {
    const now = new Date(2026, 9, 18, 8, 0, 0);
    expect(careReminder([petDue("Mango", new Date(2026, 9, 18, 22, 30, 0))], now)?.at).toEqual(new Date(2026, 9, 19, 9, 0, 0));
    expect(careReminder([petDue("Mango", new Date(2026, 9, 18, 21, 0, 0))], now)?.at).toEqual(new Date(2026, 9, 19, 9, 0, 0));
    expect(careReminder([petDue("Mango", new Date(2026, 9, 19, 6, 0, 0))], now)?.at).toEqual(new Date(2026, 9, 19, 9, 0, 0));
    expect(careReminder([petDue("Mango", new Date(2026, 9, 18, 20, 59, 0))], now)?.at).toEqual(new Date(2026, 9, 18, 20, 59, 0));
  });

  it("comes no sooner than an hour after the player was here", () => {
    const now = new Date(2026, 9, 18, 14, 0, 0);
    expect(careReminder([petDue("Mango", new Date(2026, 9, 18, 9, 0, 0))], now)?.at).toEqual(new Date(2026, 9, 18, 15, 0, 0));
    expect(careReminder([petDue("Mango", new Date(2026, 9, 18, 20, 30, 0))], new Date(2026, 9, 18, 20, 0, 0))?.at).toEqual(
      new Date(2026, 9, 19, 9, 0, 0),
    );
  });

  it("has nothing to say without a pet", () => {
    expect(careReminder([], new Date())).toBeNull();
  });
});
