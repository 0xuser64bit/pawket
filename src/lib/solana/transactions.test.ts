import { describe, expect, it } from "vitest";
import {
  extractProgramErrorCode,
  isActiveStage,
  isInsufficientFunds,
  isUserRejection,
  pawketErrorMessage,
  toUserFacingError,
  waitForConfirmation,
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

  it("classifies active stages", () => {
    expect(isActiveStage("signing")).toBe(true);
    expect(isActiveStage("sending")).toBe(true);
    expect(isActiveStage("confirming")).toBe(true);
    expect(isActiveStage("idle")).toBe(false);
    expect(isActiveStage("confirmed")).toBe(false);
    expect(isActiveStage("unknown")).toBe(false);
    expect(isActiveStage("failed")).toBe(false);
  });
});

describe("waitForConfirmation", () => {
  function stubRpc(statuses: Array<unknown>) {
    let calls = 0;
    return {
      rpc: {
        getSignatureStatuses: () => ({
          send: async () => {
            const value = statuses[Math.min(calls, statuses.length - 1)];
            calls += 1;
            return { value: [value] };
          },
        }),
      },
    };
  }

  it("confirms on finalized status", async () => {
    const client = stubRpc([{ confirmationStatus: "finalized", err: null }]);
    await expect(waitForConfirmation(client, "sig")).resolves.toBe("confirmed");
  });

  it("throws when the transaction recorded an on-chain error", async () => {
    const client = stubRpc([
      { confirmationStatus: "confirmed", err: { InstructionError: [0, "Custom"] } },
    ]);
    await expect(waitForConfirmation(client, "sig")).rejects.toThrow();
  });

  it("resolves unknown when the timeout elapses", async () => {
    const client = stubRpc([null]);
    await expect(waitForConfirmation(client, "sig", 10)).resolves.toBe("unknown");
  });
});
