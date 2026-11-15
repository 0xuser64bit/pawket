import { act, fireEvent, render, screen } from "@testing-library/react";
import type { Address } from "@solana/kit";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DAILY_GOAL_REWARD_XP } from "@/lib/game/constants";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import { applyGuestCare, createGuestPet, utcDay, type GuestPet } from "@/lib/guest/pet";
import type { PetOnChain } from "@/lib/solana/accounts";
import type { TxState } from "@/lib/solana/use-send";
import { readPet, savePet } from "@/lib/guest/storage";
import { keepBest, keepDaily, readBest, readDaily } from "@/lib/play/best";
import { PlaygroundScreen } from "./playground-screen";

let pet: GuestPet;
let onChain = false;
let owner: Address | null = null;
let pets: GuestPet[];
let owned: PetOnChain[];
let tx: TxState;
let chainError: unknown;
const sendRound = vi.fn();
const refresh = vi.fn();
const OWNER = "11111111111111111111111111111111" as Address;

function chainPet(record: GuestPet): PetOnChain {
  return {
    pet: { address: record.id as Address, owner: OWNER, name: record.name, species: record.species, personality: record.personality, birthTimestamp: Date.parse(record.createdAt) / 1000, level: 1, xp: record.xp, stats: record.stats, statsUpdatedAt: Date.parse(record.statsUpdatedAt) / 1000, lastCareAt: { feed: 0, play: 0, groom: 0, rest: 0 }, wearing: 0 },
    passport: { address: OWNER, pet: record.id as Address, owner: OWNER, eventCount: 0, careCount: 0, plays: record.plays, streak: 0, bestStreak: 0, lastActiveDay: 0, lastPlayDay: 0, recent: [] },
    member: null,
  };
}

vi.mock("@/lib/companion/use-companion", () => ({
  useCompanion: () => ({
    ready: true, reading: false, all: pets, pet, refresh, owner,
    chainError, owned: onChain ? owned : [],
  }),
}));
vi.mock("@/lib/solana/use-send", () => ({
  usePawketSend: () => ({ busy: false, reset: vi.fn(), tx, act: sendRound }),
}));
vi.mock("./catch-game", () => ({
  CatchGame: ({ onFinish }: { onFinish: (score: number) => void }) => <button onClick={() => onFinish(90)}>Finish Catch</button>,
}));

beforeEach(() => {
  window.localStorage.clear();
  pet = createGuestPet({ name: "Miso", species: PetSpecies.CloudBun, personality: PetPersonality.Cozy });
  savePet(pet);
  onChain = false;
  owner = null;
  pets = [pet];
  owned = [chainPet(pet)];
  tx = { stage: "idle" };
  chainError = undefined;
  sendRound.mockReset();
  refresh.mockReset().mockImplementation(async () => ({ status: "success", owner: OWNER, pets: owned }));
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

function finishCatch() {
  render(<PlaygroundScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Play Catch, today's round" }));
  fireEvent.click(screen.getByRole("button", { name: "Finish Catch" }));
}

it.each(["pawket.best.v1", "pawket.daily.v1"])("reports a failed %s write without hiding a saved pet round", (failedKey) => {
  const store = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
    if (key === failedKey) throw new Error("Storage full");
    store.call(this, key, value);
  });
  finishCatch();

  expect(screen.getByRole("alert")).toHaveTextContent(/could not store.*best scores/i);
  expect(screen.getByText(new RegExp(`\\+${DAILY_GOAL_REWARD_XP} XP for playing today`))).toBeVisible();
  expect(readPet(pet.id)).toMatchObject({ plays: 1, xp: DAILY_GOAL_REWARD_XP });
  if (failedKey === "pawket.best.v1") {
    expect(screen.queryByText("Your best")).toBeNull();
    expect(readBest()).toEqual({});
    expect(readDaily(utcDay(new Date()))).toEqual({ catch: 90 });
  } else {
    expect(screen.queryByText("Today's best")).toBeNull();
    expect(readBest()).toEqual({ catch: 90 });
    expect(readDaily(utcDay(new Date()))).toEqual({});
  }
});

it("reports score and pet storage failures independently", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
  finishCatch();
  expect(screen.getByText(/could not store all of your best scores/i)).toBeVisible();
  expect(screen.getAllByRole("alert")).toHaveLength(2);
  expect(screen.getByText(/did not store the bonus/)).toBeVisible();
  expect(screen.queryByText("Your best")).toBeNull();
  expect(screen.queryByText("Today's best")).toBeNull();
  expect(readPet(pet.id)).toEqual(pet);
});

