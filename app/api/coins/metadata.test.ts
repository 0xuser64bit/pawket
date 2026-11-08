// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const readGuild = vi.fn();
vi.mock("@/server/solana", () => ({ readGuild }));
vi.mock("@/config/env", () => ({ getPublicEnv: () => ({ appUrl: "https://dev.pawket.world" }) }));

const GUILD = {
  address: "8Vp2LsXSrgjxbNsmWg5pTGsEk3ag8x1wGkzvWbJ4b3Zt",
  founder: "11111111111111111111111111111112",
  founderPet: "J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp",
  slug: "sunbeam-club",
  name: "Sunbeam Club",
  motto: "We rise together.",
};
const params = { params: Promise.resolve({ slug: "sunbeam-club" }) };
const get = () => new Request("http://localhost:3000/api/coins/sunbeam-club/metadata");

describe("a guild coin's metadata response", () => {
  beforeEach(() => readGuild.mockReset().mockResolvedValue(GUILD));

  it("is immutable once the guild exists", async () => {
    const { GET } = await import("./[slug]/metadata/route");
    const response = await GET(get(), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(await response.json()).toMatchObject({
      name: "Sunbeam Club Coin",
      symbol: "SUNBEAM",
      image: "https://dev.pawket.world/api/actions/icon?guild=sunbeam-club",
      external_url: "https://dev.pawket.world/guilds/sunbeam-club/coin",
    });
  });

  it("does not cache a missing guild or an unanswered read", async () => {
    const { GET } = await import("./[slug]/metadata/route");
    readGuild.mockResolvedValueOnce(null);
    const missing = await GET(get(), params);
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toBe("no-store");
    readGuild.mockRejectedValueOnce(new Error("timeout"));
    const unanswered = await GET(get(), params);
    expect(unanswered.status).toBe(503);
    expect(unanswered.headers.get("cache-control")).toBe("no-store");
  });
});
