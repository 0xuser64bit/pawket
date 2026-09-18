import { describe, expect, it } from "vitest";
import {
  formatSol,
  parseSolToLamports,
  truncateAddress,
} from "./format";

describe("truncateAddress", () => {
  it("truncates long values and passes short ones through", () => {
    expect(truncateAddress("7C6FJ44NqBgJwnhjfKWeqRbqefVxWtv6GrcvyCwteCrF")).toBe(
      "7C6F…eCrF",
    );
    expect(truncateAddress("abc")).toBe("abc");
  });
});

describe("formatSol", () => {
  it("formats whole and fractional lamports without float math", () => {
    expect(formatSol(1_000_000_000n)).toBe("1");
    expect(formatSol(1_500_000_000n)).toBe("1.5");
    expect(formatSol(1n)).toBe("0.000000001");
    expect(formatSol(0n)).toBe("0");
  });
});

describe("parseSolToLamports", () => {
  it("parses valid amounts to BigInt lamports", () => {
    expect(parseSolToLamports("0.001")).toBe(1_000_000n);
    expect(parseSolToLamports("2")).toBe(2_000_000_000n);
    expect(parseSolToLamports("  1.5  ")).toBe(1_500_000_000n);
  });

  it("rejects zero, negative, excess precision, and garbage", () => {
    expect(parseSolToLamports("0")).toBeNull();
    expect(parseSolToLamports("-1")).toBeNull();
    expect(parseSolToLamports("0.0000000001")).toBeNull();
    expect(parseSolToLamports("abc")).toBeNull();
    expect(parseSolToLamports("")).toBeNull();
  });
});
