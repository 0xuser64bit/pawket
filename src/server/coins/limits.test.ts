// @vitest-environment node
import { describe, expect, it } from "vitest";
import { coinLimit } from "./limits";

const NOW = 1_790_000_000_000;
const HOUR = 60 * 60 * 1000;

describe("coin limits", () => {
  it("keeps a quote allowance separate from a trade allowance", () => {
    const caller = "198.51.100.7";
    for (let i = 0; i < 240; i++) expect(coinLimit("quote", caller, NOW)).toBe(true);
    expect(coinLimit("quote", caller, NOW)).toBe(false);
    expect(coinLimit("trade", caller, NOW)).toBe(true);
  });

  it("counts both the caller and the account on a write", () => {
    for (let i = 0; i < 120; i++) expect(coinLimit("trade", ["198.51.100.8", "shared-account"], NOW)).toBe(true);
    expect(coinLimit("trade", ["203.0.113.9", "shared-account"], NOW)).toBe(false);
    expect(coinLimit("trade", ["198.51.100.8", "another-account"], NOW)).toBe(false);
    expect(coinLimit("trade", ["203.0.113.9", "another-account"], NOW)).toBe(true);
  });

  it("starts counting again after the window", () => {
    const caller = "2001:db8:1:2::/64";
    for (let i = 0; i < 240; i++) coinLimit("position", caller, NOW);
    expect(coinLimit("position", caller, NOW + HOUR - 1)).toBe(false);
    expect(coinLimit("position", caller, NOW + HOUR)).toBe(true);
  });
});
