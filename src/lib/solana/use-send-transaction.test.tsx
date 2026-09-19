"use client";

import { ClientProvider } from "@solana/react";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useSendTransaction } from "./use-send-transaction";

const FAKE_IX = {
  programAddress: "11111111111111111111111111111111",
  accounts: [],
  data: new Uint8Array([1, 2, 3]),
} as never;

function stubClient(options: { sendError?: Error; status?: unknown } = {}) {
  return {
    sendTransaction: async () => {
      if (options.sendError) throw options.sendError;
      return { context: { signature: "sig123" } };
    },
    rpc: {
      getSignatureStatuses: () => ({
        send: async () => ({
          value: [
            "status" in options
              ? options.status
              : { confirmationStatus: "finalized", err: null },
          ],
        }),
      }),
    },
  } as never;
}

function wrapperFor(client: unknown) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ClientProvider client={client as never}>{children}</ClientProvider>;
  };
}

describe("useSendTransaction", () => {
  it("walks signing → sending → confirming → confirmed", async () => {
    const { result } = renderHook(() => useSendTransaction(), {
      wrapper: wrapperFor(stubClient()),
    });
    expect(result.current.stage).toBe("idle");
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.send(() => FAKE_IX);
    });
    expect(outcome).toEqual({ outcome: "confirmed", signature: "sig123" });
    expect(result.current.stage).toBe("confirmed");
    expect(result.current.signature).toBe("sig123");
    expect(result.current.error).toBeNull();
  });

  it("maps a wallet rejection to a failed stage with friendly copy", async () => {
    const { result } = renderHook(() => useSendTransaction(), {
      wrapper: wrapperFor(stubClient({ sendError: new Error("User rejected") })),
    });
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.send(() => FAKE_IX);
    });
    expect(outcome).toEqual({ outcome: "failed", signature: null });
    expect(result.current.stage).toBe("failed");
    expect(result.current.error).toMatch(/declined/);
  });

  it("surfaces unknown when confirmation times out instead of failing", async () => {
    const { result } = renderHook(() => useSendTransaction(), {
      wrapper: wrapperFor(stubClient({ status: null })),
    });
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.send(() => FAKE_IX, {
        confirmationTimeoutMs: 10,
      });
    });
    expect(outcome).toEqual({ outcome: "unknown", signature: "sig123" });
    expect(result.current.stage).toBe("unknown");
    expect(result.current.signature).toBe("sig123");
  });
});
