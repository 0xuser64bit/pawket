import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import type { ChainGuild, PetOnChain } from "@/lib/solana/accounts";
import GuildPage from "./page";

const reads = vi.hoisted(() => ({ guild: vi.fn(), pets: vi.fn(), gatherings: vi.fn(), delisted: new Set<string>(), owned: [] as PetOnChain[], act: vi.fn() }));
vi.mock("@/server/solana", () => ({ readGuild: reads.guild, readGuildPets: reads.pets, readGatherings: reads.gatherings }));
vi.mock("@/server/coins/meteora", () => ({ readCoin: async () => null }));
vi.mock("@/lib/guilds/delisted", () => ({ DELISTED_SLUGS: reads.delisted }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/companion/use-companion", () => ({ useCompanion: () => ({ ready: true, owner: "owner", owned: reads.owned, canSign: true }) }));
vi.mock("@/lib/solana/use-send", () => ({ usePawketSend: () => ({ busy: false, act: reads.act }), useSponsor: () => ({ data: { available: true } }), rentWaits: () => false }));

beforeEach(() => {
  reads.delisted.clear();
  reads.delisted.add("cloud-nine");
  reads.guild.mockResolvedValue({ address: "guild", name: "Cloud Nine", slug: "cloud-nine", founder: "owner", founderPet: "founder-pet", motto: "", crest: 0, colour: 0, memberCount: 1, createdAt: 1 } as ChainGuild);
  reads.pets.mockResolvedValue([]);
  reads.gatherings.mockResolvedValue({ events: [], polls: [] });
  reads.owned = ["Miso", "Pepper"].map((name, id) => ({
    pet: { address: `pet-${name}`, name, species: PetSpecies.LunaCat, personality: PetPersonality.Curious, stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 80 }, xp: 0, birthTimestamp: 0, statsUpdatedAt: 0, lastCareAt: [0, 0, 0, 0], wearing: 0 },
    passport: { recent: [], streak: 0, lastActiveDay: 0, bestStreak: 0, plays: 0, lastPlayDay: 0 },
    member: id === 0 ? { address: "member", guild: "guild", payer: "payer" } : null,
  }) as unknown as PetOnChain);
  reads.act.mockClear();
});

it("keeps the member's Leave path available on a delisted guild page while hiding joins and gatherings", async () => {
  render(await GuildPage({ params: Promise.resolve({ slug: "cloud-nine" }) }));
  expect(screen.getByText("Pawket no longer shows this guild")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Leave" }));
  expect(reads.act).toHaveBeenCalledWith("Miso leaves Cloud Nine", expect.any(Function));
  expect(screen.queryByRole("button", { name: "Join" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "What's on" })).toBeNull();
});

it("names a missing guild as the page heading", async () => {
  reads.guild.mockResolvedValueOnce(null);
  render(await GuildPage({ params: Promise.resolve({ slug: "no-such-guild" }) }));
  expect(screen.getByRole("heading", { level: 1, name: "No guild has that name" })).toBeVisible();
});

it("names a failed guild read as the page heading", async () => {
  reads.guild.mockRejectedValueOnce(new Error("offline"));
  render(await GuildPage({ params: Promise.resolve({ slug: "sunbeam-club" }) }));
  expect(screen.getByRole("heading", { level: 1, name: "Solana did not answer" })).toBeVisible();
});
