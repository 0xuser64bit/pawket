// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const PET = "J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp";
const OWNER = "11111111111111111111111111111112";
const VISITOR = "8Vp2LsXSrgjxbNsmWg5pTGsEk3ag8x1wGkzvWbJ4b3Zt";
const readPet = vi.fn(async () => ({ pet: { address: PET, owner: OWNER, name: "Pepper" }, passport: {}, member: null }));
const readGuestbook = vi.fn();
const sponsoredForPlayer = vi.fn(async () => "base64-transaction");
vi.mock("@/server/solana", () => ({ readPet, readGuestbook }));
vi.mock("@/server/sponsor", () => ({
  actionLimit: () => true,
  mayPayRent: () => true,
  sponsorState: async () => ({ available: true, address: "Sponsor", signer: {} }),
  sponsoredForPlayer,
}));

const posted = (account: unknown) =>
  new Request(`http://localhost:3000/api/actions/wave/${PET}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ account }),
  });
const params = { params: Promise.resolve({ pet: PET }) };

describe("waving from a pet's card", () => {
  beforeEach(() => {
    readGuestbook.mockReset().mockResolvedValue(null);
    sponsoredForPlayer.mockClear();
  });

  it("builds a wave for anyone but the owner", async () => {
    const { POST } = await import("./[pet]/route");
    const response = await POST(posted(VISITOR), params);
    expect(response.status).toBe(200);
    expect((await response.json()).transaction).toBe("base64-transaction");
    expect(sponsoredForPlayer).toHaveBeenCalledOnce();
  });

  it("refuses the owner, a second wave the same day, and anything that is not a wallet", async () => {
    const { POST } = await import("./[pet]/route");
    const own = await POST(posted(OWNER), params);
    expect(own.status).toBe(409);
    expect((await own.json()).message).toMatch(/is yours/);

    readGuestbook.mockResolvedValue({ waves: 1, recent: [{ visitor: VISITOR, at: Math.floor(Date.now() / 1000) }] });
    const again = await POST(posted(VISITOR), params);
    expect(again.status).toBe(409);
    expect((await again.json()).message).toMatch(/today already/);

    expect((await POST(posted("not-a-wallet"), params)).status).toBe(400);
    expect(sponsoredForPlayer).not.toHaveBeenCalled();
  });
});
