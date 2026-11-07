// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuoteClaims } from "@/lib/coins/quote";
import { openQuote, sealQuote } from "./quote-token";

const claims: QuoteClaims = {
  v: 1,
  cluster: "devnet",
  slug: "window-seat",
  mint: "So11111111111111111111111111111111111111112",
  preset: "gentle",
  route: "curve",
  side: "buy",
  amountIn: "50000000",
  minimumOut: "4158000000",
  slippageBps: 100,
  quotedAt: 1_790_000_000_000,
  expiresAt: 1_790_000_030_000,
};

beforeEach(() => {
  vi.stubEnv("DERIVATION_SECRET", "ab".repeat(32));
  vi.stubEnv("SPONSOR_KEYPAIR", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sealed coin quotes", () => {
  it("round-trips the claims the server signed", () => {
    expect(openQuote(sealQuote(claims), claims.quotedAt + 1_000)).toEqual(claims);
  });

  it("refuses a token whose payload was changed", () => {
    const token = sealQuote(claims);
    const [encoded, signature] = token.split(".");
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    payload[8] = "1";
    const tampered = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;
    expect(openQuote(tampered, claims.quotedAt + 1_000)).toBeNull();
  });

  it("refuses a token whose signature was changed", () => {
    const token = sealQuote(claims);
    const [encoded] = token.split(".");
    const signature = Buffer.alloc(32, 9).toString("base64url");
    expect(openQuote(`${encoded}.${signature}`, claims.quotedAt + 1_000)).toBeNull();
  });

  it("refuses a token at and after its expiry", () => {
    const token = sealQuote(claims);
    expect(openQuote(token, claims.expiresAt - 1)).not.toBeNull();
    expect(openQuote(token, claims.expiresAt)).toBeNull();
    expect(openQuote(token, claims.expiresAt + 1)).toBeNull();
  });

  it("refuses garbage, an empty token, a token without a signature and an oversized token", () => {
    for (const token of [undefined, null, "", "not-a-token", "one.two.three", "a".repeat(2_049), `${"a".repeat(2_000)}.${"b".repeat(2_000)}`]) {
      expect(openQuote(token, claims.quotedAt)).toBeNull();
    }
  });

  it("refuses even a correctly signed token that claims a field outside the grammar", () => {
    const outside = [
      { ...claims, cluster: "local" },
      { ...claims, preset: "wild" },
      { ...claims, side: "swap" },
      { ...claims, amountIn: "-1" },
      { ...claims, mint: "not-an-address" },
      { ...claims, expiresAt: claims.expiresAt + 60_000 },
    ] as unknown as QuoteClaims[];
    for (const candidate of outside) expect(openQuote(sealQuote(candidate), claims.quotedAt)).toBeNull();
  });

  it("refuses to sign without a server secret", () => {
    vi.unstubAllEnvs();
    expect(() => sealQuote(claims)).toThrow(/not available/);
  });
});
