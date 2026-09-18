import { describe, expect, it } from "vitest";
import {
  extractProgramErrorCode,
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
});
