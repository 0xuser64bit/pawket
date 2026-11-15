import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Address } from "@solana/kit";
import type { CompanionState } from "@/lib/companion/use-companion";
import { choosePet } from "@/lib/companion/use-companion";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { createGuestPet } from "@/lib/guest/pet";
import { loadPets, savePet } from "@/lib/guest/storage";
import type { ChainCloset } from "@/lib/solana/accounts";
import type { PawketSender } from "@/lib/solana/use-send";
import { Wardrobe } from "./wardrobe";

const state = vi.hoisted(() => ({
  closet: { status: "error", data: undefined as ChainCloset | null | undefined, error: new Error("RPC unavailable") as unknown, refresh: vi.fn() },
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock("@/lib/market/use-closet", () => ({ useCloset: () => state.closet }));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, wallet: {} }));

const OWNER = "So11111111111111111111111111111111111111112" as Address;
let companion: CompanionState;
const sender = { busy: false } as PawketSender;

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  const mango = createGuestPet({ name: "Mango", species: PetSpecies.LunaCat, personality: PetPersonality.Curious });
  savePet(mango);
  choosePet(mango.id);
  companion = {
    ready: true, reading: false, pet: mango, guest: mango, active: null, all: [mango], guests: [mango], owned: [], owner: OWNER, canSign: true, chainError: undefined,
    refresh: async () => ({ status: "success", owner: OWNER, pets: [] }), choose: choosePet,
  };
  state.closet = { status: "error", data: undefined, error: new Error("RPC unavailable"), refresh: vi.fn() };
  state.push.mockReset();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("shows unavailable Market pieces with retry while free local clothing still works", () => {
  render(<Wardrobe companion={companion} sender={sender} />);
  expect(screen.getByRole("alert")).toHaveTextContent(/closet.*unavailable/i);
  fireEvent.click(screen.getByRole("button", { name: /Wool scarf/ }));
  expect(loadPets()[0].wearing).toBe("wool-scarf");
  fireEvent.click(screen.getByRole("button", { name: "Reload closet" }));
  expect(state.closet.refresh).toHaveBeenCalledTimes(1);
});

it("keeps the closet retry disabled while a read is running", () => {
  state.closet.status = "fetching";
  render(<Wardrobe companion={companion} sender={sender} />);
  fireEvent.click(screen.getByRole("button", { name: "Reload closet" }));
  expect(state.closet.refresh).not.toHaveBeenCalled();
});

it("selects the pet in the wardrobe before handing it to Home for Keep", () => {
  const pip = createGuestPet({ name: "Pip", species: PetSpecies.CloudBun, personality: PetPersonality.Cozy });
  savePet(pip);
  companion = { ...companion, all: [...companion.all, pip], guests: [...companion.guests, pip] };
  state.closet = { ...state.closet, status: "success", error: undefined, data: { address: OWNER, owner: OWNER, items: [19], count: 1, spent: 50_000_000n } };
  render(<Wardrobe companion={companion} sender={sender} />);
  fireEvent.click(screen.getByRole("button", { name: "Dress Pip" }));
  fireEvent.click(screen.getByText(/Keep Pip on Solana to wear it/));
  expect(window.localStorage.getItem("pawket.active-pet")).toBe(pip.id);
  expect(state.push).toHaveBeenCalledWith("/home", { transitionTypes: ["nav-place"] });
});

it("does not hand the wardrobe pet to Home until that selection can be saved", () => {
  const pip = createGuestPet({ name: "Pip", species: PetSpecies.CloudBun, personality: PetPersonality.Cozy });
  companion = { ...companion, all: [...companion.all, pip], guests: [...companion.guests, pip] };
  state.closet = { ...state.closet, status: "success", error: undefined, data: { address: OWNER, owner: OWNER, items: [19], count: 1, spent: 50_000_000n } };
  render(<Wardrobe companion={companion} sender={sender} />);
  fireEvent.click(screen.getByRole("button", { name: "Dress Pip" }));
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
  fireEvent.click(screen.getByText(/Keep Pip on Solana to wear it/));
  expect(screen.getByRole("status")).toHaveTextContent(/did not.*(save|keep|store).*home/i);
  expect(window.localStorage.getItem("pawket.active-pet")).toBe(companion.pet!.id);
  expect(state.push).not.toHaveBeenCalled();
  write.mockRestore();
  fireEvent.click(screen.getByText(/Keep Pip on Solana to wear it/));
  expect(window.localStorage.getItem("pawket.active-pet")).toBe(pip.id);
  expect(state.push).toHaveBeenCalledTimes(1);
});
