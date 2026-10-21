import { describe, expect, it } from "vitest";
import { canTrade, coinStage, graduationSegments } from "./stage";

const curve = (raised: bigint, migrated = false) => ({ raised, threshold: 100n, migrated });

describe("a guild coin's stage", () => {
  it("is none until a coin is launched, whatever else is true", () => {
    expect(coinStage({ listed: true, curve: null, graduated: null })).toBe("none");
    expect(coinStage({ listed: false, curve: null, graduated: null })).toBe("none");
  });

  it("is the curve until the threshold is raised", () => {
    expect(coinStage({ listed: true, curve: curve(99n), graduated: null })).toBe("dbc");
  });

  it("pauses once the threshold is raised, and while a migration is not yet checked", () => {
    expect(coinStage({ listed: true, curve: curve(100n), graduated: null })).toBe("pending");
    expect(coinStage({ listed: true, curve: curve(100n, true), graduated: null })).toBe("pending");
    expect(coinStage({ listed: true, curve: curve(100n, true), graduated: { verified: false } })).toBe("pending");
  });

  it("routes to DAMM v2 only once the graduated pool is the one the preset derives", () => {
    expect(coinStage({ listed: true, curve: curve(100n, true), graduated: { verified: true } })).toBe("damm");
  });

  it("is suspended when Pawket delists the guild, at any stage after launch", () => {
    for (const facts of [curve(1n), curve(100n), curve(100n, true)]) {
      expect(coinStage({ listed: false, curve: facts, graduated: { verified: true } })).toBe("suspended");
    }
  });

  it("trades only on the curve or in the verified pool", () => {
    expect(["none", "dbc", "pending", "damm", "suspended"].filter((s) => canTrade(s as never))).toEqual(["dbc", "damm"]);
  });

  it("counts whole segments toward graduation, full only when the threshold is met", () => {
    expect(graduationSegments(0n, 100n)).toBe(0);
    expect(graduationSegments(99n, 100n)).toBe(9);
    expect(graduationSegments(100n, 100n)).toBe(10);
    expect(graduationSegments(500n, 100n)).toBe(10);
    expect(graduationSegments(5n, 0n)).toBe(0);
  });
});
