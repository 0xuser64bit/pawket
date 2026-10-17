import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Address } from "@solana/kit";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { createGuestPet } from "@/lib/guest/pet";
import type { PawketSender } from "@/lib/solana/use-send";

const mock = vi.hoisted(() => ({ found: vi.fn() }));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, useConnected: () => null }));
vi.mock("@/lib/solana/accounts", async (original) => ({ ...(await original<object>()), fetchPetOnChain: mock.found }));
vi.mock("@/lib/solana/use-send", async (original) => ({ ...(await original<object>()), useSponsor: () => ({ data: { available: true } }) }));
vi.mock("@/lib/wallet/link", () => ({ useLinkBrowser: () => ({ link: vi.fn(), problem: undefined, busy: false }) }));
import { KeepSheet } from "./keep-sheet";

const OWNER = "So11111111111111111111111111111111111111112" as Address;
const pet = createGuestPet({ name: "Mango", species: PetSpecies.MossPup, personality: PetPersonality.Brave, now: new Date(Date.now() - 60_000) });
const onChain = (overrides: Record<string, unknown> = {}) => ({ pet: { species: pet.species, personality: pet.personality, birthTimestamp: Math.floor(Date.now() / 1000), ...overrides } });
function sheet(act: PawketSender["act"]) {
  const onCarried = vi.fn();
  const sender = { busy: false, act, pawketWallet: { linked: true, balance: 0n } } as unknown as PawketSender;
  render(<KeepSheet pet={pet} owner={OWNER} canSign sender={sender} onCarried={onCarried} onDismiss={() => {}} />);
  return onCarried;
}
afterEach(() => { vi.useRealTimers(); mock.found.mockReset(); });

it("takes a keep that already landed for itself, rather than calling the name taken", async () => {
  mock.found.mockResolvedValue(onChain());
  const send = vi.fn();
  const onCarried = sheet(send);
  fireEvent.click(screen.getByRole("button", { name: "Keep on Solana" }));
  await waitFor(() => expect(onCarried).toHaveBeenCalledOnce());
  expect(send).not.toHaveBeenCalled();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("still calls a different pet with the name a clash", async () => {
  mock.found.mockResolvedValue(onChain({ species: PetSpecies.LunaCat }));
  const onCarried = sheet(vi.fn());
  fireEvent.click(screen.getByRole("button", { name: "Keep on Solana" }));
  expect((await screen.findByRole("alert")).textContent).toMatch(/already keeps a pet named Mango/);
  expect(onCarried).not.toHaveBeenCalled();
});

it("settles an unknown answer by finding the pet on Solana", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mock.found.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValue(onChain());
  const send = vi.fn(async () => ({ outcome: "unknown", signature: "sig", sponsored: true }));
  const onCarried = sheet(send as unknown as PawketSender["act"]);
  fireEvent.click(screen.getByRole("button", { name: "Keep on Solana" }));
  await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
  await act(async () => { await vi.advanceTimersByTimeAsync(11_000); });
  await vi.waitFor(() => expect(onCarried).toHaveBeenCalledOnce());
});
