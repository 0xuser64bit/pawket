// @vitest-environment node
import { expect, it, vi } from "vitest";

it("web3.js and Anchor load, and a read answers, under the pinned overrides", async () => {
  const { Connection, PublicKey } = await import("@solana/web3.js");
  await Promise.all([import("@meteora-ag/dynamic-bonding-curve-sdk"), import("@meteora-ag/cp-amm-sdk")]);
  const fetch = vi.fn(async (_url: string, init?: { body?: unknown }) => {
    const { id } = JSON.parse(String(init?.body)) as { id: string };
    return new Response(JSON.stringify({ jsonrpc: "2.0", id, result: { context: { slot: 1 }, value: 42 } }), { headers: { "content-type": "application/json" } });
  });
  const connection = new Connection("https://rpc.invalid", { commitment: "confirmed", fetch: fetch as never });
  await expect(connection.getBalance(new PublicKey("11111111111111111111111111111111"))).resolves.toBe(42);
  expect(fetch).toHaveBeenCalledOnce();
});
