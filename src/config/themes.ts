export const THEMES = [
  { id: "light", name: "Light", line: "Cream and sun: the room by day.", scheme: "light" },
  { id: "dark", name: "Dark", line: "The same room after dark.", scheme: "dark" },
  { id: "strawberry", name: "Strawberry", line: "Strawberry milk: pink, with a coral sun.", scheme: "light", item: 66 },
  { id: "honey", name: "Honey", line: "Butter yellow and warm wood.", scheme: "light", item: 67 },
  { id: "matcha", name: "Matcha", line: "Matcha latte: soft green, and calm.", scheme: "light", item: 68 },
  { id: "seaside", name: "Seaside", line: "Sea glass and white sand.", scheme: "light", item: 69 },
  { id: "lavender", name: "Lavender", line: "Lilac, and a little sleepy.", scheme: "light", item: 70 },
  { id: "starlight", name: "Starlight", line: "A navy night with a gold moon.", scheme: "dark", item: 71 },
  { id: "blossom", name: "Blossom", line: "Cherry blossom: petal pink and plum.", scheme: "light", item: 64 },
  { id: "aurora", name: "Aurora", line: "A green-lit night, for staying up late.", scheme: "dark", item: 65 },
  { id: "terracotta", name: "Terracotta", line: "Sun-baked clay and sand.", scheme: "light", item: 72 },
  { id: "newsprint", name: "Newsprint", line: "Black ink on newsprint, and nothing else loud.", scheme: "light", item: 73 },
  { id: "cocoa", name: "Cocoa", line: "Hot cocoa: dark chocolate and caramel.", scheme: "dark", item: 74 },
  { id: "arcade", name: "Arcade", line: "An arcade after closing: violet, with neon.", scheme: "dark", item: 75 },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type ThemeChoice = ThemeId | "system";

export const THEME_KEY = "pawket.theme";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(${JSON.stringify(THEMES.filter((theme) => !("item" in theme)).map((theme) => theme.id))}.indexOf(t)>=0)document.documentElement.dataset.theme=t}catch(e){}`;

export function roomItem(id: ThemeId): number | null {
  const theme = THEMES.find((room) => room.id === id);
  return theme && "item" in theme ? theme.item : null;
}

export function roomOpen(id: ThemeId, owned: ReadonlySet<number>): boolean {
  const item = roomItem(id);
  return item === null || owned.has(item);
}
