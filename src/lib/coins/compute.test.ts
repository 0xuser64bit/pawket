import { describe, expect, it } from "vitest";
import {
  COIN_COMPUTE_LIMITS,
  COIN_PRIORITY_FEE_MAX_MICRO_LAMPORTS,
  COIN_PRIORITY_FEE_MICRO_LAMPORTS,
  coinComputeLimit,
} from "./compute";

describe("coin compute budgets", () => {
  it("caps each operation at its own ceiling", () => {
    expect(coinComputeLimit("trade")).toBe(400_000);
    expect(coinComputeLimit("launch")).toBe(600_000);
    expect(coinComputeLimit("graduate")).toBe(600_000);
    expect(coinComputeLimit("claim")).toBe(300_000);
    expect(Object.values(COIN_COMPUTE_LIMITS).every((units) => units > 0 && units <= 600_000)).toBe(true);
  });

  it("keeps the default priority fee at or below the cap", () => {
    expect(COIN_PRIORITY_FEE_MICRO_LAMPORTS).toBeGreaterThan(0n);
    expect(COIN_PRIORITY_FEE_MICRO_LAMPORTS).toBeLessThanOrEqual(COIN_PRIORITY_FEE_MAX_MICRO_LAMPORTS);
  });
});
