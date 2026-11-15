import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CompanionState } from "@/lib/companion/use-companion";
import type { SocialRecord } from "@/lib/companion/use-social";
import { createGuestPet } from "@/lib/guest/pet";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import type { Address } from "@solana/kit";
import type { ChainCloset, PetOnChain } from "@/lib/solana/accounts";
import { placeDecor } from "@/lib/room/decor";
import type { ComponentProps } from "react";
import { ProfileScreen } from "./profile-screen";

const state = vi.hoisted(() => ({
  companion: null as unknown as CompanionState,
  tab: "pets",
  social: { status: "success", data: new Map<string, SocialRecord>(), error: undefined as unknown, refresh: vi.fn() },
  closet: null as ChainCloset | null,
  draw: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ bfcacheId: "profile" }), useSearchParams: () => new URLSearchParams({ tab: state.tab }) }));
vi.mock("@/lib/companion/use-companion", () => ({ useCompanion: () => state.companion }));
vi.mock("@/lib/companion/use-social", () => ({ useSocialRecords: () => state.social }));
vi.mock("@/lib/market/use-closet", () => ({ useCloset: () => ({ status: "success", data: state.closet, refresh() {} }) }));
vi.mock("@/components/home/decor-art", async (original) => {
  const actual = await original<typeof import("@/components/home/decor-art")>();
  return {
    ...actual,
    FlatDecor: (props: ComponentProps<typeof actual.FlatDecor>) => {
      state.draw(props);
      return <actual.FlatDecor {...props} />;
    },
  };
});
vi.mock("@/lib/solana/use-send", () => ({ usePawketSend: () => ({ busy: false }) }));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, wallet: {}, useConnected: () => null }));

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("pawket.room", "flat");
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const pet = createGuestPet({ name: "Mango", species: PetSpecies.LunaCat, personality: PetPersonality.Curious });
  state.companion = {
    ready: true, reading: false, pet, active: null, guest: pet, guests: [pet], owned: [], all: [pet], owner: "So11111111111111111111111111111111111111112" as Address,
    canSign: true, chainError: undefined, refresh: async () => ({ status: "success", owner: state.companion.owner!, pets: [] }), choose: () => true,
  };
  state.tab = "pets";
  state.social = { status: "success", data: new Map(), error: undefined, refresh: vi.fn() };
  state.closet = null;
  state.draw.mockClear();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("shows a chain read failure without hiding local pets and keeps the retry disabled until it finishes", async () => {
  let finish!: () => void;
  state.companion.chainError = new Error("RPC offline");
  state.companion.refresh = () => new Promise((resolve) => { finish = () => resolve({ status: "success", owner: state.companion.owner!, pets: [] }); });
  const view = render(<ProfileScreen />);
  expect(screen.getByText("Solana did not answer")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Mango's record" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Your name" }), { target: { value: "Keeper" } });
  expect(screen.getByRole("heading", { name: "Keeper" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reload Solana pets" }));
  expect(screen.getByRole("button", { name: "Reload Solana pets" })).toHaveAttribute("aria-disabled", "true");
  await act(async () => finish());
  state.companion = { ...state.companion, chainError: undefined };
  view.rerender(<ProfileScreen />);
  expect(screen.queryByText("Solana did not answer")).toBeNull();
});

it("does not call a failed unread Solana shelf empty when there are no local pets", () => {
  state.companion = { ...state.companion, pet: null, guest: null, guests: [], all: [], chainError: new Error("RPC offline") };
  render(<ProfileScreen />);
  expect(screen.getByRole("button", { name: "Reload Solana pets" })).toBeInTheDocument();
  expect(screen.queryByText("No pets yet")).toBeNull();
  expect(screen.queryByText("The shelf is empty")).toBeNull();
});

it.each(["fetching", "error", "success"])("does not label unread social stickers unearned when the read is %s", (status) => {
  const local = state.companion.pet!;
  const pet = { ...local, id: "chain-pet", lastActionAt: { ...local.lastActionAt, [CareActionType.Feed]: local.createdAt } };
  state.companion = { ...state.companion, pet, all: [pet, local], owned: [{ pet: { address: pet.id }, member: null } as unknown as PetOnChain] };
  state.tab = "stickers";
  state.social = { ...state.social, status, error: status === "error" ? new Error("RPC offline") : undefined };
  render(<ProfileScreen />);
  const visited = screen.getByText("Visited").closest("li")!;
  expect(within(visited).getByText(/unavailable/i)).toBeInTheDocument();
  expect(within(visited).queryByText("Not earned yet.")).toBeNull();
  expect(within(screen.getByText("First meal").closest("li")!).getByText(/Earned by Mango/)).toBeInTheDocument();
  if (status === "error") expect(screen.getByRole("button", { name: "Reload social stickers" })).toBeEnabled();
});

it("distinguishes a read zero waves from an unavailable guestbook", () => {
  const pet = { ...state.companion.pet!, id: "chain-pet" };
  state.companion = { ...state.companion, pet, all: [pet], owned: [{ pet: { address: pet.id }, member: null } as unknown as PetOnChain] };
  state.tab = "stickers";
  state.social.data.set(pet.id, { waves: 0, gatherings: 0 });
  render(<ProfileScreen />);
  expect(within(screen.getByText("Visited").closest("li")!).getByText("Not earned yet.")).toBeInTheDocument();
});

it("draws the device's selected decor in Profile using the same room entitlements as Home", () => {
  placeDecor("wall", "blossom-scroll");
  placeDecor("corner", "sunflower");
  placeDecor("rug", "heart-rug");
  const view = render(<ProfileScreen />);
  expect(state.draw).toHaveBeenCalledWith({ slot: "corner", id: "sunflower" });
  expect(state.draw).toHaveBeenCalledWith({ slot: "rug", id: "heart-rug" });
  expect(state.draw).not.toHaveBeenCalledWith({ slot: "wall", id: "blossom-scroll" });
  state.closet = { address: state.companion.owner!, owner: state.companion.owner!, items: [64], count: 1, spent: 100_000_000n };
  view.rerender(<ProfileScreen />);
  expect(state.draw).toHaveBeenCalledWith({ slot: "wall", id: "blossom-scroll" });
});
