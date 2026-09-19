import { describe, expect, it } from "vitest";
import {
  extractProgramErrorCode,
  isInsufficientFunds,
  isUserRejection,
  pawketErrorMessage,
  toUserFacingError,
} from "./transactions";

describe("transaction errors", () => {
  it("detects user rejection", () => {
    expect(isUserRejection(new Error("User rejected the request"))).toBe(true);
    expect(isUserRejection(new Error("boom"))).toBe(false);
  });

  it("maps program codes to one-sentence copy", () => {
    expect(pawketErrorMessage(6002)).toMatch(/cooling down/);
    expect(pawketErrorMessage(6001)).toMatch(/owner/);
    expect(pawketErrorMessage(9999)).toMatch(/rejected/);
  });

  it("extracts embedded program codes", () => {
    expect(extractProgramErrorCode(new Error("custom 6002 here"))).toBe(6002);
    expect(extractProgramErrorCode(new Error("nope"))).toBeNull();
  });

  it("prefers the rejection message, then program copy", () => {
    expect(toUserFacingError(new Error("User rejected"))).toMatch(/declined/);
    expect(toUserFacingError(new Error("failed with 6001"))).toMatch(/owner/);
    expect(toUserFacingError("plain string")).toBe("plain string");
  });

  it("does not mistake slot numbers or hex fragments for program codes", () => {
    expect(extractProgramErrorCode(new Error("Slot 60025 root confirmed"))).toBeNull();
    expect(extractProgramErrorCode(new Error("signature 5x6002ab"))).toBeNull();
  });

  it("anchors insufficient-funds detection to real failure text", () => {
    expect(
      isInsufficientFunds(new Error("custom program error: 0x1")),
    ).toBe(true);
    expect(isInsufficientFunds(new Error("Insufficient funds for fee"))).toBe(
      true,
    );
    expect(isInsufficientFunds(new Error("transfer 0x1 tokens"))).toBe(false);
  });
});
