import { describe, expect, it } from "vitest";
import { explorerAddressUrl, explorerTxUrl, isGenesisOf } from "./cluster";

describe("which cluster a node is", () => {
  it("is told by its genesis hash, and a local node is none of the shared ones", () => {
    expect(isGenesisOf("devnet", "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG")).toBe(true);
    expect(isGenesisOf("mainnet-beta", "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG")).toBe(false);
    expect(isGenesisOf("mainnet-beta", "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d")).toBe(true);
    expect(isGenesisOf("devnet", "localnet")).toBe(false);
  });
});

describe("explorer links", () => {
  it("targets devnet with the cluster param", () => {
    expect(explorerTxUrl("sig123", "devnet")).toBe(
      "https://explorer.solana.com/tx/sig123?cluster=devnet",
    );
  });

  it("omits the cluster param on mainnet-beta", () => {
    expect(explorerAddressUrl("addr", "mainnet-beta")).toBe(
      "https://explorer.solana.com/address/addr",
    );
  });

  it("points localnet at the local validator", () => {
    expect(explorerTxUrl("sig123", "localnet")).toContain("cluster=custom");
  });
});
