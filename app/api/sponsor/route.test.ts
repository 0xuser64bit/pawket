// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  state: vi.fn(),
  cosign: vi.fn(),
  actionLimit: vi.fn(() => true),
  mayPayRent: vi.fn(() => true),
  spent: vi.fn(),
  address: vi.fn(async () => "Sp0nsor1111111111111111111111111111111111111"),
}));
vi.mock("@/server/sponsor", () => ({
  sponsorState: mock.state,
  actionLimit: mock.actionLimit,
  mayPayRent: mock.mayPayRent,
  sponsorSpent: mock.spent,
  sponsorAddress: mock.address,
}));
vi.mock("@/lib/solana/sponsor", async () => {
  class SponsorRefusal extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  }
  return { cosign: mock.cosign, SponsorRefusal };
});
vi.mock("@/server/actions", () => ({ caller: () => "203.0.113.7" }));

const { GET, POST } = await import("./route");
const { SponsorRefusal } = (await import("@/lib/solana/sponsor")) as unknown as { SponsorRefusal: new (message: string, status: number) => Error };

const post = (body: unknown) => POST(new Request("http://localhost/api/sponsor", { method: "POST", body: JSON.stringify(body) }));
let logged: string[];

beforeEach(() => {
  logged = [];
  vi.spyOn(console, "error").mockImplementation((line: string) => void logged.push(line));
  mock.state.mockResolvedValue({ available: true, signer: { address: "Sp0nsor" }, address: "Sp0nsor" });
});
afterEach(() => vi.clearAllMocks());

describe("the sponsor route", () => {
  it("signs nothing for a body that is not one transaction", async () => {
    for (const body of [null, {}, { transaction: "" }, { transaction: "A".repeat(2_001) }]) {
      expect((await post(body)).status).toBe(400);
    }
    expect(mock.cosign).not.toHaveBeenCalled();
  });

  it("says when it is not paying, and when it cannot tell", async () => {
    mock.state.mockResolvedValueOnce({ available: false, reason: "Pawket is not paying fees right now." });
    const off = await post({ transaction: "AQ==" });
    expect([off.status, await off.json()]).toEqual([503, { error: "Pawket is not paying fees right now." }]);
    mock.state.mockRejectedValueOnce(new Error("fetch failed: https://rpc.example/?api-key=SECRET"));
    expect((await post({ transaction: "AQ==" })).status).toBe(503);
    expect(mock.cosign).not.toHaveBeenCalled();
    expect(logged.join("\n")).not.toContain("SECRET");
  });

  it("hands the co-signer this caller's limit, and the rent budget only when there is rent", async () => {
    mock.cosign.mockResolvedValue({ transaction: "signed", kinds: [] });
    const answer = await post({ transaction: "AQ==" });
    expect([answer.status, await answer.json()]).toEqual([200, { transaction: "signed" }]);
    expect(mock.spent).toHaveBeenCalledOnce();
    const limit = mock.cosign.mock.calls[0][2] as (check: { kinds: string[]; rent: number }) => boolean;
    expect(limit({ kinds: ["care"], rent: 0 })).toBe(true);
    expect(mock.mayPayRent).not.toHaveBeenCalled();
    expect(limit({ kinds: ["adopt"], rent: 1 })).toBe(true);
    expect(mock.mayPayRent).toHaveBeenCalledWith(["203.0.113.7"]);
    mock.mayPayRent.mockReturnValueOnce(false);
    expect(limit({ kinds: ["adopt"], rent: 1 })).toBe(false);
    mock.actionLimit.mockReturnValueOnce(false);
    expect(limit({ kinds: ["care"], rent: 0 })).toBe(false);
    expect(mock.actionLimit).toHaveBeenCalledWith("203.0.113.7");
  });

  it("passes a refusal on as it was said, and keeps anything else out of the answer and the log", async () => {
    mock.cosign.mockRejectedValueOnce(new SponsorRefusal("That is not something Pawket pays for. Nothing was sent.", 403));
    const refused = await post({ transaction: "AQ==" });
    expect([refused.status, await refused.json()]).toEqual([403, { error: "That is not something Pawket pays for. Nothing was sent." }]);
    mock.cosign.mockRejectedValueOnce(new Error("simulation failed at https://rpc.example/?api-key=SECRET for 4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T"));
    const broke = await post({ transaction: "AQ==" });
    expect([broke.status, await broke.json()]).toEqual([502, { error: "The sponsor could not sign it. Nothing changed." }]);
    expect(mock.spent).not.toHaveBeenCalled();
    expect(logged.join("\n")).not.toMatch(/SECRET|4Nd1mBQ/);
  });

  it("tells a monitor it is up, and keeps the public address when the network is down", async () => {
    expect(await (await GET()).json()).toEqual({ available: true, address: "Sp0nsor" });
    mock.state.mockRejectedValueOnce(new Error("timeout"));
    expect(await (await GET()).json()).toEqual({
      available: false,
      reason: "The sponsor cannot reach the network.",
      address: "Sp0nsor1111111111111111111111111111111111111",
    });
  });
});
