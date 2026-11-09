import { describe, expect, it } from "vitest";
import { graduationPlan, KEEPER_DEFAULT_LIMIT, KEEPER_HARD_CAP, keeperLimit, type GraduationCandidate } from "./keeper";

const CONFIG = "AyvaZmnBDpDfRDXZqXjHbcJKUq1WPLfGL4hT79miBkLJ";
const OTHER = "Hv8Lmzmnju6m7kcokVKvwqz7QPmdX9XfKjJsXz8RXcjp";

function candidate(overrides: Partial<GraduationCandidate> = {}): GraduationCandidate {
  return { pool: "pool-a", config: CONFIG, raised: 1_000n, threshold: 1_000n, migrated: false, ...overrides };
}

describe("a graduation plan", () => {
  it("takes only unmigrated, offered pools that reached their threshold", () => {
    const plan = graduationPlan(
      [
        candidate({ pool: "ready" }),
        candidate({ pool: "below", raised: 999n }),
        candidate({ pool: "migrated", migrated: true }),
        candidate({ pool: "other-config", config: OTHER }),
        candidate({ pool: "no-threshold", threshold: 0n, raised: 0n }),
      ],
      10,
      [CONFIG],
    );
    expect(plan.map((entry) => entry.pool)).toEqual(["ready"]);
  });

  it("orders by pool address and stops at the cap", () => {
    const plan = graduationPlan(
      [
        candidate({ pool: "c" }),
        candidate({ pool: "a" }),
        candidate({ pool: "b" }),
      ],
      2,
      [CONFIG],
    );
    expect(plan.map((entry) => entry.pool)).toEqual(["a", "b"]);
  });

  it("never returns more than a non-positive cap", () => {
    expect(graduationPlan([candidate()], 0, [CONFIG])).toEqual([]);
    expect(graduationPlan([candidate()], -1, [CONFIG])).toEqual([]);
  });
});

describe("the keeper's run limit", () => {
  it("defaults to one and treats a malformed value as one", () => {
    expect(keeperLimit({})).toBe(KEEPER_DEFAULT_LIMIT);
    expect(keeperLimit({ MAX_GRADUATIONS: "" })).toBe(KEEPER_DEFAULT_LIMIT);
    expect(keeperLimit({ MAX_GRADUATIONS: "many" })).toBe(KEEPER_DEFAULT_LIMIT);
    expect(keeperLimit({ MAX_GRADUATIONS: "2.5" })).toBe(KEEPER_DEFAULT_LIMIT);
    expect(keeperLimit({ MAX_GRADUATIONS: "0" })).toBe(KEEPER_DEFAULT_LIMIT);
  });

  it("accepts a value inside the cap and clamps one above it", () => {
    expect(keeperLimit({ MAX_GRADUATIONS: "3" })).toBe(3);
    expect(keeperLimit({ MAX_GRADUATIONS: String(KEEPER_HARD_CAP + 1) })).toBe(KEEPER_HARD_CAP);
    expect(keeperLimit({ MAX_GRADUATIONS: "999999999999999999999" })).toBe(KEEPER_HARD_CAP);
  });
});
