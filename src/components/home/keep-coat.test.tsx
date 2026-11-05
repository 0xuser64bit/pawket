import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Address } from "@solana/kit";
import type { CompanionState } from "@/lib/companion/use-companion";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import { createGuestPet, type GuestPet } from "@/lib/guest/pet";
import { loadPets, savePet } from "@/lib/guest/storage";
import { chooseCoat, readCoatChoices } from "@/lib/player/use-coats";
import { toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";
import { derivePetPda } from "@/lib/solana/pda";
import { dismissToast, Toasts } from "@/components/pk/toast";

const mock = vi.hoisted(() => ({
  companion: null as unknown as CompanionState,
  push: vi.fn(),
  found: vi.fn(),
  act: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mock.push, prefetch() {} }) }));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, useConnected: () => ({ account: { address: "So11111111111111111111111111111111111111112" }, signer: {} }) }));
vi.mock("@/lib/companion/use-companion", async (original) => ({ ...(await original<object>()), useCompanion: () => mock.companion }));
vi.mock("@/lib/solana/accounts", async (original) => ({ ...(await original<object>()), fetchPetOnChain: mock.found }));
vi.mock("@/lib/solana/use-send", async (original) => ({
  ...(await original<object>()),
  useSponsor: () => ({ data: { available: true } }),
  usePawketSend: () => ({ busy: false, act: mock.act, pawketWallet: { linked: true, balance: 0n } }),
}));
vi.mock("@/lib/market/use-closet", () => ({ useCloset: () => ({ data: null }) }));
vi.mock("@/lib/wallet/link", () => ({ useLinkBrowser: () => ({ link: vi.fn(), busy: false }) }));
vi.mock("@/components/home/room", () => ({ Room: () => null, RoomViewSwitch: () => null, useRoomMode: () => ["flat", vi.fn()] }));
import { AdoptFlow } from "@/components/adopt/adopt-flow";
import { choosePet } from "@/lib/companion/use-companion";
import { HomeScreen } from "./home-screen";

const OWNER = "So11111111111111111111111111111111111111112" as Address;
let target: Address;
let source: GuestPet;
let entry: PetOnChain;

beforeEach(async () => {
  window.localStorage.clear();
  mock.push.mockReset();
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  source = createGuestPet({ name: "Mango", species: PetSpecies.LunaCat, personality: PetPersonality.Curious });
  target = (await derivePetPda(OWNER, source.name)).address;
  const at = Math.floor(Date.now() / 1000) + 2;
  entry = {
    pet: { address: target, owner: OWNER, name: source.name, species: source.species, personality: source.personality, birthTimestamp: at, level: 1, xp: 0, stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 80 }, statsUpdatedAt: at, lastCareAt: { [CareActionType.Feed]: 0, [CareActionType.Play]: 0, [CareActionType.Groom]: 0, [CareActionType.Rest]: 0 }, wearing: 0 },
    passport: { address: OWNER, pet: target, owner: OWNER, eventCount: 0, careCount: 0, plays: 0, streak: 0, bestStreak: 0, lastActiveDay: 0, lastPlayDay: 0, recent: [] },
    member: null,
  };
  mock.act.mockResolvedValue({ outcome: "confirmed", signature: "confirmed-keep", sponsored: true });
  mock.found.mockReset().mockResolvedValueOnce(null).mockResolvedValue(entry);
  mock.companion = {
    ready: true, reading: false, pet: source, active: null, guest: source, guests: [], owned: [], all: [], owner: OWNER, canSign: true, chainError: undefined, choose: choosePet,
    refresh: async () => {
      mock.companion = { ...mock.companion, active: entry, pet: toCompanionRecord(entry), owned: [entry], all: [toCompanionRecord(entry), ...loadPets()] };
    },
  };
});

afterEach(async () => {
  dismissToast(`coat-copy-${source.id}`);
  dismissToast(`local-copy-${source.id}`);
  await new Promise((resolve) => setTimeout(resolve, 210));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function openKeep(where: "home" | "adoption") {
  if (where === "home") {
    source = { ...source, xp: 100, wearing: "wool-scarf" };
    savePet(source);
    chooseCoat(source.id, "lilac");
    mock.companion = { ...mock.companion, pet: source, guest: source, guests: [source], all: [source] };
    render(<><HomeScreen /><Toasts /></>);
  } else {
    render(<><AdoptFlow /><Toasts /></>);
    fireEvent.click(screen.getByRole("button", { name: /Choose the luna cat/i }));
    fireEvent.change(screen.getByLabelText("Pet name"), { target: { value: "Mango" } });
    fireEvent.click(screen.getByRole("radio", { name: "Lilac" }));
    fireEvent.click(screen.getByRole("button", { name: "That’s the one" }));
    [source] = loadPets();
  }
  fireEvent.click(screen.getByRole("button", { name: "Keep Mango on Solana" }));
}

it.each(["home", "adoption"] as const)("keeps the chosen device coat after a confirmed Keep from %s, without importing progression or clothes", async (where) => {
  await openKeep(where);
  fireEvent.click(screen.getByRole("button", { name: "Keep on Solana" }));
  await waitFor(() => expect(window.localStorage.getItem("pawket.active-pet")).toBe(target));
  expect(readCoatChoices()[target]).toBe("lilac");
  expect(readCoatChoices()[source.id]).toBe("lilac");
  expect(loadPets()).toEqual([]);
  if (where === "home") {
    expect(screen.getByRole("img", { name: /^Level 1, 0 \/ .* XP$/ })).toBeInTheDocument();
    expect(screen.queryByText("Wool scarf")).toBeNull();
  }
});

it.each(["home", "adoption"] as const)("reports a failed coat save after a confirmed Keep from %s and retains the local pet and choice for retry", async (where) => {
  await openKeep(where);
  const setItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
    if (key === "pawket.pet-coats.v1") throw new Error("Storage full");
    setItem.call(this, key, value);
  });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Keep on Solana" })));
  await waitFor(() => expect(window.localStorage.getItem("pawket.active-pet")).toBe(target));
  expect(screen.getByText(/coat could not be saved/i)).toBeInTheDocument();
  expect(readCoatChoices()[target]).toBeUndefined();
  expect(readCoatChoices()[source.id]).toBe("lilac");
  expect(loadPets()).toEqual([source]);
});
