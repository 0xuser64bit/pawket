"use client";

import { useSyncExternalStore } from "react";
import * as z from "@/lib/zod";
import { roomItem, type ThemeId } from "@/config/themes";

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
  line: string;
  room?: ThemeId;
  since?: string;
}

export const DECOR: readonly DecorPiece[] = [
  { id: "sea-painting", name: "Sea painting", slot: "wall", line: "A little seascape: sun, sky and two waves." },
  { id: "paw-portrait", name: "Paw portrait", slot: "wall", line: "The paw, framed, like a family crest." },
  { id: "wall-clock", name: "Wall clock", slot: "wall", line: "A round clock that keeps this device's time." },
  { id: "bunting", name: "Bunting", slot: "wall", line: "A string of little flags, for every day." },
  { id: "bat-garland", name: "Bat garland", slot: "wall", line: "Little paper bats on a string, for autumn.", since: "2026-10-21" },
  { id: "blossom-scroll", name: "Blossom scroll", slot: "wall", line: "A hanging scroll with a cherry branch.", room: "blossom" },
  { id: "aurora-print", name: "Northern lights", slot: "wall", line: "A print of a green-lit sky.", room: "aurora" },
  { id: "star-chart", name: "Moon and stars", slot: "wall", line: "A round night sky with a gold moon.", room: "starlight" },
  { id: "sun-mirror", name: "Sun mirror", slot: "wall", line: "A clay sunburst around a mirror.", room: "terracotta" },
  { id: "front-page", name: "Front page", slot: "wall", line: "Today's news, framed: all about your pet.", room: "newsprint" },
  { id: "neon-heart", name: "Neon heart", slot: "wall", line: "A heart that glows after dark.", room: "arcade" },
  { id: "fern", name: "Fern", slot: "corner", line: "The plant the room came with." },
  { id: "cactus", name: "Cactus", slot: "corner", line: "Round, prickly, and never thirsty." },
  { id: "monstera", name: "Monstera", slot: "corner", line: "Big leaves with holes in them." },
  { id: "sunflower", name: "Sunflower", slot: "corner", line: "One tall flower that faces the window." },
  { id: "pumpkin-lantern", name: "Pumpkin lantern", slot: "corner", line: "A carved autumn pumpkin that grins, and glows after dark.", since: "2026-10-21" },
  { id: "bonsai", name: "Bonsai", slot: "corner", line: "A small, patient tree.", room: "matcha" },
  { id: "lavender-pot", name: "Lavender", slot: "corner", line: "A pot of lilac stems, a little sleepy.", room: "lavender" },
  { id: "meadow-rug", name: "Meadow rug", slot: "rug", line: "The soft green rug the room came with." },
  { id: "round-rug", name: "Round rug", slot: "rug", line: "Rings of sun, like a braided mat." },
  { id: "striped-rug", name: "Striped rug", slot: "rug", line: "Pool and cream stripes." },
  { id: "heart-rug", name: "Heart rug", slot: "rug", line: "A rug in the shape of a heart." },
  { id: "strawberry-rug", name: "Strawberry rug", slot: "rug", line: "A strawberry, seeds and all.", room: "strawberry" },
  { id: "honeycomb-rug", name: "Honeycomb rug", slot: "rug", line: "Golden cells, warm underfoot.", room: "honey" },
  { id: "basket", name: "Basket", slot: "bed", line: "A woven basket with a cushion in it." },
  { id: "cloud-bed", name: "Cloud bed", slot: "bed", line: "A puffy cloud to sink into." },
  { id: "box-bed", name: "Cardboard box", slot: "bed", line: "The best bed there is, as every pet knows." },
  { id: "donut-bed", name: "Donut bed", slot: "bed", line: "A ring cushion with sprinkles." },
  { id: "shell-bed", name: "Seashell bed", slot: "bed", line: "A scallop shell, lined with sand-soft cloth.", room: "seaside" },
  { id: "mug-bed", name: "Cocoa mug", slot: "bed", line: "A giant mug to curl up in.", room: "cocoa" },
  { id: "floor-lamp", name: "Floor lamp", slot: "side", line: "A tall lamp that is lit after dark." },
  { id: "bookcase", name: "Bookcase", slot: "side", line: "Three shelves of books and a plant." },
  { id: "cat-tree", name: "Climbing tree", slot: "side", line: "Posts, platforms and a dangling toy." },
  { id: "leaf-pile", name: "Leaf pile", slot: "side", line: "A heap of autumn leaves, for jumping in.", since: "2026-10-21" },
];

export const AUTUMN: ReadonlySet<number> = new Set([8, 9, 10]);

export function isNewDecor(piece: DecorPiece, now: Date): boolean {
  return piece.since !== undefined && now.getTime() - Date.parse(piece.since) < 30 * 86_400_000;
}

export const DEFAULT_DECOR: Readonly<Record<DecorSlot, string | null>> = {
  wall: null,
  corner: "fern",
  rug: "meadow-rug",
  bed: "basket",
  side: null,
};

export const MAY_BE_EMPTY: Readonly<Record<DecorSlot, boolean>> = { wall: true, corner: true, rug: true, bed: false, side: true };

export type RoomDecor = Record<DecorSlot, string | null>;

export function findDecor(id: string | null | undefined): DecorPiece | undefined {
  return id ? DECOR.find((piece) => piece.id === id) : undefined;
}

export function decorOpen(piece: DecorPiece, owned: ReadonlySet<number>): boolean {
  if (!piece.room) return true;
  const item = roomItem(piece.room);
  return item === null || owned.has(item);
}

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
  slots: z.object(Object.fromEntries(DECOR_SLOTS.map((slot) => [slot, z.nullable(z.string().check(z.maxLength(40)))])) as Record<DecorSlot, z.ZodMiniNullable<z.ZodMiniString>>),
});

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
  } catch {}
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

export function useRoomDecor(): RoomDecor {
  return useSyncExternalStore(subscribe, readDecor, () => DEFAULT_DECOR);
}
