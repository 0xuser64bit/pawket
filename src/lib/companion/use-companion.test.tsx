import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PetOnChain } from "@/lib/solana/accounts";
import type { GuestPet } from "@/lib/guest/pet";

const OWNER = "Owner11111111111111111111111111111111111111";
const mock = vi.hoisted(() => ({
  fetch: vi.fn(),
  guests: [] as unknown[],
  owner: null as string | null,
  walletReady: true,
}));
vi.mock("@solana/kit-plugin-wallet/react", () => ({
  useIsWalletReady: () => mock.walletReady,
  useConnectedWallet: () => (mock.owner ? { account: { address: mock.owner }, signer: {} } : null),
}));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {}, wallet: {}, useWalletReady: () => mock.walletReady }));
vi.mock("@/lib/guest/use-pets", () => ({ usePets: () => ({ ready: true, pets: mock.guests }) }));
vi.mock("@/lib/solana/accounts", () => ({
  fetchPetsOnChain: mock.fetch,
  toCompanionRecord: (entry: PetOnChain) => ({ id: entry.pet.address, name: entry.pet.name }),
}));

const chainPet = (address: string, birth = 1) => ({ pet: { address, name: address, birthTimestamp: birth } }) as unknown as PetOnChain;
const guest = (id: string) => ({ id, name: id }) as unknown as GuestPet;
/** A read that answers only when the test says so. */
function deferred() {
  let answer!: (pets: PetOnChain[]) => void;
  const promise = new Promise<PetOnChain[]>((resolve) => { answer = resolve; });
  return { promise, answer };
}

async function companion() {
  vi.resetModules();
  return (await import("./use-companion")).useCompanion;
}

beforeEach(() => { mock.owner = OWNER; mock.guests = []; mock.walletReady = true; window.localStorage.clear(); });
afterEach(() => { vi.useRealTimers(); mock.fetch.mockReset(); });

it("reads a wallet's pets once for every screen, and a refresh updates them all", async () => {
  const useCompanion = await companion();
  const first = deferred();
  mock.fetch.mockReturnValueOnce(first.promise);
  const home = renderHook(useCompanion);
  const guild = renderHook(useCompanion);
  expect(mock.fetch).toHaveBeenCalledTimes(1);
  await act(async () => first.answer([chainPet("Mango")]));
  expect(home.result.current.owned.map((e) => e.pet.address)).toEqual(["Mango"]);
  expect(guild.result.current.owned.map((e) => e.pet.address)).toEqual(["Mango"]);

  mock.fetch.mockResolvedValueOnce([chainPet("Mango"), chainPet("Pip", 2)]);
  await act(async () => { guild.result.current.refresh(); });
  expect(home.result.current.owned.map((e) => e.pet.address)).toEqual(["Pip", "Mango"]);
});

it("never lets a read that began before a refresh overwrite the refresh", async () => {
  const useCompanion = await companion();
  const early = deferred();
  const late = deferred();
  mock.fetch.mockReturnValueOnce(early.promise).mockReturnValueOnce(late.promise);
  const hook = renderHook(useCompanion);
  // Started, not awaited: the read it begins answers only when the test says so.
  act(() => {
    void hook.result.current.refresh();
  });
  await act(async () => late.answer([chainPet("Mango"), chainPet("Joined", 2)]));
  await act(async () => early.answer([chainPet("Mango")]));
  expect(hook.result.current.owned.map((e) => e.pet.address)).toEqual(["Joined", "Mango"]);
});

it("shows a chosen browser pet at once, without waiting on Solana", async () => {
  const useCompanion = await companion();
  mock.fetch.mockReturnValue(new Promise(() => {}));
  mock.guests = [guest("local-1")];
  window.localStorage.setItem("pawket.active-pet", "local-1");
  const hook = renderHook(useCompanion);
  expect(hook.result.current.ready).toBe(true);
  expect(hook.result.current.reading).toBe(true);
  expect(hook.result.current.pet?.id).toBe("local-1");
});

it("shows browser pets after a few seconds when Solana is slow, but waits for it when they are all on Solana", async () => {
  vi.useFakeTimers();
  const useCompanion = await companion();
  mock.fetch.mockReturnValue(new Promise(() => {}));
  mock.guests = [guest("local-1")];
  const withGuests = renderHook(useCompanion);
  expect(withGuests.result.current.ready).toBe(false);
  await act(async () => { vi.advanceTimersByTime(4_000); });
  expect(withGuests.result.current.ready).toBe(true);
  withGuests.unmount();

  mock.guests = [];
  const onlyChain = renderHook(useCompanion);
  expect(onlyChain.result.current.ready).toBe(false);
});

it("gives up on a read that never answers, keeping the screen out of a loader", async () => {
  vi.useFakeTimers();
  const useCompanion = await companion();
  mock.fetch.mockReturnValue(new Promise(() => {}));
  const hook = renderHook(useCompanion);
  expect(hook.result.current.ready).toBe(false);
  await act(async () => { vi.advanceTimersByTime(12_000); });
  expect(hook.result.current.ready).toBe(true);
  expect(hook.result.current.chainError).toBeInstanceOf(Error);
});
