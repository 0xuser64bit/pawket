import { describe, expect, it } from "vitest";
import {
  defaultWsUrl,
  explorerAddressUrl,
  explorerTxUrl,
} from "./cluster";

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

describe("defaultWsUrl", () => {
  it("derives the subscriptions endpoint from the RPC URL", () => {
    expect(defaultWsUrl("https://api.devnet.solana.com")).toBe(
      "wss://api.devnet.solana.com",
    );
    expect(defaultWsUrl("http://127.0.0.1:8899")).toBe("ws://127.0.0.1:8899");
  });
});
