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
      "FQwe9LUPMTrhYyr32mHPpX87tcpjr98Eamz9wJQDaSef",
    );
  });

  it("rejects unknown clusters instead of silently misrouting", () => {
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER = "marsnet";
    __resetEnvCacheForTests();
    expect(() => getPublicEnv()).toThrow();
  });
});
