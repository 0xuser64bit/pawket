// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Launching a guild's coin, at the edges that need no network: who may,
 * and the refusals before Meteora is asked for a transaction. Building and
 * signing it is walked against devnet (`pnpm e2e:coins`).
 */
const readGuild = vi.fn();
const readPet = vi.fn();
const launchTransaction = vi.fn(async () => "base64-transaction");
vi.mock("@/server/solana", () => ({ readGuild, readPet }));
vi.mock("@/server/sponsor", () => ({ actionLimit: () => true }));
vi.mock("@/server/coins/meteora", () => ({ launchTransaction, CoinRefusal: class extends Error {} }));

const FOUNDER = "11111111111111111111111111111112";
const GUILD = {
  address: "8Vp2LsXSrgjxbNsmWg5pTGsEk3ag8x1wGkzvWbJ4b3Zt",
  founder: FOUNDER,
  founderPet: "J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp",
  slug: "sunbeam-club",
  name: "Sunbeam Club",
  memberCount: 3,
};
const posted = (account: string) =>
  new Request("http://localhost:3000/api/coins/sunbeam-club/launch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ account, preset: "gentle" }),
  });
const params = { params: Promise.resolve({ slug: "sunbeam-club" }) };

describe("launching a guild's coin", () => {
  beforeEach(() => {
    readGuild.mockReset().mockResolvedValue(GUILD);
    readPet.mockReset().mockResolvedValue({ member: { guild: GUILD.address } });
    launchTransaction.mockClear();
  });

  it("builds the launch for the founder while their founding pet is in the guild", async () => {
    const { POST } = await import("./[slug]/launch/route");
    const response = await POST(posted(FOUNDER), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ type: "transaction", transaction: "base64-transaction" });
    expect(readPet).toHaveBeenCalledWith(GUILD.founderPet);
  });

  it("refuses once the founding pet has left, or when Solana does not say", async () => {
    const { POST } = await import("./[slug]/launch/route");
    const cases: Array<[() => void, RegExp, number]> = [
      [() => readPet.mockResolvedValue({ member: null }), /has left it/, 403],
      [() => readPet.mockResolvedValue({ member: { guild: "Elsewhere" } }), /has left it/, 403],
      [() => readPet.mockResolvedValue(null), /has left it/, 403],
      [() => readPet.mockRejectedValue(new Error("timeout")), /did not answer/, 503],
    ];
    for (const [arrange, message, status] of cases) {
      arrange();
      const response = await POST(posted(FOUNDER), params);
      expect(response.status).toBe(status);
      expect((await response.json()).message).toMatch(message);
    }
    expect((await POST(posted("J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp"), params)).status).toBe(403);
    expect(launchTransaction).not.toHaveBeenCalled();
  });
});
