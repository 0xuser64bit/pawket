import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CompanionState } from "@/lib/companion/use-companion";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { petsCopy } from "@/lib/guest/copy";
import { createGuestPet } from "@/lib/guest/pet";
import { loadPets, savePet } from "@/lib/guest/storage";
import { PetCopy } from "./pet-copy";

const pet = (name: string) => createGuestPet({ name, species: PetSpecies.CloudBun, personality: PetPersonality.Cozy });
const companion = (guests = loadPets()) => ({ guests }) as unknown as CompanionState;

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

it("copies the pets in this browser as text, and shows the copy when the clipboard refuses", async () => {
  const miso = pet("Miso");
  savePet(miso);
  const writeText = vi.fn<(copy: string) => Promise<void>>(async () => {});
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  render(<PetCopy companion={companion()} />);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy as text" })));
  expect(JSON.parse(writeText.mock.calls[0][0]).pets).toEqual([miso]);
  expect(screen.getByRole("status").textContent).toMatch(/copy of 1 pet is on your clipboard/);

  writeText.mockRejectedValueOnce(new Error("NotAllowedError"));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy as text" })));
  expect((screen.getByRole("textbox", { name: "Your copy" }) as HTMLTextAreaElement).value).toContain('"Miso"');
});

it("brings pets back into an empty browser from a pasted copy, and says who came back", () => {
  const copy = petsCopy([pet("Pepper"), pet("Nib")]);
  render(<PetCopy companion={companion([])} />);
  expect(screen.queryByRole("button", { name: "Copy as text" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Paste a copy"), { target: { value: copy } });
  fireEvent.click(screen.getByRole("button", { name: "Bring them back" }));
  expect(screen.getByRole("status").textContent).toBe("Pepper and Nib are back in this browser.");
  expect(loadPets().map((p) => p.name)).toEqual(["Pepper", "Nib"]);
});

it("says plainly when a paste is not a copy, and changes nothing", () => {
  render(<PetCopy companion={companion([])} />);
  fireEvent.change(screen.getByLabelText("Paste a copy"), { target: { value: "hello" } });
  fireEvent.click(screen.getByRole("button", { name: "Bring them back" }));
  expect(screen.getByRole("alert").textContent).toMatch(/not a copy Pawket made/);
  expect(loadPets()).toEqual([]);
});
