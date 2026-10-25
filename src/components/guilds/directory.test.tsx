import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import type { ChainGuild, PetOnChain } from "@/lib/solana/accounts";
import { GuildDirectory } from "./directory";

const chainPet = (name: string, guild: string | null) =>
  ({
    pet: { address: `pet-${name}`, name, species: PetSpecies.LunaCat, personality: PetPersonality.Curious, stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 80 }, xp: 0, birthTimestamp: 0, statsUpdatedAt: 0, lastCareAt: [0, 0, 0, 0], wearing: 0 },
    passport: { recent: [], streak: 0, lastActiveDay: 0, bestStreak: 0, plays: 0, lastPlayDay: 0 },
    member: guild ? { guild } : null,
  }) as unknown as PetOnChain;

const wallet = vi.hoisted(() => ({ ready: true, owner: null as string | null, owned: [] as unknown[] }));
vi.mock("@/lib/companion/use-companion", () => ({ useCompanion: () => wallet }));
afterEach(cleanup);

const guild = (address: string, founder = "someone", founderPet = "pet-Someone") =>
  ({ address, founder, founderPet, name: address, slug: address, motto: "", crest: 0, colour: 0, createdAt: 1, memberCount: 1 }) as ChainGuild;
const guilds = [guild("Cloud Nine"), guild("Window Seat", "me", "pet-Pip"), guild("Muddy Paws")];

it("puts the guilds you founded or are in first, with your role and your pet", () => {
  Object.assign(wallet, { owner: "me", owned: [chainPet("Mango", "Muddy Paws"), chainPet("Pip", "Window Seat")] });
  render(<GuildDirectory guilds={guilds} coins={new Map()} />);
  const yours = screen.getByRole("region", { name: "Your guilds" });
  const founded = within(yours).getByRole("link", { name: "Window Seat" }).closest(".pk-guild") as HTMLElement;
  expect(founded.className).toContain("pk-guild--yours");
  expect(within(founded).getByText("Founder")).toBeTruthy();
  const joined = within(yours).getByRole("link", { name: "Muddy Paws" }).closest(".pk-guild") as HTMLElement;
  expect(within(joined).getByText("Member")).toBeTruthy();
  expect(joined.textContent).toContain("with Mango");
  const more = screen.getByRole("region", { name: "More guilds" });
  expect(within(more).getByRole("link", { name: "Cloud Nine" })).toBeTruthy();
  expect(within(more).queryByText(/Founder|Member/)).toBeNull();
});

it("a founder whose founding pet has left is no longer marked as the guild's", () => {
  Object.assign(wallet, { ready: true, owner: "me", owned: [chainPet("Pip", null)] });
  render(<GuildDirectory guilds={guilds} coins={new Map()} />);
  expect(screen.queryByRole("region", { name: "Your guilds" })).toBeNull();
  expect(screen.queryByText("Founder")).toBeNull();
});

it("without a wallet, or before its pets are read, every guild is one list and none is marked", () => {
  Object.assign(wallet, { ready: false, owner: "me", owned: [chainPet("Mango", "Muddy Paws")] });
  render(<GuildDirectory guilds={guilds} coins={new Map()} />);
  expect(document.querySelector(".pk-guild--yours")).toBeNull();
  cleanup();
  Object.assign(wallet, { ready: true, owner: null, owned: [] });
  render(<GuildDirectory guilds={guilds} coins={new Map()} />);
  expect(screen.queryByRole("region", { name: "Your guilds" })).toBeNull();
  expect(within(screen.getByRole("region", { name: "On Solana now" })).getAllByRole("link")).toHaveLength(3);
  expect(document.querySelector(".pk-guild--yours")).toBeNull();
});
