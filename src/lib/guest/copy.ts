import { migrateStoredPet, type GuestPet } from "./pet";

/**
 * A copy of the pets in this browser, as plain text a player keeps where
 * they like — a file, a note — to bring them back if the browser forgets
 * them, or into another browser. It is the same record the browser stores;
 * reading one back holds every pet to the same schema and migrations, so a
 * copy can never put something into storage that a save could not.
 * Progress in a copy is the player's own, as in the browser: it is never
 * taken onto Solana, where a pet's record starts when it is kept there.
 */
const KIND = "pawket-pets";
const VERSION = 1;
/** A copy is a handful of pets; anything this large is not one. */
export const MAX_COPY_LENGTH = 512_000;

export function petsCopy(pets: readonly GuestPet[], now = new Date()): string {
  return JSON.stringify({ kind: KIND, version: VERSION, savedAt: now.toISOString(), pets }, null, 1);
}

export type ReadCopy = { pets: GuestPet[]; unreadable: number } | { error: string };

/** The pets in a copy — or a bare list of pet records — with how many could not be read. */
export function readPetsCopy(text: string): ReadCopy {
  if (!text.trim()) return { error: "Paste a copy first." };
  if (text.length > MAX_COPY_LENGTH) return { error: "That is far longer than a copy of pets. Nothing was brought back." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "That is not a copy Pawket made. Nothing was brought back." };
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && (parsed as { kind?: unknown }).kind === KIND && Array.isArray((parsed as { pets?: unknown }).pets)
      ? (parsed as { pets: unknown[] }).pets
      : null;
  if (!list) return { error: "That is not a copy Pawket made. Nothing was brought back." };
  const pets: GuestPet[] = [];
  for (const entry of list) {
    const pet = migrateStoredPet(entry);
    if (pet) pets.push(pet);
  }
  if (pets.length === 0) return { error: "No pet in that copy could be read. Nothing was brought back." };
  return { pets, unreadable: list.length - pets.length };
}
