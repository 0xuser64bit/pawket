export type ShelfKind = "piece" | "room" | "frame" | "decor";

export interface ShelfEntry {
  name: string;
  line: string;
  kind: ShelfKind;
  tags: readonly string[];
}

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

function words(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter(Boolean);
}

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
  halloween: "autumn",
  fall: "autumn",
  spooky: "autumn",
};

export function onShelf(entry: ShelfEntry, query: string, filter: ShelfFilter, owned: boolean): boolean {
  if (filter === "yours" ? !owned : filter !== "all" && filter !== entry.kind && !entry.tags.includes(filter)) return false;
  const known = words([entry.name, entry.line, entry.kind, ...entry.tags].join(" "));
  return words(query).every((word) => {
    const said = SAME[word] ?? word;
    return known.some((each) => each.startsWith(said) || each.startsWith(word));
  });
}
