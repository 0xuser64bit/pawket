// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";

const network = vi.hoisted(() => ({
  pet: vi.fn(),
  guild: vi.fn(),
  existingPet: vi.fn(),
  prepare: vi.fn(),
  reserve: vi.fn(),
}));

vi.mock("@/server/solana", () => ({
  readPet: network.pet,
  readGuild: network.guild,
  readGuestbook: vi.fn(),
  readOwnedPets: vi.fn(),
}));
vi.mock("@/lib/solana/accounts", async (original) => ({
  ...await original<typeof import("@/lib/solana/accounts")>(),
  fetchPetOnChain: network.existingPet,
}));
vi.mock("@/server/sponsor", () => ({
  actionLimit: () => true,
  mayPayFee: network.reserve,
  mayPayRent: network.reserve,
  sponsoredForPlayer: network.prepare,
  sponsorRpc: () => ({}),
  sponsorState: async () => ({ available: true, signer: {} }),
}));

import { POST as adopt } from "./adopt/route";
import { GET as careInfo, POST as care } from "./care/[pet]/route";
import { GET as guildInfo, POST as join } from "./guild/[slug]/route";
import { POST as wave } from "./wave/[pet]/route";

const ADDRESS = "11111111111111111111111111111111";
const ADOPTION = `adopt?name=Pepper&species=${PetSpecies.LunaCat}&personality=${PetPersonality.Curious}`;
const petParams = { params: Promise.resolve({ pet: ADDRESS }) };
const guildParams = { params: Promise.resolve({ slug: "sunbeam-club" }) };
const request = (path: string) => new Request(`http://localhost/api/actions/${path}`, {
  method: "POST",
  body: JSON.stringify({ account: ADDRESS }),
});

beforeEach(() => {
  vi.resetAllMocks();
  network.pet.mockResolvedValue(null);
  network.guild.mockResolvedValue(null);
  network.existingPet.mockResolvedValue(null);
  network.reserve.mockReturnValue(true);
  network.prepare.mockResolvedValue("prepared-transaction");
});

describe("Actions distinguish unreadable state from confirmed absence", () => {
  const readActions = [
    { name: "care details", read: network.pet, run: () => careInfo(request(`care/${ADDRESS}`), petParams) },
    { name: "care", read: network.pet, run: () => care(request(`care/${ADDRESS}?action=feed`), petParams) },
    { name: "wave", read: network.pet, run: () => wave(request(`wave/${ADDRESS}`), petParams) },
    { name: "guild details", read: network.guild, run: () => guildInfo(request("guild/sunbeam-club"), guildParams) },
    { name: "join guild", read: network.guild, run: () => join(request("guild/sunbeam-club"), guildParams) },
  ];

  for (const action of readActions) {
    it(`${action.name} offers a retry on an RPC failure, not a false 404`, async () => {
      action.read.mockRejectedValue(new Error("RPC unavailable"));
      const response = await action.run();
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ message: expect.stringContaining("Solana did not answer") });
      expect(network.reserve).not.toHaveBeenCalled();
      expect(network.prepare).not.toHaveBeenCalled();
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
    });

    it(`${action.name} preserves a confirmed missing record as 404`, async () => {
      const response = await action.run();
      expect(response.status).toBe(404);
      expect(action.read).toHaveBeenCalledOnce();
      expect(network.reserve).not.toHaveBeenCalled();
      expect(network.prepare).not.toHaveBeenCalled();
    });
  }

  it("does not reserve sponsorship or prepare adoption when existence is unknown", async () => {
    network.existingPet.mockRejectedValue(new Error("RPC unavailable"));
    const response = await adopt(request(ADOPTION));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ message: expect.stringContaining("Solana did not answer") });
    expect(network.reserve).not.toHaveBeenCalled();
    expect(network.prepare).not.toHaveBeenCalled();
  });

  it("still prepares adoption when a successful read confirms the name is free", async () => {
    const response = await adopt(request(ADOPTION));
    expect(response.status).toBe(200);
    expect(network.reserve).toHaveBeenCalledOnce();
    expect(network.prepare).toHaveBeenCalledOnce();
  });

  it("still rejects a confirmed name collision before reserving sponsorship", async () => {
    network.existingPet.mockResolvedValue({});
    const response = await adopt(request(ADOPTION));
    expect(response.status).toBe(409);
    expect(network.reserve).not.toHaveBeenCalled();
    expect(network.prepare).not.toHaveBeenCalled();
  });
});