it("does not report a storage failure for scores that did not improve", () => {
  keepBest("catch", 100);
  keepDaily("catch", utcDay(new Date()), 100);
  const store = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
    if (key === "pawket.best.v1" || key === "pawket.daily.v1") throw new Error("Storage full");
    store.call(this, key, value);
  });
  finishCatch();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText(/Your best here is 100/)).toBeVisible();
  expect(readPet(pet.id)).toMatchObject({ plays: 1, xp: DAILY_GOAL_REWARD_XP });
});

it("keeps the explicit Solana recording action when local score storage fails", () => {
  onChain = true;
  owner = OWNER;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
  finishCatch();
  expect(screen.getByRole("alert")).toHaveTextContent(/could not store.*best scores/i);
  expect(screen.getByRole("button", { name: "Record the round" })).toBeEnabled();
  expect(screen.getByText(/Record it on Solana to keep/)).toBeVisible();
  expect(readPet(pet.id)).toEqual(pet);
});

it("finishes with the initiating pet even when Home selection changes during the round", () => {
  const original = pet;
  const view = render(<PlaygroundScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Play Catch, today's round" }));
  pet = createGuestPet({ name: "Pepper", species: PetSpecies.LunaCat, personality: PetPersonality.Curious });
  savePet(pet);
  pets = [original, pet];
  view.rerender(<PlaygroundScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Finish Catch" }));
  expect(readPet(original.id)).toMatchObject({ plays: 1, xp: 25 });
  expect(readPet(pet.id)).toMatchObject({ plays: 0, xp: 0 });
});

it("does not label a new round recorded from an unrelated confirmed receipt", () => {
  onChain = true;
  owner = OWNER;
  tx = { stage: "confirmed", signature: "other-round" };
  finishCatch();
  expect(screen.getByRole("button", { name: "Record the round" })).toBeEnabled();
  expect(screen.queryByText(/Recorded\. \+25 XP/)).toBeNull();
});

it("keeps an uncertain round tied to its receipt and prevents another recording attempt", async () => {
  onChain = true;
  owner = OWNER;
  sendRound.mockResolvedValue({ outcome: "unknown", signature: "this-round", blockhash: "hash", sponsored: true, programs: [] });
  finishCatch();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Record the round" })); });
  expect(screen.queryByRole("button", { name: "Record the round" })).toBeNull();
  expect(screen.getByText(/Checking round receipt/)).toBeVisible();
  expect(sendRound).toHaveBeenCalledOnce();
});

it("waits for the updated pet and Passport and offers a read-only retry after a stale read", async () => {
  onChain = true;
  owner = OWNER;
  sendRound.mockResolvedValue({ outcome: "confirmed", signature: "this-round", blockhash: "hash", sponsored: true, programs: [] });
  finishCatch();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Record the round" })); });
  expect(screen.queryByText(/Recorded\. \+25 XP/)).toBeNull();
  expect(screen.getByRole("button", { name: "Reload round record" })).toBeEnabled();
  const before = owned[0];
  owned = [{ ...before, pet: { ...before.pet, xp: 0 }, passport: { ...before.passport, plays: 1, lastPlayDay: Math.floor(Date.now() / 86_400_000) } }];
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Reload round record" })); });
  expect(screen.getByText(/Recorded on Solana\. Today's play bonus was already kept/)).toBeVisible();
  expect(sendRound).toHaveBeenCalledOnce();
});

it("refuses to record a round with a different connected owner", async () => {
  onChain = true;
  owner = OWNER;
  const view = render(<PlaygroundScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Play Catch, today's round" }));
  owner = "So11111111111111111111111111111111111111112" as Address;
  view.rerender(<PlaygroundScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Finish Catch" }));
  const record = screen.getByRole("button", { name: "Record the round" });
  expect(record).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(record);
  expect(screen.getByText(/Reconnect the wallet/)).toBeVisible();
  expect(sendRound).not.toHaveBeenCalled();
});

it("retries a completed local round without replaying it or overwriting newer care", () => {
  const set = Storage.prototype.setItem;
  const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
    if (key === "pawket.pets.v1") throw new Error("Storage full");
    set.call(this, key, value);
  });
  finishCatch();
  expect(readPet(pet.id)).toMatchObject({ plays: 0, xp: 0 });
  const retry = screen.getByRole("button", { name: "Retry saving round" });
  blocked.mockRestore();
  const care = applyGuestCare(readPet(pet.id)!, CareActionType.Feed, new Date());
  expect(care.ok).toBe(true);
  if (!care.ok) return;
  savePet(care.pet);
  fireEvent.click(retry);
  expect(readPet(pet.id)).toMatchObject({ plays: 1, xp: 35, stats: care.pet.stats, careLog: care.pet.careLog });
  expect(screen.queryByRole("button", { name: "Retry saving round" })).toBeNull();
});

it("can retry score storage without playing another round", () => {
  const set = Storage.prototype.setItem;
  const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
    if (key === "pawket.best.v1") throw new Error("Storage full");
    set.call(this, key, value);
  });
  finishCatch();
  const retry = screen.getByRole("button", { name: "Retry saving scores" });
  blocked.mockRestore();
  fireEvent.click(retry);
  expect(readBest()).toEqual({ catch: 90 });
  expect(readPet(pet.id)).toMatchObject({ plays: 1 });
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows a retryable Solana read failure without hiding local games", async () => {
  chainError = new Error("RPC unavailable");
  let finish!: () => void;
  refresh.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
  render(<PlaygroundScreen />);
  expect(screen.getByText("Solana did not answer")).toBeVisible();
  const retry = screen.getByRole("button", { name: "Reload pets" });
  fireEvent.click(retry);
  expect(retry).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("button", { name: "Play Catch, today's round" })).toBeVisible();
  await act(async () => { finish(); });
  expect(retry).not.toHaveAttribute("aria-disabled");
});

it("reconciles only the uncertain round's own late confirmation", async () => {
  onChain = true;
  owner = OWNER;
  sendRound.mockResolvedValue({ outcome: "unknown", signature: "this-round", blockhash: "hash", sponsored: true, programs: [] });
  const view = render(<PlaygroundScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Play Catch, today's round" }));
  fireEvent.click(screen.getByRole("button", { name: "Finish Catch" }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Record the round" })); });
  tx = { stage: "confirmed", signature: "other-round" };
  view.rerender(<PlaygroundScreen />);
  expect(refresh).not.toHaveBeenCalled();
  const before = owned[0];
  owned = [{ ...before, pet: { ...before.pet, xp: 25 }, passport: { ...before.passport, plays: 1, lastPlayDay: Math.floor(Date.now() / 86_400_000) } }];
  tx = { stage: "confirmed", signature: "this-round" };
  await act(async () => { view.rerender(<PlaygroundScreen />); });
  expect(screen.getByText(/Recorded\. \+25 XP/)).toBeVisible();
  expect(sendRound).toHaveBeenCalledOnce();
});

it("starts the next chain round from the refreshed Passport instead of claiming the same bonus twice", async () => {
  onChain = true;
  owner = OWNER;
  sendRound.mockResolvedValue({ outcome: "confirmed", signature: "first-round", sponsored: true });
  const view = render(<PlaygroundScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Play Catch, today's round" }));
  fireEvent.click(screen.getByRole("button", { name: "Finish Catch" }));
  const before = owned[0];
  owned = [{ ...before, pet: { ...before.pet, xp: 25 }, passport: { ...before.passport, plays: 1, lastPlayDay: Math.floor(Date.now() / 86_400_000) } }];
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Record the round" })); });
  pet = { ...pet, xp: 25, plays: 1, lastDailyPlayDay: utcDay(new Date()) };
  pets = [pet];
  view.rerender(<PlaygroundScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Play again" }));
  fireEvent.click(screen.getByRole("button", { name: "Finish Catch" }));
  owned = [{ ...owned[0], passport: { ...owned[0].passport, plays: 2 } }];
  sendRound.mockResolvedValue({ outcome: "confirmed", signature: "second-round", sponsored: true });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Record the round" })); });
  expect(screen.getByText(/Recorded on Solana\. Today's play bonus was already kept/)).toBeVisible();
  expect(screen.queryByText(/Recorded\. \+25 XP/)).toBeNull();
});

it("does not start an old-owner read when the wallet changes before a delayed round confirmation", async () => {
  onChain = true;
  owner = OWNER;
  let finish!: (result: { outcome: "confirmed"; signature: string; sponsored: boolean }) => void;
  sendRound.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const view = render(<PlaygroundScreen />);
  fireEvent.click(screen.getByRole("button", { name: "Play Catch, today's round" }));
  fireEvent.click(screen.getByRole("button", { name: "Finish Catch" }));
  fireEvent.click(screen.getByRole("button", { name: "Record the round" }));
  owner = "So11111111111111111111111111111111111111112" as Address;
  view.rerender(<PlaygroundScreen />);
  await act(async () => { finish({ outcome: "confirmed", signature: "delayed-round", sponsored: true }); });
  expect(refresh).not.toHaveBeenCalled();
  expect(screen.queryByText(/Recorded\. \+25 XP/)).toBeNull();
  owner = OWNER;
  view.rerender(<PlaygroundScreen />);
  expect(screen.getByRole("button", { name: "Reload round record" })).not.toHaveAttribute("aria-disabled");
});
