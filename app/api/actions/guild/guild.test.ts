// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The guild's Action at the edges that need no network: which pet joins,
 * and every refusal before a transaction is built. Signing and sending is
 * the same sponsored path as every other Action, walked against devnet.
 */
const readGuild = vi.fn();
const readOwnedPets = vi.fn();
const sponsoredForPlayer = vi.fn(async () => "base64-transaction");
vi.mock("@/server/solana", () => ({ readGuild, readOwnedPets }));
vi.mock("@/server/sponsor", () => ({
  actionLimit: () => true,
  mayPayRent: () => true,
  sponsorState: async () => ({ available: true, address: "Sponsor", signer: {} }),
  sponsoredForPlayer,
}));

const GUILD = { address: "8Vp2LsXSrgjxbNsmWg5pTGsEk3ag8x1wGkzvWbJ4b3Zt", slug: "sunbeam-club", name: "Sunbeam Club", motto: "Naps first.", memberCount: 2 };
const ACCOUNT = "11111111111111111111111111111112";
const pet = (name: string, member: { guild: string } | null, address = "J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp") => ({
  pet: { name, address, owner: ACCOUNT, birthTimestamp: 1 },
  member,
});
const posted = (account: unknown) =>
  new Request("http://localhost:3000/api/actions/guild/sunbeam-club", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ account }),
  });
const params = { params: Promise.resolve({ slug: "sunbeam-club" }) };

describe("the guild's Action", () => {
  beforeEach(() => {
    readGuild.mockReset().mockResolvedValue(GUILD);
    readOwnedPets.mockReset();
    sponsoredForPlayer.mockClear();
  });

  it("draws the guild's card with one way in", async () => {
    const { GET } = await import("./[slug]/route");
    const card = await (await GET(new Request("http://localhost:3000/api/actions/guild/sunbeam-club"), params)).json();
    expect(card).toMatchObject({ type: "action", title: "Sunbeam Club", label: "Join" });
    expect(card.icon).toBe("http://localhost:3000/api/actions/icon?guild=sunbeam-club");
    expect(card.description).toMatch(/Optional/);
    expect(card.links.actions).toEqual([{ type: "transaction", label: "Join Sunbeam Club", href: "/api/actions/guild/sunbeam-club" }]);
  });

  it("joins with the wallet's newest pet that is in no guild", async () => {
    readOwnedPets.mockResolvedValue([pet("Miso", { guild: "Elsewhere" }, "FEJ7fHr3JBuYMDZ67UsWZfaGVo2S4dMizG6T3xp1BQMm"), pet("Pepper", null)]);
    const { POST } = await import("./[slug]/route");
    const response = await POST(posted(ACCOUNT), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ type: "transaction", transaction: "base64-transaction", message: /^Pepper joins Sunbeam Club\./ });
    expect(sponsoredForPlayer).toHaveBeenCalledTimes(1);
  });

  it("refuses, in one sentence each, before building anything", async () => {
    const { POST } = await import("./[slug]/route");
    const cases: Array<[unknown[] | null, RegExp, number]> = [
      [[], /no pet on Solana yet/, 409],
      [[pet("Pepper", { guild: GUILD.address })], /in Sunbeam Club already/, 409],
      [[pet("Pepper", { guild: "Elsewhere" })], /in a guild already/, 409],
    ];
    for (const [pets, message, status] of cases) {
      readOwnedPets.mockResolvedValue(pets);
      const response = await POST(posted(ACCOUNT), params);
      expect(response.status).toBe(status);
      expect((await response.json()).message).toMatch(message);
    }
    expect((await (await POST(posted("not-a-wallet"), params)).json()).message).toMatch(/not a wallet address/);
    readGuild.mockResolvedValue(null);
    expect((await POST(posted(ACCOUNT), params)).status).toBe(404);
    expect(sponsoredForPlayer).not.toHaveBeenCalled();
  });
});
