// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

const read = vi.hoisted(() => ({ pet: vi.fn(), guild: vi.fn() }));
vi.mock("@/server/solana", () => ({ readPet: read.pet, readGuild: read.guild }));
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import { GET as keepsakeMetadata } from "./[pet]/route";
import { GET as keepsakePicture } from "./[pet]/card/route";
import { GET as coinMetadata } from "../coins/[slug]/metadata/route";

const PET = "So11111111111111111111111111111111111111112";
afterEach(() => vi.resetAllMocks());

it("never caches Solana not answering as 'no such pet' or 'no such guild'", async () => {
  read.pet.mockRejectedValue(new Error("429"));
  read.guild.mockRejectedValue(new Error("429"));
  const card = await keepsakeMetadata(new Request(`http://localhost/api/keepsake/${PET}`), { params: Promise.resolve({ pet: PET }) });
  const picture = await keepsakePicture(new Request(`http://localhost/api/keepsake/${PET}/card`), { params: Promise.resolve({ pet: PET }) });
  const coin = await coinMetadata(new Request("http://localhost/api/coins/window-seat/metadata"), { params: Promise.resolve({ slug: "window-seat" }) });
  for (const response of [card, picture, coin]) {
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

it("shows a keepsake as its own card, not as the Action's icon of the pet's mood", async () => {
  const now = Math.floor(Date.now() / 1000);
  const marks = { [CareActionType.Feed]: 0, [CareActionType.Play]: 0, [CareActionType.Groom]: 0, [CareActionType.Rest]: 0 };
  read.pet.mockResolvedValue({
    pet: { address: PET, owner: PET, name: "Pepper", species: PetSpecies.LunaCat, personality: PetPersonality.Cozy, birthTimestamp: now - 86_400, level: 1, xp: 0, stats: { hunger: 70, happiness: 70, energy: 70, hygiene: 70 }, statsUpdatedAt: now, lastCareAt: marks, wearing: 0 },
    passport: { address: PET, pet: PET, owner: PET, eventCount: 0, careCount: 0, plays: 0, streak: 0, bestStreak: 0, lastActiveDay: 0, lastPlayDay: 0, recent: [] },
    member: null,
  });
  const metadata = await (await keepsakeMetadata(new Request(`http://localhost/api/keepsake/${PET}`), { params: Promise.resolve({ pet: PET }) })).json();
  expect(metadata.image).toMatch(new RegExp(`/api/keepsake/${PET}/card$`));
  expect(metadata.properties.files[0].uri).toBe(metadata.image);
});
