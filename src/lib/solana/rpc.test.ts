import { SolanaError, SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR, type RpcTransport } from "@solana/kit";
import { describe, expect, it } from "vitest";
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
