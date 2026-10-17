import { expect, it } from "vitest";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { MAX_COPY_LENGTH, petsCopy, readPetsCopy } from "./copy";
import { createGuestPet } from "./pet";

const pet = (name: string) => createGuestPet({ name, species: PetSpecies.MossPup, personality: PetPersonality.Brave });

it("reads back exactly the pets it wrote", () => {
  const pets = [pet("Pepper"), pet("Miso")];
  expect(readPetsCopy(petsCopy(pets))).toEqual({ pets, unreadable: 0 });
});

it("reads a bare list of records too, and counts what it could not read", () => {
  const pepper = pet("Pepper");
  expect(readPetsCopy(JSON.stringify([pepper, { name: 3 }]))).toEqual({ pets: [pepper], unreadable: 1 });
});

it("refuses what is not a copy, in words, and never anything too large", () => {
  for (const text of ["", "{broken", JSON.stringify({ kind: "something-else", pets: [] }), JSON.stringify([{ name: 3 }]), "x".repeat(MAX_COPY_LENGTH + 1)]) {
    expect(readPetsCopy(text)).toMatchObject({ error: expect.any(String) });
  }
});

it("holds each pet to the stored schema, so a hand-edited copy cannot store what a save could not", () => {
  const edited = { ...pet("Pepper"), xp: -50 };
  expect(readPetsCopy(petsCopy([edited as never]))).toMatchObject({ error: expect.stringMatching(/No pet/) });
});
