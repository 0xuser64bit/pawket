/**
 * The rooms a player can pick. Each id is a token block in `app/globals.css`
 * (`:root[data-theme="…"]`); this list only names them and says which are
 * evening rooms. With no pick, the room follows the system: Daylight by day,
 * Lamplight after dark. The last two are the Market's: a room with an
 * `item` is offered once the connected wallet's closet holds that item.
 */
export const THEMES = [
  { id: "light", name: "Daylight", line: "Cream and sun: the room by day.", scheme: "light" },
  { id: "dark", name: "Lamplight", line: "The same room after dark.", scheme: "dark" },
  { id: "strawberry", name: "Strawberry", line: "Strawberry milk: pink, with a coral sun.", scheme: "light" },
  { id: "honey", name: "Honey", line: "Butter yellow and warm wood.", scheme: "light" },
  { id: "matcha", name: "Matcha", line: "Matcha latte: soft green, and calm.", scheme: "light" },
  { id: "seaside", name: "Seaside", line: "Sea glass and white sand.", scheme: "light" },
  { id: "lavender", name: "Lavender", line: "Lilac, and a little sleepy.", scheme: "light" },
  { id: "starlight", name: "Starlight", line: "A navy night with a gold moon.", scheme: "dark" },
  // The Market's rooms: bought once (their item id is the program's), then any device of the wallet's.
  { id: "blossom", name: "Blossom", line: "Cherry blossom: petal pink and plum.", scheme: "light", item: 64 },
  { id: "aurora", name: "Aurora", line: "A green-lit night, for staying up late.", scheme: "dark", item: 65 },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
/** A pick, or none: follow the system. */
export type ThemeChoice = ThemeId | "system";

export const THEME_KEY = "pawket.theme";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

/**
 * Applied before paint, from the root layout, so the page never flashes the
 * wrong room. It only ever sets an id this list knows.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(${JSON.stringify(THEMES.map((theme) => theme.id))}.indexOf(t)>=0)document.documentElement.dataset.theme=t}catch(e){}`;

/** A room's Market item id, or null for a room that is free. */
export function roomItem(id: ThemeId): number | null {
  const theme = THEMES.find((room) => room.id === id);
  return theme && "item" in theme ? theme.item : null;
}

/** Whether a room is open to someone whose closet holds `owned` (item ids). */
export function roomOpen(id: ThemeId, owned: ReadonlySet<number>): boolean {
  const item = roomItem(id);
  return item === null || owned.has(item);
}
