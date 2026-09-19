import { describe, expect, it } from "vitest";
import {
  formatCountdown,
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

  it("keeps the sign on negative values", () => {
    expect(formatSol(-1_500_000_000n)).toBe("-1.5");
    expect(formatSol(-1n)).toBe("-0.000000001");
  });
});

describe("formatCountdown", () => {
  it("renders m:ss with zero-padded seconds", () => {
    expect(formatCountdown(90)).toBe("1:30");
    expect(formatCountdown(7)).toBe("0:07");
    expect(formatCountdown(1800)).toBe("30:00");
    expect(formatCountdown(-5)).toBe("0:00");
  });
});

describe("parseSolToLamports", () => {  it("parses valid amounts to BigInt lamports", () => {
    expect(parseSolToLamports("0.001")).toBe(1_000_000n);
    expect(parseSolToLamports("2")).toBe(2_000_000_000n);
    expect(parseSolToLamports("  1.5  ")).toBe(1_500_000_000n);
    expect(parseSolToLamports(".5")).toBe(500_000_000n);
  });

  it("rejects zero, negative, excess precision, and garbage", () => {
    expect(parseSolToLamports("0")).toBeNull();
    expect(parseSolToLamports("-1")).toBeNull();
    expect(parseSolToLamports("0.0000000001")).toBeNull();
    expect(parseSolToLamports("abc")).toBeNull();
    expect(parseSolToLamports("")).toBeNull();
    expect(parseSolToLamports("5.")).toBeNull();
    expect(parseSolToLamports("1e3")).toBeNull();
  });

  it("rejects amounts that cannot fit in u64 lamports", () => {
    expect(parseSolToLamports("18446744074")).toBeNull();
  });
});
