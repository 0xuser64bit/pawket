import { describe, expect, it } from "vitest";
import {
  dayTurnsAt,
  formatAgo,
  formatCountdown,
  formatSol,
  formatUtcDate,
  nameHeadingClass,
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

describe("formatUtcDate", () => {
  it("formats a UTC calendar date and refuses a bad value", () => {
    expect(formatUtcDate("2026-09-23T23:30:00.000Z")).toBe("23 Sep 2026");
    expect(formatUtcDate("not-a-date")).toBe("");
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

describe("formatAgo", () => {
  it("reads like a feed", () => {
    expect(formatAgo(-5)).toBe("just now");
    expect(formatAgo(59)).toBe("just now");
    expect(formatAgo(600)).toBe("10 min ago");
    expect(formatAgo(7200)).toBe("2 h ago");
    expect(formatAgo(86_400)).toBe("1 day ago");
    expect(formatAgo(3 * 86_400 + 5)).toBe("3 days ago");
  });
});

describe("parseUnits / formatUnits", () => {
  it("reads a coin's six places and a SOL amount's nine, and nothing past them", async () => {
    const { parseUnits } = await import("./format");
    expect(parseUnits("1.5", 6)).toBe(1_500_000n);
    expect(parseUnits("1,000", 6)).toBe(1_000_000_000n);
    expect(parseUnits(".000001", 6)).toBe(1n);
    expect(parseUnits("0.0000001", 6)).toBeNull();
    expect(parseUnits("0", 6)).toBeNull();
    expect(parseUnits("1e5", 6)).toBeNull();
    expect(parseUnits("0.1", 9)).toBe(100_000_000n);
  });

  it("groups thousands and drops trailing zeros", async () => {
    const { formatUnits } = await import("./format");
    expect(formatUnits(1_234_567_890n, 6, 2)).toBe("1,234.56");
    expect(formatUnits("1000000000", 9)).toBe("1");
    expect(formatUnits(1_500_000n, 6)).toBe("1.5");
    expect(formatUnits(999n, 6, 2)).toBe("0");
  });
});

describe("dayTurnsAt", () => {
  const evening = new Date("2026-10-17T15:20:00Z");
  it("says the UTC rollover in the viewer's own clock", () => {
    expect(dayTurnsAt(evening, { locale: "en-US", timeZone: "America/Los_Angeles" })).toBe("at 5:00 PM here");
    expect(dayTurnsAt(evening, { locale: "en-GB", timeZone: "Asia/Kolkata" })).toBe("at 5:30 here");
  });
  it("is midnight where local time is UTC", () => {
    expect(dayTurnsAt(evening, { locale: "en-GB", timeZone: "UTC" })).toBe("at midnight");
  });
  it("counts from the UTC day it is now, even late in the local evening", () => {
    // 01:00 UTC on the 18th is still the 17th in Los Angeles; the next turn is the 19th's UTC midnight.
    expect(dayTurnsAt(new Date("2026-10-18T01:00:00Z"), { locale: "en-US", timeZone: "America/Los_Angeles" })).toBe("at 5:00 PM here");
  });
});

describe("nameHeadingClass", () => {
  it("steps a name's heading down only when a word in it is too long for a phone", () => {
    expect(nameHeadingClass("Pepper")).toBe("display-l");
    expect(nameHeadingClass("Sir Wigglesworth Pickles")).toBe("display-m");
    expect(nameHeadingClass("Mr Whiskers Jr")).toBe("display-l");
    expect(nameHeadingClass("Wigglesworth", "display-hero", "display-l")).toBe("display-l");
  });
});
