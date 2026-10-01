import {
  getSolanaErrorFromTransactionError,
  SolanaError,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
} from "@solana/kit";
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
    expect(pawketErrorMessage(9999)).toMatch(/refused/);
  });

  it("extracts embedded program codes", () => {
    expect(extractProgramErrorCode(new Error("custom 6002 here"))).toBe(6002);
    expect(extractProgramErrorCode(new Error("nope"))).toBeNull();
  });

  it("finds the code Kit hangs on the cause of a failed simulation", () => {
    // The simulation fields do not matter here; the cause is the point.
    const failed = new SolanaError(SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE, {
      cause: getSolanaErrorFromTransactionError({ InstructionError: [0, { Custom: 6002 }] }),
    } as never);
    expect(failed.message).not.toMatch(/6002/);
    expect(extractProgramErrorCode(failed)).toBe(6002);
    expect(toUserFacingError(failed)).toMatch(/cooling down/);
  });

  it("reads hex codes from logs, Anchor's error number, and the sponsor's relay", () => {
    expect(extractProgramErrorCode(new Error("custom program error: 0x1773"))).toBe(6003);
    expect(extractProgramErrorCode(new Error("custom program error: 0x0"))).toBeNull();
    expect(extractProgramErrorCode(new Error("Error Code: NotPetOwner. Error Number: 6001."))).toBe(6001);
    expect(extractProgramErrorCode(Object.assign(new Error("refused"), { programError: 6000 }))).toBe(6000);
    expect(extractProgramErrorCode(Object.assign(new Error("refused"), { programError: 42 }))).toBeNull();
  });

  it("says what did not change", () => {
    for (const code of [6000, 6001, 6002, 6003, 9999]) {
      expect(pawketErrorMessage(code)).toMatch(/Nothing/);
    }
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
