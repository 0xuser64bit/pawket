import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BADGES, badgesFor, newlyEarned, type BadgeRecord } from "./badges";
import { CareActionType } from "./enums";

const NEW: BadgeRecord = {
  xp: 0,
  lastActionAt: { [CareActionType.Feed]: null, [CareActionType.Play]: null, [CareActionType.Groom]: null, [CareActionType.Rest]: null },
  streak: { best: 0 },
  plays: 0,
};
const AT = "2026-10-03T08:00:00.000Z";

describe("badges", () => {
  it("gives a new pet nothing", () => {
    expect(badgesFor(NEW)).toEqual([]);
  });

  it("reads each sticker from the record", () => {
    const fed = { ...NEW, lastActionAt: { ...NEW.lastActionAt, [CareActionType.Feed]: AT } };
    expect(badgesFor(fed)).toEqual(["first-meal"]);
    const everything = {
      xp: 1000,
      lastActionAt: { [CareActionType.Feed]: AT, [CareActionType.Play]: AT, [CareActionType.Groom]: AT, [CareActionType.Rest]: AT },
      streak: { best: 7 },
      plays: 10,
    };
    expect(badgesFor(everything, { onChain: true, guild: true })).toEqual(BADGES.map((badge) => badge.id));
  });

  it("names what one care just earned, and nothing already had", () => {
    const fed = { ...NEW, lastActionAt: { ...NEW.lastActionAt, [CareActionType.Feed]: AT } };
    const allFour = {
      ...fed,
      xp: 100,
      lastActionAt: { [CareActionType.Feed]: AT, [CareActionType.Play]: AT, [CareActionType.Groom]: AT, [CareActionType.Rest]: null },
    };
    const rested = { ...allFour, xp: 110, lastActionAt: { ...allFour.lastActionAt, [CareActionType.Rest]: AT } };
    expect(newlyEarned(NEW, fed).map((badge) => badge.id)).toEqual(["first-meal"]);
    expect(newlyEarned(allFour, rested).map((badge) => badge.id)).toEqual(["sweet-dreams", "all-four"]);
    expect(newlyEarned(rested, rested)).toEqual([]);
  });

  it("keeps a run of days once it has been run, whatever the streak is now", () => {
    expect(badgesFor({ ...NEW, streak: { best: 3 } })).toEqual(["three-days"]);
  });

  it("holds levels to the same math as the game", () => {
    expect(badgesFor({ ...NEW, xp: 99 })).not.toContain("growing-up");
    expect(badgesFor({ ...NEW, xp: 100 })).toContain("growing-up");
    expect(badgesFor({ ...NEW, xp: 400 })).toContain("best-friends");
  });

  it("has unique ids and a way to earn every one", () => {
    expect(new Set(BADGES.map((badge) => badge.id)).size).toBe(BADGES.length);
    for (const badge of BADGES) expect(badge.how).toMatch(/\.$/);
  });

  it("never reads a balance, a price or a token", () => {
    const source = fs.readFileSync(path.join(__dirname, "badges.ts"), "utf8");
    expect(source).not.toMatch(/from "@\/lib\/solana|lamports|balance|price/);
  });
});
