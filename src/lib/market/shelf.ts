/**
 * The Market as one list a player can search and narrow: every piece, room
 * and frame, with the words a player would look for it by. Pure, so the
 * screen and its test read the same answer.
 */

export type ShelfKind = "piece" | "room" | "frame" | "decor";

export interface ShelfEntry {
  name: string;
  /** Its one line in the Market. */
  line: string;
  kind: ShelfKind;
  /** Words it is also found by: where it is worn, its material, its colours. */
  tags: readonly string[];
}

/** The ways to narrow the shelves, in the order the row shows them. */
export const SHELF_FILTERS = [
  { value: "all", label: "Everything" },
  { value: "head", label: "Hats" },
  { value: "eyes", label: "Glasses" },
  { value: "neck", label: "Neck" },
  { value: "back", label: "Back" },
  { value: "room", label: "Rooms" },
  { value: "decor", label: "Decor" },
  { value: "frame", label: "Frames" },
  { value: "yours", label: "In your closet" },
] as const;

export type ShelfFilter = (typeof SHELF_FILTERS)[number]["value"];

export function isShelfFilter(value: unknown): value is ShelfFilter {
  return SHELF_FILTERS.some((filter) => filter.value === value);
}

/** Lower case, without accents, in words. */
function words(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter(Boolean);
}

/** A few words players say for the same thing. */
const SAME: Record<string, string> = {
  specs: "glasses",
  shades: "glasses",
  cap: "hat",
  hats: "hat",
  theme: "room",
  themes: "room",
  rooms: "room",
  frames: "frame",
  photo: "frame",
  photos: "frame",
  clothes: "piece",
  outfit: "piece",
  furniture: "decor",
  decoration: "decor",
  plants: "plant",
  paintings: "painting",
  night: "dark",
  grey: "gray",
};

/**
 * Whether `entry` is on the narrowed shelf: it passes the filter and every
 * word of the query begins a word it is known by, so "hea" finds Headphones
 * and Heart glasses, and "pink room" finds the pink rooms only.
 */
export function onShelf(entry: ShelfEntry, query: string, filter: ShelfFilter, owned: boolean): boolean {
  if (filter === "yours" ? !owned : filter !== "all" && filter !== entry.kind && !entry.tags.includes(filter)) return false;
  const known = words([entry.name, entry.line, entry.kind, ...entry.tags].join(" "));
  return words(query).every((word) => {
    const said = SAME[word] ?? word;
    return known.some((each) => each.startsWith(said) || each.startsWith(word));
  });
}
