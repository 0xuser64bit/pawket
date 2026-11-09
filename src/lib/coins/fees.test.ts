import { describe, expect, it } from "vitest";
import { graduatedFeeLine, totalTradingFees } from "./fees";

describe("a coin's trading fees", () => {
  it("keeps the curve's total before graduation", () => {
    expect(totalTradingFees(123n, null)).toBe(123n);
    expect(totalTradingFees(123n, undefined)).toBe(123n);
  });

  it("adds the graduated pool's lifetime LP and protocol quote fees", () => {
    expect(totalTradingFees(100n, { totalLpBFee: 20n, totalProtocolBFee: 3n })).toBe(123n);
    expect(totalTradingFees(100n, { totalLpBFee: { toString: () => "20" }, totalProtocolBFee: { toString: () => "3" } })).toBe(123n);
  });

  it("reports the base and the dynamic-fee maximum", () => {
    const line = graduatedFeeLine();
    expect(line).toContain("1%");
    expect(line).toContain("1.2%");
    expect(line).toContain("dynamic fee");
  });
});
