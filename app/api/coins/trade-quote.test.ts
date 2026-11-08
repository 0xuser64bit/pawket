// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuoteClaims } from "@/lib/coins/quote";
import { sealQuote } from "@/server/coins/quote-token";

const mocks = vi.hoisted(() => ({ readGuild: vi.fn(), tradeTransaction: vi.fn(), allowed: true }));
vi.mock("@/server/solana", () => ({ readGuild: mocks.readGuild }));
vi.mock("@/server/coins/limits", () => ({ coinLimit: () => mocks.allowed, COIN_RETRY_AFTER_SECONDS: 60 }));
vi.mock("@/server/coins/meteora", () => ({
  tradeTransaction: mocks.tradeTransaction,
  CoinRefusal: class extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  },
}));

const OWNER = "So11111111111111111111111111111111111111112";
const MINT = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
const guild = { slug: "window-seat", name: "Window Seat", founder: OWNER };
const params = { params: Promise.resolve({ slug: guild.slug }) };

const claims = (overrides: Partial<QuoteClaims> = {}): QuoteClaims => {
  const quotedAt = Date.now();
  return {
    v: 1,
    cluster: "devnet",
    slug: guild.slug,
    mint: MINT,
    preset: "gentle",
    route: "curve",
    side: "buy",
    amountIn: "50000000",
    minimumOut: "4158000000",
    slippageBps: 100,
    quotedAt,
    expiresAt: quotedAt + 30_000,
    ...overrides,
  };
};

const post = (fields: Record<string, unknown>) => new Request(`http://localhost:3000/api/coins/${guild.slug}/trade`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ account: OWNER, side: "buy", amount: "50000000", minimumOut: "4158000000", ...fields }),
});

beforeEach(() => {
  vi.stubEnv("DERIVATION_SECRET", "ab".repeat(32));
  vi.stubEnv("SPONSOR_KEYPAIR", "");
  mocks.readGuild.mockReset().mockResolvedValue(guild);
  mocks.tradeTransaction.mockReset().mockResolvedValue("base64-transaction");
  mocks.allowed = true;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("the trade route requires the quote Pawket signed", () => {
  it("refuses a trade without a token before reading the guild or building anything", async () => {
    const { POST } = await import("./[slug]/trade/route");
    const response = await POST(post({}), params);
    expect(response.status).toBe(409);
    expect((await response.json()).message).toMatch(/quote/i);
    expect(mocks.readGuild).not.toHaveBeenCalled();
    expect(mocks.tradeTransaction).not.toHaveBeenCalled();
  });

  it("refuses an expired token", async () => {
    const token = sealQuote(claims({ quotedAt: Date.now() - 60_000, expiresAt: Date.now() - 30_000 }));
    const { POST } = await import("./[slug]/trade/route");
    const response = await POST(post({ quote: token }), params);
    expect(response.status).toBe(409);
    expect(mocks.tradeTransaction).not.toHaveBeenCalled();
  });

  it.each([
    ["amount", { amount: "60000000" }],
    ["minimum", { minimumOut: "1" }],
    ["side", { side: "sell" }],
  ])("refuses a token quoted for a different %s", async (_field, changed) => {
    const token = sealQuote(claims());
    const { POST } = await import("./[slug]/trade/route");
    const response = await POST(post({ quote: token, ...changed }), params);
    expect(response.status).toBe(409);
    expect((await response.json()).message).toMatch(/different inputs/);
    expect(mocks.tradeTransaction).not.toHaveBeenCalled();
  });

  it("refuses a token from another cluster", async () => {
    const token = sealQuote(claims({ cluster: "mainnet-beta" }));
    const { POST } = await import("./[slug]/trade/route");
    const response = await POST(post({ quote: token }), params);
    expect(response.status).toBe(409);
    expect(mocks.tradeTransaction).not.toHaveBeenCalled();
  });

  it("builds only for the token's own inputs and returns a same-origin no-store answer", async () => {
    const token = sealQuote(claims());
    const { POST } = await import("./[slug]/trade/route");
    const response = await POST(post({ quote: token }), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.tradeTransaction).toHaveBeenCalledOnce();
    expect(mocks.tradeTransaction.mock.calls[0][0]).toMatchObject({
      guild,
      owner: OWNER,
      side: "buy",
      amountIn: 50_000_000n,
      minimumOut: 4_158_000_000n,
      quote: { slug: guild.slug, mint: MINT, route: "curve" },
    });
  });

  it("answers a spent allowance with Retry-After and builds nothing", async () => {
    mocks.allowed = false;
    const token = sealQuote(claims());
    const { POST } = await import("./[slug]/trade/route");
    const response = await POST(post({ quote: token }), params);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(mocks.tradeTransaction).not.toHaveBeenCalled();
  });

  it("answers preflight without granting another origin", async () => {
    const { OPTIONS } = await import("./[slug]/trade/route");
    const response = OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
