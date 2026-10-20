"use client";

import { useSyncExternalStore } from "react";
import * as z from "@/lib/zod";
import { roomItem, type ThemeId } from "@/config/themes";

/**
 * The room's things: a picture on the wall, a plant in the corner, a rug, the
 * pet's bed and something on the far side. Expression only, like the
 * wardrobe — nothing here reaches a vital, XP, a cooldown or a score — and
 * kept on this device, the way the player's look is.
 *
 * Each place in the room (a slot) holds one thing or, where it can stand
 * empty, nothing. Most things are free. Each of the Market's twelve rooms
 * comes with one thing of its own, open once the wallet's closet holds that
 * room (`roomItem`): no new purchase, no new item on Solana, so nothing here
 * needs the program to change. The room draws each thing three ways — flat
 * (`src/components/home/decor-art.tsx`), in 3D (`src/components/room3d/decor.ts`)
 * and as a Market tile — and `decor.test.ts` holds the three together.
 */

export const DECOR_SLOTS = ["wall", "corner", "rug", "bed", "side"] as const;
export type DecorSlot = (typeof DECOR_SLOTS)[number];

export const SLOT_LABEL: Record<DecorSlot, string> = {
  wall: "Wall",
  corner: "Corner",
  rug: "Rug",
  bed: "Bed",
  side: "By the bed",
};

export interface DecorPiece {
  id: string;
  name: string;
  slot: DecorSlot;
  /** Its one line, in the Market and the room's panel. */
  line: string;
  /** The Market room it comes with; free when left out. */
  room?: ThemeId;
}

export const DECOR: readonly DecorPiece[] = [
  // On the wall, between the window and the shelf.
  { id: "sea-painting", name: "Sea painting", slot: "wall", line: "A little seascape: sun, sky and two waves." },
  { id: "paw-portrait", name: "Paw portrait", slot: "wall", line: "The paw, framed, like a family crest." },
  { id: "wall-clock", name: "Wall clock", slot: "wall", line: "A round clock that keeps this device's time." },
  { id: "bunting", name: "Bunting", slot: "wall", line: "A string of little flags, for every day." },
  { id: "blossom-scroll", name: "Blossom scroll", slot: "wall", line: "A hanging scroll with a cherry branch.", room: "blossom" },
  { id: "aurora-print", name: "Northern lights", slot: "wall", line: "A print of a green-lit sky.", room: "aurora" },
  { id: "star-chart", name: "Moon and stars", slot: "wall", line: "A round night sky with a gold moon.", room: "starlight" },
  { id: "sun-mirror", name: "Sun mirror", slot: "wall", line: "A clay sunburst around a mirror.", room: "terracotta" },
  { id: "front-page", name: "Front page", slot: "wall", line: "Today's news, framed: all about your pet.", room: "newsprint" },
  { id: "neon-heart", name: "Neon heart", slot: "wall", line: "A heart that glows after dark.", room: "arcade" },
  // The corner by the window.
  { id: "fern", name: "Fern", slot: "corner", line: "The plant the room came with." },
  { id: "cactus", name: "Cactus", slot: "corner", line: "Round, prickly, and never thirsty." },
  { id: "monstera", name: "Monstera", slot: "corner", line: "Big leaves with holes in them." },
  { id: "sunflower", name: "Sunflower", slot: "corner", line: "One tall flower that faces the window." },
  { id: "bonsai", name: "Bonsai", slot: "corner", line: "A small, patient tree.", room: "matcha" },
  { id: "lavender-pot", name: "Lavender", slot: "corner", line: "A pot of lilac stems, a little sleepy.", room: "lavender" },
  // Under the two of them.
  { id: "meadow-rug", name: "Meadow rug", slot: "rug", line: "The soft green rug the room came with." },
  { id: "round-rug", name: "Round rug", slot: "rug", line: "Rings of sun, like a braided mat." },
  { id: "striped-rug", name: "Striped rug", slot: "rug", line: "Pool and cream stripes." },
  { id: "heart-rug", name: "Heart rug", slot: "rug", line: "A rug in the shape of a heart." },
  { id: "strawberry-rug", name: "Strawberry rug", slot: "rug", line: "A strawberry, seeds and all.", room: "strawberry" },
  { id: "honeycomb-rug", name: "Honeycomb rug", slot: "rug", line: "Golden cells, warm underfoot.", room: "honey" },
  // Where a nap happens.
  { id: "basket", name: "Basket", slot: "bed", line: "A woven basket with a cushion in it." },
  { id: "cloud-bed", name: "Cloud bed", slot: "bed", line: "A puffy cloud to sink into." },
  { id: "box-bed", name: "Cardboard box", slot: "bed", line: "The best bed there is, as every pet knows." },
  { id: "donut-bed", name: "Donut bed", slot: "bed", line: "A ring cushion with sprinkles." },
  { id: "shell-bed", name: "Seashell bed", slot: "bed", line: "A scallop shell, lined with sand-soft cloth.", room: "seaside" },
  { id: "mug-bed", name: "Cocoa mug", slot: "bed", line: "A giant mug to curl up in.", room: "cocoa" },
  // On the far side, past the bed.
  { id: "floor-lamp", name: "Floor lamp", slot: "side", line: "A tall lamp that is lit after dark." },
  { id: "bookcase", name: "Bookcase", slot: "side", line: "Three shelves of books and a plant." },
  { id: "cat-tree", name: "Climbing tree", slot: "side", line: "Posts, platforms and a dangling toy." },
];

