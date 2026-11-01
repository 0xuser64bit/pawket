import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DAILY_GOAL_REWARD_XP } from "@/lib/game/constants";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { createGuestPet, utcDay, type GuestPet } from "@/lib/guest/pet";
import { readPet, savePet } from "@/lib/guest/storage";
import { keepBest, keepDaily, readBest, readDaily } from "@/lib/play/best";
import { PlaygroundScreen } from "./playground-screen";

let pet: GuestPet;
let onChain = false;

vi.mock("@/lib/companion/use-companion", () => ({
  useCompanion: () => ({
    ready: true, all: [pet], pet, refresh: vi.fn(),
    owned: onChain ? [{ pet: { address: pet.id }, passport: { address: "passport" } }] : [],
  }),
}));
vi.mock("@/lib/solana/use-send", () => ({
  usePawketSend: () => ({ busy: false, reset: vi.fn(), tx: { stage: "idle" }, act: vi.fn() }),
}));
vi.mock("./catch-game", () => ({
  CatchGame: ({ onFinish }: { onFinish: (score: number) => void }) => <button onClick={() => onFinish(90)}>Finish Catch</button>,
}));

beforeEach(() => {
  window.localStorage.clear();
  pet = createGuestPet({ name: "Miso", species: PetSpecies.CloudBun, personality: PetPersonality.Cozy });
  savePet(pet);
  onChain = false;
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
  expect(screen.getByRole("alert")).toHaveTextContent(/could not store.*best scores/i);
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
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
  finishCatch();
  expect(screen.getByRole("alert")).toHaveTextContent(/could not store.*best scores/i);
  expect(screen.getByRole("button", { name: "Record the round" })).toBeEnabled();
  expect(screen.getByText(/Record it on Solana to keep/)).toBeVisible();
  expect(readPet(pet.id)).toEqual(pet);
});
