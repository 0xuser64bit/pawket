import { SolanaError, SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR, type RpcTransport } from "@solana/kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { patient } from "./rpc";

const busy = (headers = new Headers()) =>
  new SolanaError(SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR, { headers, message: "Too Many Requests", statusCode: 429 });
const request = { payload: { method: "getSlot" } } as Parameters<RpcTransport>[0];

function scripted(script: unknown[]) {
  const calls: number[] = [];
  const transport = (async () => {
    calls.push(calls.length);
    const next = script[calls.length - 1];
    if (next instanceof Error) throw next;
    return next;
  }) as unknown as RpcTransport;
  return { transport, calls };
}

describe("a patient transport", () => {
  afterEach(() => vi.useRealTimers());

  it("does not start a cancelled request", async () => {
    const reason = new DOMException("No longer needed", "AbortError");
    const { transport, calls } = scripted([{ result: 1 }]);
    await expect(patient(transport)({ ...request, signal: AbortSignal.abort(reason) })).rejects.toBe(reason);
    expect(calls).toHaveLength(0);
  });

  it("cancels a retry wait immediately without leaving a timer or sending again", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const reason = new DOMException("Read timed out", "TimeoutError");
    const { transport, calls } = scripted([busy(new Headers({ "retry-after": "8" })), { result: 1 }]);
    const rejected = vi.fn();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const pending = patient(transport)({ ...request, signal: controller.signal }).catch(rejected);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    controller.abort(reason);
    await vi.advanceTimersByTimeAsync(0);
    expect(rejected).toHaveBeenCalledExactlyOnceWith(reason);
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    await vi.advanceTimersByTimeAsync(8_000);
    await pending;
    expect(calls).toHaveLength(1);
  });

  it("does not wait when the signal was cancelled while a 429 was returning", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const reason = new Error("Cancelled");
    const transport = (async () => {
      controller.abort(reason);
      throw busy();
    }) as RpcTransport;
    const rejected = vi.fn();
    const pending = patient(transport)({ ...request, signal: controller.signal }).catch(rejected);
    await vi.advanceTimersByTimeAsync(0);
    expect(rejected).toHaveBeenCalledExactlyOnceWith(reason);
    expect(vi.getTimerCount()).toBe(0);
    await pending;
  });

  it("removes the abort listener after a retry wait finishes", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const { transport } = scripted([busy(), { result: 7 }]);
    const pending = patient(transport, { wait: () => 50 })({ ...request, signal: controller.signal });
    await vi.advanceTimersByTimeAsync(50);
    await expect(pending).resolves.toEqual({ result: 7 });
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("asks again after a 429, and answers once the node does", async () => {
    const { transport, calls } = scripted([busy(), busy(), { result: 7 }]);
    await expect(patient(transport, { wait: () => 0 })(request)).resolves.toEqual({ result: 7 });
    expect(calls).toHaveLength(3);
  });

  it("gives up after its tries, with the node's own error", async () => {
    const { transport, calls } = scripted([busy(), busy(), busy(), busy(), { result: 1 }]);
    await expect(patient(transport, { wait: () => 0, tries: 3 })(request)).rejects.toThrow();
    expect(calls).toHaveLength(3);
  });

  it("passes any other failure straight through", async () => {
    const other = new SolanaError(SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR, { headers: new Headers(), message: "Bad Gateway", statusCode: 502 });
    const { transport, calls } = scripted([other, { result: 1 }]);
    await expect(patient(transport, { wait: () => 0 })(request)).rejects.toBe(other);
    expect(calls).toHaveLength(1);
  });

  it("waits as long as the node asks", async () => {
    const { transport } = scripted([busy(new Headers({ "retry-after": "0.05" })), { result: 2 }]);
    const started = Date.now();
    await patient(transport, { wait: () => 5_000 })(request);
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});
