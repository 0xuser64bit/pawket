import { afterEach, describe, expect, it } from "vitest";
import { __resetEnvCacheForTests, getPublicEnv } from "./env";

const KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SOLANA_CLUSTER",
  "NEXT_PUBLIC_SOLANA_RPC_URL",
  "VERCEL_ENV",
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
  it("defaults to devnet", () => {
    for (const k of KEYS) delete process.env[k];
    __resetEnvCacheForTests();
    const env = getPublicEnv();
    expect(env.solanaCluster).toBe("devnet");
    expect(env.solanaRpcUrl).toBe("https://api.devnet.solana.com");
  });

  it("rejects unknown clusters instead of silently misrouting", () => {
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER = "marsnet";
    __resetEnvCacheForTests();
    expect(() => getPublicEnv()).toThrow();
  });

  it("treats empty-string values as unset so defaults apply", () => {
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER = "";
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = "   ";
    __resetEnvCacheForTests();
    const env = getPublicEnv();
    expect(env.solanaCluster).toBe("devnet");
    expect(env.solanaRpcUrl).toBe("https://api.devnet.solana.com");
  });

  it("rejects a cluster/RPC mismatch instead of silently misrouting", () => {
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER = "devnet";
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL =
      "https://api.mainnet-beta.solana.com";
    __resetEnvCacheForTests();
    expect(() => getPublicEnv()).toThrow(/mainnet-beta.*devnet|devnet.*mainnet-beta/);
  });

  it.each([
    "https://devnet.example-rpc.com/?api-key=not-a-real-key",
    "https://devnet.example-rpc.com/?token=not-a-real-key",
    "https://devnet.example-rpc.com/v2/not-a-real-key",
    "https://user:password@api.devnet.solana.com",
    "https://api.devnet.solana.com/?access_token=not-a-real-key",
    "https://api.devnet.solana.com/#not-a-real-key",
    "https://api.devnet.solana.com.attacker.example",
    "//provider.example/not-a-real-key",
    "/api/rpc?token=not-a-real-key",
    "file:///tmp/rpc",
    "not a URL",
  ])("refuses unsafe public RPC configuration: %s", (url) => {
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = url;
    __resetEnvCacheForTests();
    expect(() => getPublicEnv()).toThrow(/SOLANA_RPC_URL/);
  });

  it.each(["/api/rpc", "https://api.devnet.solana.com/", "http://localhost:8899", "http://127.0.0.1:8899", "http://[::1]:8899"])("accepts a credential-free RPC: %s", (url) => {
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER = "devnet";
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL = url;
    __resetEnvCacheForTests();
    expect(getPublicEnv().solanaRpcUrl).toBe(url);
  });
});

describe("guildReportUrl", () => {
  it("writes a prefilled email that names the guild and says what Pawket can and cannot do", async () => {
    const { guildReportUrl } = await import("./site");
    const link = guildReportUrl({ slug: "sunbeam-club", name: "Sunbeam Club" }, "https://pawket.world/guilds/sunbeam-club");
    expect(link.startsWith("mailto:hi@pawket.world?")).toBe(true);
    expect(link).not.toContain("+");
    const params = new URLSearchParams(link.slice(link.indexOf("?") + 1));
    expect(params.get("subject")).toBe("Report: Sunbeam Club (sunbeam-club)");
    expect(params.get("body")).toContain("https://pawket.world/guilds/sunbeam-club");
    expect(params.get("body")).toContain("cannot remove it from Solana");
  });
  it("refuses an app URL that is not an http(s) origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "pawket.world";
    __resetEnvCacheForTests();
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("refuses a production build that would write localhost into metadata on Solana", () => {
    process.env.VERCEL_ENV = "production";
    for (const url of [undefined, "http://pawket.world", "https://localhost:3000"]) {
      if (url) process.env.NEXT_PUBLIC_APP_URL = url;
      else delete process.env.NEXT_PUBLIC_APP_URL;
      __resetEnvCacheForTests();
      expect(() => getPublicEnv()).toThrow(/production build needs NEXT_PUBLIC_APP_URL/);
    }
    process.env.NEXT_PUBLIC_APP_URL = "https://pawket.world";
    __resetEnvCacheForTests();
    expect(getPublicEnv().appUrl).toBe("https://pawket.world");
  });
});
