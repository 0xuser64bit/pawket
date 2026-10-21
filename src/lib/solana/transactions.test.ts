import {
  getSolanaErrorFromTransactionError,
  SolanaError,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
} from "@solana/kit";
import { describe, expect, it, vi } from "vitest";
import {
  extractProgramErrorCode,
  isActiveStage,
  isInsufficientFunds,
  isUserRejection,
  mobileWalletErrorCode,
  mobileWalletProblem,
  pawketErrorMessage,
  settleSignature,
  toUserFacingError,
  waitForConfirmation,
} from "./transactions";

describe("transaction errors", () => {
  it("detects user rejection", () => {
    expect(isUserRejection(new Error("User rejected the request"))).toBe(true);
    expect(isUserRejection(new Error("boom"))).toBe(false);
  });

  const mwa = (name: string, code: string | number, message = "wallet said so") =>
    new Error(message, { cause: Object.assign(new Error(message), { name, code }) });

  it("reads a phone wallet's refusal by its code, whatever its words", () => {
    expect(isUserRejection(mwa("SolanaMobileWalletAdapterProtocolError", -3, "transaction not signed"))).toBe(true);
    expect(isUserRejection(mwa("SolanaMobileWalletAdapterProtocolError", -1, "authorization request failed"))).toBe(true);
    expect(isUserRejection(mwa("SolanaMobileWalletAdapterError", "ERROR_ASSOCIATION_CANCELLED"))).toBe(true);
    expect(isUserRejection(mwa("SolanaMobileWalletAdapterProtocolError", -2, "invalid payloads"))).toBe(false);
    expect(mobileWalletErrorCode(mwa("SomethingElse", -3))).toBeNull();
  });

  it("says what went wrong reaching a phone wallet, and that nothing was sent", () => {
    expect(toUserFacingError(mwa("SolanaMobileWalletAdapterError", "ERROR_WALLET_NOT_FOUND"))).toMatch(/No wallet app.*Nothing was sent/);
    expect(toUserFacingError(mwa("SolanaMobileWalletAdapterError", "ERROR_SESSION_CLOSED", "The wallet session dropped unexpectedly (1006: )"))).toBe(
      "Your wallet closed before it answered. Nothing was sent.",
    );
    expect(mobileWalletProblem(new Error("boom"))).toBeNull();
  });

  it("does not silently dismiss the adapter's connection timeout as a user decline", () => {
    const timeout = mwa("SolanaMobileWalletAdapterError", "ERROR_ASSOCIATION_CANCELLED", "Wallet connection timed out");
    expect(isUserRejection(timeout)).toBe(false);
    expect(toUserFacingError(timeout)).toMatch(/did not open in time.*Nothing was sent/);
  });

  it("maps program codes to one-sentence copy", () => {
    expect(pawketErrorMessage(6002)).toMatch(/cooling down/);
    expect(pawketErrorMessage(6001)).toMatch(/owner/);
    expect(pawketErrorMessage(9999)).toMatch(/refused/);
  });

  it("extracts embedded program codes", () => {
    expect(extractProgramErrorCode(new Error("custom 6002 here"))).toBe(6002);
    expect(extractProgramErrorCode(new Error("block 1234, then custom 6029"))).toBe(6029);
    expect(extractProgramErrorCode(new Error("nope"))).toBeNull();
  });

  it("finds the code Kit hangs on the cause of a failed simulation", () => {
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

  it("says a dropped connection sent nothing, in words", () => {
    expect(toUserFacingError(new TypeError("Failed to fetch"))).toMatch(/could not reach Solana.*Nothing was sent/);
    expect(toUserFacingError(new Error("wrapped", { cause: new TypeError("NetworkError when attempting to fetch resource.") }))).toMatch(
      /could not reach Solana/,
    );
  });

  it("tells an expired signature from a refusal", () => {
    expect(toUserFacingError(new Error("Transaction simulation failed: Blockhash not found"))).toMatch(/expired/);
    const cause = getSolanaErrorFromTransactionError("BlockhashNotFound");
    Object.defineProperty(cause, "message", { value: "Solana error #7050008" });
    const failed = new SolanaError(SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE, {
      cause,
    } as never);
    expect(toUserFacingError(failed)).toMatch(/expired.*Nothing was sent/);
  });

  it("keeps an unrecognized preflight refusal readable in production", () => {
    const failed = new SolanaError(SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE, {} as never);
    Object.defineProperty(failed, "message", { value: "Solana error #-32002; Decode this error by running …" });
    expect(toUserFacingError(failed)).toMatch(/refused.*before it was sent.*Nothing changed/);
    expect(toUserFacingError(failed)).not.toMatch(/Decode/);
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

  it("a landed program refusal keeps its code, so the player reads its sentence rather than JSON", async () => {
    for (const code of [6013, 6013n]) {
      const client = stubRpc([{ confirmationStatus: "confirmed", err: { InstructionError: [0, { Custom: code }] } }]);
      const error = await waitForConfirmation(client, "sig").catch((caught: unknown) => caught);
      expect(extractProgramErrorCode(error)).toBe(6013);
      expect(toUserFacingError(error)).toBe(pawketErrorMessage(6013));
    }
  });

  it("resolves unknown when the timeout elapses", async () => {
    const client = stubRpc([null]);
    await expect(waitForConfirmation(client, "sig", 10)).resolves.toBe("unknown");
  });

  it("keeps looking up the same signature after a dropped status reply", async () => {
    let calls = 0;
    const client = { rpc: { getSignatureStatuses: () => ({ send: async () => {
      if (++calls === 1) throw new TypeError("Failed to fetch");
      return { value: [{ confirmationStatus: "confirmed", err: null }] };
    } }) } };
    await expect(waitForConfirmation(client, "sig")).resolves.toBe("confirmed");
    expect(calls).toBe(2);
  });

  it("a connection that stays down is unknown, never a failed transaction", async () => {
    const client = { rpc: { getSignatureStatuses: () => ({ send: async () => {
      throw new TypeError("Failed to fetch");
    } }) } };
    await expect(waitForConfirmation(client, "sig", 0)).resolves.toBe("unknown");
  });
});

describe("settleSignature", () => {
  const client = (statuses: unknown[], valid: boolean[]) => {
    let looked = 0;
    let asked = 0;
    return {
      rpc: {
        getSignatureStatuses: () => ({ send: async () => ({ value: [statuses[Math.min(looked++, statuses.length - 1)]] }) }),
        isBlockhashValid: () => ({ send: async () => ({ value: valid[Math.min(asked++, valid.length - 1)] }) }),
      },
    };
  };

  it("is confirmed once Solana records it, however late", async () => {
    vi.useFakeTimers();
    const settling = settleSignature(client([null, null, { confirmationStatus: "confirmed", err: null }], [true]), "sig", "hash");
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(settling).resolves.toBe("confirmed");
    vi.useRealTimers();
  });

  it("is expired when its blockhash ran out with nothing recorded: it can never land", async () => {
    await expect(settleSignature(client([null], [false]), "sig", "hash")).resolves.toBe("expired");
  });

  it("is still unknown when the node keeps not knowing until the deadline", async () => {
    await expect(settleSignature(client([null], [true]), "sig", "hash", 0)).resolves.toBe("unknown");
  });

  it("throws a refusal that landed, like a first confirmation would", async () => {
    await expect(settleSignature(client([{ confirmationStatus: "confirmed", err: { InstructionError: [0, { Custom: 6002 }] } }], [true]), "sig", "hash")).rejects.toMatchObject({ programError: 6002 });
  });
});
