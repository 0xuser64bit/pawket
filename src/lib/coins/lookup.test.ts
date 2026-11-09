import { describe, expect, it } from "vitest";
import { isUsableCoinLookup, type CoinLookupTable } from "./lookup";

const CONFIGURED = "Ai62VAmD447gFxcfwz7Q2fMEefsaLBQwjeZaJJ6qh5oR";
const U64_MAX = (1n << 64n) - 1n;

function table(overrides: Partial<CoinLookupTable["state"]> = {}, key = CONFIGURED): CoinLookupTable {
  return {
    key: { toBase58: () => key },
    state: { deactivationSlot: U64_MAX, addresses: [{}, {}], ...overrides },
  };
}

describe("a graduation lookup table", () => {
  it("is usable when it is the configured table, frozen and active", () => {
    expect(isUsableCoinLookup(table(), CONFIGURED)).toBe(true);
  });

  it("is not usable once deactivated", () => {
    expect(isUsableCoinLookup(table({ deactivationSlot: 5n }), CONFIGURED)).toBe(false);
  });

  it("is not usable while an authority can still rewrite it", () => {
    expect(isUsableCoinLookup(table({ authority: {} }), CONFIGURED)).toBe(false);
  });

  it("is not usable when it holds no addresses", () => {
    expect(isUsableCoinLookup(table({ addresses: [] }), CONFIGURED)).toBe(false);
  });

  it("is not usable when it is not the configured table", () => {
    expect(isUsableCoinLookup(table({}, "11111111111111111111111111111111"), CONFIGURED)).toBe(false);
  });
});
