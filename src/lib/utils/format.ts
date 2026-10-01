const LAMPORTS_PER_SOL = 1_000_000_000n;

/** `abc1…xyz9` truncation for addresses and signatures. */
export function truncateAddress(value: string, chars = 4): string {
  if (value.length <= chars * 2 + 1) return value;
  return `${value.slice(0, chars)}…${value.slice(-chars)}`;
}

/** BigInt-safe lamports → SOL string with up to 9 decimals, trimmed. */
export function formatSol(lamports: bigint): string {
  const sign = lamports < 0n ? "-" : "";
  const magnitude = lamports < 0n ? -lamports : lamports;
  const whole = magnitude / LAMPORTS_PER_SOL;
  const frac = magnitude % LAMPORTS_PER_SOL;
  if (frac === 0n) return `${sign}${whole}`;
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return `${sign}${whole}.${fracStr}`;
}

/** Largest encodable lamport amount (u64) — anything above fails on-chain. */
const MAX_LAMPORTS = (1n << 64n) - 1n;

const UTC_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** `2026-09-23T12:00:00.000Z` → `23 Sep 2026`. UTC, so server and client agree. */
export function formatUtcDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCDate()} ${UTC_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Cooldown countdown: 90 → "1:30", 7 → "0:07". */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Parse a user-typed SOL amount to lamports. Returns null when invalid. */
export function parseSolToLamports(input: string): bigint | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^(?:\d+(?:\.\d{1,9})?|\.\d{1,9})$/.test(trimmed)) return null;
  const dotted = trimmed.startsWith(".") ? `0${trimmed}` : trimmed;
  const [whole, frac = ""] = dotted.split(".");
  const amount =
    BigInt(whole) * LAMPORTS_PER_SOL +
    BigInt((frac + "000000000").slice(0, 9));
  if (amount <= 0n || amount > MAX_LAMPORTS) return null;
  return amount;
}

/** How long ago, for a feed: 40 → "just now", 600 → "10 min ago", 7200 → "2 h ago", 3 days → "3 days ago". */
export function formatAgo(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  const days = Math.floor(s / 86_400);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
