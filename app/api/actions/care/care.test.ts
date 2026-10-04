// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";

/**
 * A pet's card is the link people share, and most who open it are not the
 * owner: the card says so, and gives them their own way in.
 */
const PET = "J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp";
const OWNER = "11111111111111111111111111111112";
const now = Math.floor(Date.now() / 1000);
const readPet = vi.fn(async () => ({
  pet: {
    address: PET,
    owner: OWNER,
    name: "Pepper",
    species: PetSpecies.LunaCat,
    personality: PetPersonality.Cozy,
    birthTimestamp: now - 86_400,
    level: 2,
    xp: 120,
    stats: { hunger: 70, happiness: 70, energy: 70, hygiene: 70 },
    statsUpdatedAt: now - 60,
    lastCareAt: { [CareActionType.Feed]: 0, [CareActionType.Play]: 0, [CareActionType.Groom]: 0, [CareActionType.Rest]: 0 },
    wearing: 0,
  },
  passport: {
    address: PET,
    pet: PET,
    owner: OWNER,
    eventCount: 1,
    careCount: 12,
    plays: 0,
    streak: 0,
    bestStreak: 3,
    lastActiveDay: 0,
    lastPlayDay: 0,
    recent: [],
  },
  member: null,
}));
vi.mock("@/server/solana", () => ({ readPet }));

describe("a pet's Action", () => {
  it("offers the four cares to the owner, and a wave and adoption to everyone else", async () => {
    const { GET } = await import("./[pet]/route");
    const card = await (await GET(new Request(`http://localhost:3000/api/actions/care/${PET}`), { params: Promise.resolve({ pet: PET }) })).json();
    expect(card).toMatchObject({ type: "action", label: "Care" });
    expect(card.description).toMatch(/Only Pepper's owner can care for them/);
    expect(card.description).toMatch(/Anyone else can wave/);
    const labels = card.links.actions.map((action: { label: string }) => action.label);
    expect(labels).toEqual(["Feed", "Play", "Brush", "Rest", "Wave at Pepper", "Adopt your own"]);
    expect(card.links.actions[4].href).toBe(`/api/actions/wave/${PET}`);
    const adopt = card.links.actions.at(-1);
    expect(adopt.href).toBe("/api/actions/adopt?species={species}&personality={personality}&name={name}");
    expect(adopt.parameters.map((p: { name: string }) => p.name)).toEqual(["species", "personality", "name"]);
  });
});
