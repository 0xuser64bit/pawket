import { GUILD_LIMITS } from "@/lib/solana/program";

export const CREST_GLYPHS = ["paw", "star", "heart", "moon", "spark", "ball", "crown", "music"] as const;

export const CREST_COLOURS = [
  { id: "bloom", label: "Bloom", token: "var(--bloom)", on: "var(--on-bloom)" },
  { id: "pool", label: "Pool", token: "var(--pool)", on: "var(--on-pool)" },
  { id: "sprout", label: "Sprout", token: "var(--sprout)", on: "var(--on-sprout)" },
  { id: "sun", label: "Sun", token: "var(--sun)", on: "var(--on-sun)" },
  { id: "copper", label: "Copper", token: "var(--trim-copper)", on: "var(--ink-inverse)" },
  { id: "glass", label: "Glass", token: "var(--trim-glass)", on: "var(--ink-inverse)" },
] as const;

const utf8 = new TextEncoder();
const bytes = (value: string) => utf8.encode(value).length;

export function slugFor(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, GUILD_LIMITS.maxSlug)
    .replace(/-+$/, "");
}

export function nameFor(slug: string): string | null {
  const name = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return isValidSlug(slug) && !RESERVED.has(slug) && slugFor(name) === slug ? name : null;
}

const RESERVED = new Set<string>(GUILD_LIMITS.reserved);

export function isValidSlug(slug: string): boolean {
  return (
    slug.length >= GUILD_LIMITS.minSlug &&
    slug.length <= GUILD_LIMITS.maxSlug &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)
  );
}

export interface GuildDraft {
  name: string;
  motto: string;
  crest: number;
  colour: number;
}

export function guildProblems(draft: GuildDraft): Partial<Record<keyof GuildDraft, string>> {
  const problems: Partial<Record<keyof GuildDraft, string>> = {};
  const name = draft.name.trim();
  if (bytes(name) < GUILD_LIMITS.minName || bytes(name) > GUILD_LIMITS.maxName) {
    problems.name = `A guild's name is ${GUILD_LIMITS.minName} to ${GUILD_LIMITS.maxName} characters.`;
  } else if (!isValidSlug(slugFor(name))) {
    problems.name = "A guild's name needs at least three letters or numbers, so it has an address.";
  } else if (RESERVED.has(slugFor(name))) {
    problems.name = "That address is one of Pawket's own pages. Try another name.";
  }
  if (bytes(draft.motto.trim()) > GUILD_LIMITS.maxMotto) {
    problems.motto = `A motto is at most ${GUILD_LIMITS.maxMotto} characters.`;
  }
  if (!Number.isInteger(draft.crest) || draft.crest < 0 || draft.crest >= GUILD_LIMITS.crests) problems.crest = "Pick a crest.";
  if (!Number.isInteger(draft.colour) || draft.colour < 0 || draft.colour >= GUILD_LIMITS.colours) problems.colour = "Pick a colour.";
  return problems;
}
