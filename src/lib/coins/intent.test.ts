// @vitest-environment node
import { getAddressEncoder } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { decodeFrozenCoinLookup } from "./intent";

describe("independent coin lookup reads", () => {
  const key = "So11111111111111111111111111111111111111112" as Parameters<ReturnType<typeof getAddressEncoder>["encode"]>[0];
  function frozen() {
    const data = new Uint8Array(88);
    data[0] = 1;
    data.fill(255, 4, 12);
    data.set(getAddressEncoder().encode(key), 56);
    return data;
  }
  it("decodes the on-chain frozen table layout, refusing mutable, deactivating, wrong-type and truncated accounts", () => {
    expect(decodeFrozenCoinLookup(frozen())).toEqual([key]);
    for (const mutate of [
      (data: Uint8Array) => { data[21] = 1; return data; },
      (data: Uint8Array) => { data[4] = 0; return data; },
      (data: Uint8Array) => { data[0] = 2; return data; },
      (data: Uint8Array) => data.slice(0, 87),
      (data: Uint8Array) => data.slice(0, 55),
    ]) expect(() => decodeFrozenCoinLookup(mutate(frozen()))).toThrow();
  });
});
