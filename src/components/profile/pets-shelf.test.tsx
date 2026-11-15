import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CompanionState } from "@/lib/companion/use-companion";
import { choosePet } from "@/lib/companion/use-companion";
import { createGuestPet } from "@/lib/guest/pet";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { PetsShelf } from "./pets-shelf";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push }) }));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, wallet: {} }));

beforeEach(() => { window.localStorage.clear(); navigation.push.mockReset(); });
afterEach(() => vi.restoreAllMocks());

it("stays on the shelf when selecting a pet cannot be saved and brings that pet home after retry", () => {
  const mango = createGuestPet({ name: "Mango", species: PetSpecies.LunaCat, personality: PetPersonality.Curious });
  const pip = createGuestPet({ name: "Pip", species: PetSpecies.CloudBun, personality: PetPersonality.Cozy });
  choosePet(mango.id);
  const companion: CompanionState = {
    ready: true, reading: false, pet: mango, active: null, guest: mango, guests: [mango, pip], owned: [], all: [mango, pip], owner: null,
    canSign: false, chainError: undefined, refresh: async () => ({ status: "disconnected" }), choose: choosePet,
  };
  render(<PetsShelf companion={companion} onConnect={() => {}} />);
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
  fireEvent.click(screen.getByRole("button", { name: "Bring home" }));
  expect(screen.getByRole("alert")).toHaveTextContent(/did not.*(save|keep|store).*home/i);
  expect(navigation.push).not.toHaveBeenCalled();
  expect(window.localStorage.getItem("pawket.active-pet")).toBe(mango.id);
  expect(within(screen.getByText("Mango").closest(".pk-card")!).getByText("At home")).toBeInTheDocument();
  write.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "Bring home" }));
  expect(window.localStorage.getItem("pawket.active-pet")).toBe(pip.id);
  expect(navigation.push).toHaveBeenCalledWith("/home", { transitionTypes: ["nav-place"] });
  expect(screen.queryByRole("alert")).toBeNull();
});
