import { findCoat } from "@/lib/player/coats";
import { migrateStoredPet, type GuestPet } from "./pet";

const KIND = "pawket-pets";
const VERSION = 1;
export const MAX_COPY_LENGTH = 512_000;

export function petsCopy(pets: readonly GuestPet[], now = new Date(), coats: Readonly<Record<string, string>> = {}): string {
  const worn = Object.fromEntries(pets.filter((pet) => coats[pet.id]).map((pet) => [pet.id, coats[pet.id]]));
  return JSON.stringify({ kind: KIND, version: VERSION, savedAt: now.toISOString(), pets, ...(Object.keys(worn).length ? { coats: worn } : {}) }, null, 1);
}

export type ReadCopy = { pets: GuestPet[]; unreadable: number; coats: Record<string, string> } | { error: string };

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
  const wrote = (parsed as { coats?: unknown }).coats;
  const coats: Record<string, string> = {};
  if (wrote && typeof wrote === "object" && !Array.isArray(wrote)) {
    for (const pet of pets) {
      const id = (wrote as Record<string, unknown>)[pet.id];
      if (typeof id === "string" && findCoat(pet.species, id).id === id) coats[pet.id] = id;
    }
  }
  return { pets, unreadable: list.length - pets.length, coats };
}
