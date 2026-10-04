import { afterEach, describe, expect, it } from "vitest";
import { __resetEnvCacheForTests, getPublicEnv } from "./env";

const KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SOLANA_CLUSTER",
  "NEXT_PUBLIC_SOLANA_RPC_URL",
  "NEXT_PUBLIC_SOLANA_WS_URL",
  "NEXT_PUBLIC_PAWKET_PROGRAM_ID",
];

const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  __resetEnvCacheForTests();
});

describe("getPublicEnv", () => {
  it("defaults to devnet with the known program ID", () => {
    for (const k of KEYS) delete process.env[k];
    __resetEnvCacheForTests();
    const env = getPublicEnv();
    expect(env.solanaCluster).toBe("devnet");
    expect(env.solanaRpcUrl).toBe("https://api.devnet.solana.com");
    expect(env.pawketProgramId).toBe(
      "PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74",
    );
  });

  it("rejects unknown clusters instead of silently misrouting", () => {
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER = "marsnet";
    __resetEnvCacheForTests();
    expect(() => getPublicEnv()).toThrow();
  });

  it("treats empty-string values as unset so defaults apply", () => {
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER = "";
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = "   ";
    process.env.NEXT_PUBLIC_PAWKET_PROGRAM_ID = "";
    __resetEnvCacheForTests();
    const env = getPublicEnv();
    expect(env.solanaCluster).toBe("devnet");
    expect(env.solanaRpcUrl).toBe("https://api.devnet.solana.com");
    expect(env.pawketProgramId).toBe(
      "PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74",
    );
  });

  it("rejects a cluster/RPC mismatch instead of silently misrouting", () => {
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER = "devnet";
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL =
      "https://api.mainnet-beta.solana.com";
    __resetEnvCacheForTests();
    expect(() => getPublicEnv()).toThrow(/mainnet-beta.*devnet|devnet.*mainnet-beta/);
  });

  it("rejects a malformed program ID at startup, not deep in PDA code", () => {
    process.env.NEXT_PUBLIC_PAWKET_PROGRAM_ID = "not-an-address!!";
    __resetEnvCacheForTests();
    expect(() => getPublicEnv()).toThrow();
  });
});

describe("guildReportUrl", () => {
  it("opens a prefilled issue that names the guild and says what Pawket can and cannot do", async () => {
    const { guildReportUrl } = await import("./site");
    const url = new URL(guildReportUrl({ slug: "sunbeam-club", name: "Sunbeam Club" }, "https://pawket-pets.vercel.app/guilds/sunbeam-club"));
    expect(url.pathname).toBe("/0xuser64bit/pawket/issues/new");
    expect(url.searchParams.get("title")).toBe("Report: Sunbeam Club (sunbeam-club)");
    expect(url.searchParams.get("body")).toContain("cannot remove it from Solana");
  });
});