/** A slot's thing when nothing is chosen; a slot with null can stand empty. */
export const DEFAULT_DECOR: Readonly<Record<DecorSlot, string | null>> = {
  wall: null,
  corner: "fern",
  rug: "meadow-rug",
  bed: "basket",
  side: null,
};

/** Whether a slot may hold nothing. The pet always has a bed. */
export const MAY_BE_EMPTY: Readonly<Record<DecorSlot, boolean>> = { wall: true, corner: true, rug: true, bed: false, side: true };

export type RoomDecor = Record<DecorSlot, string | null>;

export function findDecor(id: string | null | undefined): DecorPiece | undefined {
  return id ? DECOR.find((piece) => piece.id === id) : undefined;
}

/** Whether `piece` may be placed by someone whose closet holds `owned` (Market item ids). */
export function decorOpen(piece: DecorPiece, owned: ReadonlySet<number>): boolean {
  if (!piece.room) return true;
  const item = roomItem(piece.room);
  return item === null || owned.has(item);
}

/** What the room shows: each slot's choice, or its default where the choice is gone, unknown or not open. */
export function shownDecor(chosen: RoomDecor, owned: ReadonlySet<number>): RoomDecor {
  const out = { ...DEFAULT_DECOR };
  for (const slot of DECOR_SLOTS) {
    const id = chosen[slot];
    if (id === null) {
      if (MAY_BE_EMPTY[slot]) out[slot] = null;
      continue;
    }
    const piece = findDecor(id);
    if (piece && piece.slot === slot && decorOpen(piece, owned)) out[slot] = piece.id;
  }
  return out;
}

const decorSchema = z.object({
  version: z.literal(1),
  slots: z.object(Object.fromEntries(DECOR_SLOTS.map((slot) => [slot, z.string().max(40).nullable()])) as Record<DecorSlot, z.ZodNullable<z.ZodString>>),
});

/** A stored blob as the room's choices: a slot it cannot read keeps its default. */
export function parseDecor(raw: unknown): RoomDecor {
  const out: RoomDecor = { ...DEFAULT_DECOR };
  const slots = (raw as { slots?: unknown } | null)?.slots;
  if (!slots || typeof slots !== "object") return out;
  for (const slot of DECOR_SLOTS) {
    const value = (slots as Record<string, unknown>)[slot];
    if (value === null || (typeof value === "string" && findDecor(value)?.slot === slot)) out[slot] = value as string | null;
  }
  return out;
}

const KEY = "pawket.room-decor.v1";
const listeners = new Set<() => void>();
let cache: { raw: string | null; decor: RoomDecor } | null = null;

function readDecor(): RoomDecor {
  if (typeof window === "undefined") return DEFAULT_DECOR;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Blocked storage: the room as it came.
  }
  if (cache && cache.raw === raw) return cache.decor;
  let decor: RoomDecor = { ...DEFAULT_DECOR };
  if (raw) {
    try {
      decor = parseDecor(JSON.parse(raw));
    } catch {
      decor = { ...DEFAULT_DECOR };
    }
  }
  cache = { raw, decor };
  return decor;
}

/** Put `id` (or nothing) in its slot. False when storage is blocked or the choice is not one. */
export function placeDecor(slot: DecorSlot, id: string | null): boolean {
  if (id === null ? !MAY_BE_EMPTY[slot] : findDecor(id)?.slot !== slot) return false;
  const next = { ...readDecor(), [slot]: id };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(decorSchema.parse({ version: 1, slots: next })));
  } catch {
    return false;
  }
  cache = null;
  for (const listener of listeners) listener();
  return true;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The room's choices on this device, as chosen (not yet checked against a closet: see `shownDecor`). */
export function useRoomDecor(): RoomDecor {
  return useSyncExternalStore(subscribe, readDecor, () => DEFAULT_DECOR);
}
