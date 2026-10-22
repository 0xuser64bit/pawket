import { calculateLevelFromXp } from "./math";
import { CareActionType } from "./enums";

export interface BadgeRecord {
  xp: number;
  lastActionAt: Record<CareActionType, string | null>;
  streak: { best: number };
  plays: number;
}

export interface BadgeContext {
  onChain?: boolean;
  guild?: boolean;
  waves?: number;
  gatherings?: number;
}

type BadgeTone = "sun" | "sprout" | "pool" | "bloom";

export interface Badge {
  id: string;
  name: string;
  how: string;
  icon: "bowl" | "ball" | "heart" | "moon" | "paw" | "spark" | "star" | "crown" | "clock" | "shield" | "guild" | "home";
  tone: BadgeTone;
  earned: (record: BadgeRecord, context: BadgeContext) => boolean;
}

const cared = (record: BadgeRecord, action: CareActionType) => record.lastActionAt[action] !== null;
const level = (record: BadgeRecord) => calculateLevelFromXp(record.xp);

export const BADGES: readonly Badge[] = [
  { id: "first-meal", name: "First meal", how: "Feed them once.", icon: "bowl", tone: "sun", earned: (r) => cared(r, CareActionType.Feed) },
  { id: "playmate", name: "Playmate", how: "Play with them once.", icon: "ball", tone: "sun", earned: (r) => cared(r, CareActionType.Play) },
  { id: "well-brushed", name: "Well brushed", how: "Brush them once.", icon: "heart", tone: "sun", earned: (r) => cared(r, CareActionType.Groom) },
  { id: "sweet-dreams", name: "Sweet dreams", how: "Let them rest once.", icon: "moon", tone: "sun", earned: (r) => cared(r, CareActionType.Rest) },
  {
    id: "all-four",
    name: "All four",
    how: "Give every kind of care at least once.",
    icon: "paw",
    tone: "sun",
    earned: (r) => Object.values(CareActionType).every((action) => cared(r, action)),
  },
  { id: "first-round", name: "First round", how: "Finish a playground round.", icon: "star", tone: "pool", earned: (r) => r.plays >= 1 },
  { id: "ten-rounds", name: "Regular", how: "Finish ten playground rounds.", icon: "star", tone: "pool", earned: (r) => r.plays >= 10 },
  { id: "three-days", name: "Three in a row", how: "Show up three days running.", icon: "clock", tone: "sprout", earned: (r) => r.streak.best >= 3 },
  { id: "one-week", name: "A week together", how: "Show up seven days running.", icon: "clock", tone: "sprout", earned: (r) => r.streak.best >= 7 },
  { id: "growing-up", name: "Growing up", how: "Reach level 2.", icon: "spark", tone: "sprout", earned: (r) => level(r) >= 2 },
  { id: "best-friends", name: "Best friends", how: "Reach level 5.", icon: "spark", tone: "sprout", earned: (r) => level(r) >= 5 },
  { id: "inseparable", name: "Inseparable", how: "Reach level 10.", icon: "crown", tone: "sprout", earned: (r) => level(r) >= 10 },
  { id: "on-the-record", name: "On the record", how: "Keep them on Solana.", icon: "shield", tone: "pool", earned: (_, c) => c.onChain === true },
  { id: "guild-pet", name: "In a guild", how: "Join a guild on Solana. Optional, always.", icon: "guild", tone: "bloom", earned: (_, c) => c.guild === true },
  { id: "visited", name: "Visited", how: "Someone waves at them, on Solana.", icon: "paw", tone: "pool", earned: (_, c) => (c.waves ?? 0) >= 1 },
  { id: "popular", name: "Popular", how: "Ten waves in their guestbook.", icon: "heart", tone: "pool", earned: (_, c) => (c.waves ?? 0) >= 10 },
  { id: "gathering", name: "Went to a gathering", how: "Check in at a guild's event.", icon: "guild", tone: "bloom", earned: (_, c) => (c.gatherings ?? 0) >= 1 },
];

export function badgesFor(record: BadgeRecord, context: BadgeContext = {}): string[] {
  return BADGES.filter((badge) => badge.earned(record, context)).map((badge) => badge.id);
}

export function newlyEarned(before: BadgeRecord, after: BadgeRecord, context: BadgeContext = {}): Badge[] {
  const had = new Set(badgesFor(before, context));
  return BADGES.filter((badge) => !had.has(badge.id) && badge.earned(after, context));
}
