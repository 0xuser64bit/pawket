import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadPets } from "@/lib/guest/storage";
import { readCoatChoices } from "@/lib/player/use-coats";
import { derivePetPda } from "@/lib/solana/pda";
import type { Address } from "@solana/kit";
import { AdoptFlow } from "./adopt-flow";

const navigation = vi.hoisted(() => ({ push: vi.fn(), act: vi.fn(), found: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push, prefetch() {} }) }));
vi.mock("@/lib/companion/use-companion", async (original) => ({ ...(await original<object>()), useCompanion: () => ({ owned: [] }) }));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, wallet: {}, useConnected: () => ({ account: { address: "So11111111111111111111111111111111111111112" }, signer: {} }) }));
vi.mock("@/lib/solana/accounts", async (original) => ({ ...(await original<object>()), fetchPetOnChain: navigation.found }));
vi.mock("@/lib/wallet/link", () => ({ useLinkBrowser: () => ({ link: vi.fn(), busy: false }) }));
vi.mock("@/lib/solana/use-send", async (original) => ({
  ...(await original<object>()),
  usePawketSend: () => ({ busy: false, act: navigation.act, pawketWallet: { linked: true, balance: 0n } }),
  useSponsor: () => ({ data: { available: true } }),
}));

beforeEach(() => {
  window.localStorage.clear();
  navigation.push.mockReset();
  navigation.act.mockReset().mockResolvedValue({ outcome: "confirmed", signature: "confirmed-keep", sponsored: true });
  navigation.found.mockReset().mockResolvedValue(null);
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function namePet() {
  render(<AdoptFlow />);
  fireEvent.click(screen.getByRole("button", { name: /Choose the luna cat/i }));
  fireEvent.change(screen.getByLabelText("Pet name"), { target: { value: "Mango" } });
  fireEvent.click(screen.getByRole("radio", { name: "Lilac" }));
}

function refuse(key: string) {
  const setItem = Storage.prototype.setItem;
  return vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, name, value) {
    if (name === key) throw new Error("Storage full");
    setItem.call(this, name, value);
  });
}

it("keeps a saved adoption honest when only its coat fails and retries that coat without recreating the pet", () => {
  namePet();
  const write = refuse("pawket.pet-coats.v1");
  fireEvent.click(screen.getByRole("button", { name: "That’s the one" }));
  const [pet] = loadPets();
  expect(pet.name).toBe("Mango");
  expect(screen.getByText(/Mango.*saved.*coat.*not.*saved/i)).toBeInTheDocument();
  expect(screen.queryByText("Not stored")).toBeNull();
  const coat = screen.getByText("Coat").closest<HTMLElement>(".pk-receipt__row")!;
  expect(within(coat).getByText(/Ginger.*Lilac not saved/)).toBeInTheDocument();
  expect(readCoatChoices()[pet.id]).toBeUndefined();
  write.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "Try saving coat again" }));
  expect(readCoatChoices()[pet.id]).toBe("lilac");
  expect(loadPets()).toEqual([pet]);
  expect(screen.queryByRole("button", { name: "Try saving coat again" })).toBeNull();
});

it("does not navigate after a saved adoption if the active pet selection was refused", () => {
  namePet();
  const write = refuse("pawket.active-pet");
  fireEvent.click(screen.getByRole("button", { name: "That’s the one" }));
  expect(loadPets()).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Take them home" }));
  expect(screen.getByRole("alert")).toHaveTextContent(/did not.*(save|keep|store).*home/i);
  expect(navigation.push).not.toHaveBeenCalled();
  write.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "Take them home" }));
  expect(window.localStorage.getItem("pawket.active-pet")).toBe(loadPets()[0].id);
  expect(navigation.push).toHaveBeenCalledWith("/home", { transitionTypes: ["nav-place"] });
});

it("retains the local pet after confirmed Keep if selection fails and retries only the Home handoff", async () => {
  namePet();
  fireEvent.click(screen.getByRole("button", { name: "That’s the one" }));
  const [pet] = loadPets();
  const target = (await derivePetPda("So11111111111111111111111111111111111111112" as Address, "Mango")).address;
  const write = refuse("pawket.active-pet");
  fireEvent.click(screen.getByRole("button", { name: "Keep Mango on Solana" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Keep on Solana" })));
  await screen.findByRole("alert");
  expect(loadPets()).toEqual([pet]);
  expect(window.localStorage.getItem("pawket.active-pet")).toBe(pet.id);
  expect(navigation.push).not.toHaveBeenCalled();
  write.mockRestore();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Take them home" }));
  expect(window.localStorage.getItem("pawket.active-pet")).toBe(target);
  expect(readCoatChoices()[target]).toBe("lilac");
  expect(loadPets()).toEqual([]);
  expect(navigation.push).toHaveBeenCalledTimes(1);
  expect(navigation.act).toHaveBeenCalledTimes(1);
});
