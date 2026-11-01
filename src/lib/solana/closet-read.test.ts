import { createRpc, createSolanaRpcApi, type Address, type RpcTransport } from "@solana/kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCloset } from "./accounts";

const owner = "11111111111111111111111111111111" as Address;
afterEach(() => vi.restoreAllMocks());

describe("closet read cancellation", () => {
  function transport() {
    let started!: (signal: AbortSignal | undefined) => void;
    const signal = new Promise<AbortSignal | undefined>((resolve) => { started = resolve; });
    const send: RpcTransport = ({ signal }) => {
      started(signal);
      return new Promise((_, reject) => {
        signal?.throwIfAborted();
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    };
    return { rpc: createRpc({ api: createSolanaRpcApi(), transport: send }), signal };
  }

  it("propagates lifecycle cancellation to the actual Kit transport", async () => {
    const { rpc, signal } = transport();
    const controller = new AbortController();
    const pending = fetchCloset(rpc, owner, controller.signal);
    const rejection = expect(pending).rejects.toThrow("No longer needed");
    expect(await signal).toBeInstanceOf(AbortSignal);
    controller.abort(new Error("No longer needed"));
    await rejection;
  });

  it("bounds reads with an application deadline even without a lifecycle signal", async () => {
    const timeout = new AbortController();
    const deadline = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
    const { rpc, signal } = transport();
    const pending = fetchCloset(rpc, owner);
    const rejection = expect(pending).rejects.toThrow("Read timed out");
    await signal;
    try {
      expect(deadline).toHaveBeenCalledWith(30_000);
    } finally {
      timeout.abort(new Error("Read timed out"));
      await rejection;
    }
  });
});
