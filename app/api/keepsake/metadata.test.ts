// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

const read = vi.hoisted(() => ({ pet: vi.fn(), guild: vi.fn() }));
vi.mock("@/server/solana", () => ({ readPet: read.pet, readGuild: read.guild }));
import { GET as keepsakeMetadata } from "./[pet]/route";
import { GET as coinMetadata } from "../coins/[slug]/metadata/route";

const PET = "So11111111111111111111111111111111111111112";
afterEach(() => vi.resetAllMocks());

it("never caches Solana not answering as 'no such pet' or 'no such guild'", async () => {
  read.pet.mockRejectedValue(new Error("429"));
  read.guild.mockRejectedValue(new Error("429"));
  const card = await keepsakeMetadata(new Request(`http://localhost/api/keepsake/${PET}`), { params: Promise.resolve({ pet: PET }) });
  const coin = await coinMetadata(new Request("http://localhost/api/coins/window-seat/metadata"), { params: Promise.resolve({ slug: "window-seat" }) });
  for (const response of [card, coin]) {
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
});

it("keeps a real 'no such pet' cacheable, as before", async () => {
  read.pet.mockResolvedValue(null);
  const response = await keepsakeMetadata(new Request(`http://localhost/api/keepsake/${PET}`), { params: Promise.resolve({ pet: PET }) });
  expect(response.status).toBe(404);
  expect(response.headers.get("cache-control")).toContain("s-maxage=300");
});
