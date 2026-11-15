import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { createGuestPet } from "@/lib/guest/pet";
import { readPet, savePet } from "@/lib/guest/storage";
import { PlaygroundScreen } from "./playground-screen";

const loaded = vi.hoisted(() => [] as string[]);
const pet = createGuestPet({ name: "Pepper", species: PetSpecies.LunaCat, personality: PetPersonality.Curious });
vi.mock("@/lib/companion/use-companion", () => ({ useCompanion: () => ({ ready: true, pet, all: [pet], owned: [], owner: null }) }));
vi.mock("@/lib/solana/use-send", () => ({ usePawketSend: () => ({ busy: false, reset: vi.fn(), tx: { stage: "idle" } }) }));
vi.mock("./catch-game", () => {
  loaded.push("catch");
  return { CatchGame: ({ onFinish }: { onFinish: (score: number) => void }) => <button onClick={() => onFinish(90)}>Finish Catch</button> };
});
vi.mock("./hop-game", () => { loaded.push("hop"); return { HopGame: () => null }; });
vi.mock("./copy-game", () => { loaded.push("copy"); return { CopyGame: () => null }; });
vi.mock("./pairs-game", () => { loaded.push("pairs"); return { PairsGame: () => null }; });

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

it("loads no game at the picker and only the chosen game before saving its completed round", async () => {
  window.localStorage.clear();
  savePet(pet);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  HTMLElement.prototype.scrollIntoView = vi.fn();
  render(<PlaygroundScreen />);
  expect(screen.getByRole("button", { name: "Play Catch, today's round" })).toBeVisible();
  expect(loaded).toEqual([]);
  fireEvent.click(screen.getByRole("button", { name: "Play Catch, today's round" }));
  expect(screen.getAllByText("Opening Catch").length).toBeGreaterThan(0);
  fireEvent.click(await screen.findByRole("button", { name: "Finish Catch" }));
  expect(loaded).toEqual(["catch"]);
  expect(readPet(pet.id)).toMatchObject({ xp: 25, plays: 1 });
});
