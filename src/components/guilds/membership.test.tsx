import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import type { PetOnChain } from "@/lib/solana/accounts";
import { GuildMembership } from "./membership";

const state = vi.hoisted(() => ({ owner: "owner" as string | null, owned: [] as PetOnChain[], canSign: true, act: vi.fn(), refresh: vi.fn(), chainError: null as Error | null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/companion/use-companion", () => ({ useCompanion: () => ({ ready: true, ...state }) }));
vi.mock("@/lib/solana/use-send", () => ({ usePawketSend: () => ({ busy: false, act: state.act }), useSponsor: () => ({ data: { available: true } }), rentWaits: () => false }));

function pet(name: string, guild: string | null): PetOnChain {
  return {
    pet: { address: `pet-${name}`, name, species: PetSpecies.LunaCat, personality: PetPersonality.Curious, stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 80 }, xp: 0, birthTimestamp: 0, statsUpdatedAt: 0, lastCareAt: [0, 0, 0, 0], wearing: 0 },
    passport: { recent: [], streak: 0, lastActiveDay: 0, bestStreak: 0, plays: 0, lastPlayDay: 0 },
    member: guild ? { address: `member-${name}`, guild, payer: "payer" } : null,
  } as unknown as PetOnChain;
}
beforeEach(() => {
  Object.assign(state, { owner: "owner", owned: [pet("Miso", "guild"), pet("Pepper", null), pet("Pip", "elsewhere")], canSign: true, chainError: null });
  vi.clearAllMocks();
});

it("lets an existing member leave an exit-only guild without offering any joins", () => {
  render(<GuildMembership guild={{ address: "guild", name: "Cloud Nine" }} exitOnly />);
  expect(screen.getByText("Miso")).toBeVisible();
  expect(screen.queryByText("Pepper")).toBeNull();
  expect(screen.queryByText("Pip")).toBeNull();
  expect(screen.queryByRole("button", { name: "Join" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Leave" }));
  expect(state.act).toHaveBeenCalledWith("Miso leaves Cloud Nine", expect.any(Function));
});

it("offers no connection-to-join or adoption prompt on an exit-only guild", () => {
  state.owner = null;
  state.owned = [];
  render(<GuildMembership guild={{ address: "guild", name: "Cloud Nine" }} exitOnly />);
  expect(screen.queryByRole("button", { name: /join/i })).toBeNull();
  expect(screen.queryByText(/Keep one there from Home/)).toBeNull();
});

it("keeps ordinary guild joins available", () => {
  render(<GuildMembership guild={{ address: "guild", name: "Cloud Nine" }} />);
  expect(screen.getByRole("button", { name: "Join" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Leave" })).toBeEnabled();
});

it("keeps the retry for a failed membership read on exit-only guilds", () => {
  state.chainError = new Error("RPC unavailable");
  render(<GuildMembership guild={{ address: "guild", name: "Cloud Nine" }} exitOnly />);
  fireEvent.click(screen.getByRole("button", { name: "Ask again" }));
  expect(state.refresh).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: "Leave" })).toBeNull();
});
