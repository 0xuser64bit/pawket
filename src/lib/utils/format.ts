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
  return parseUnits(input, 9);
}

/**
 * Parse a user-typed amount of a token with `decimals` places (SOL is 9, a
 * guild coin 6) into its smallest units. Null when it is not a positive
 * amount with at most that many places, or would not fit a u64.
 */
export function parseUnits(input: string, decimals: number): bigint | null {
  const trimmed = input.trim().replace(/,/g, "");
  if (!trimmed) return null;
  if (!new RegExp(`^(?:\\d+(?:\\.\\d{1,${decimals}})?|\\.\\d{1,${decimals}})$`).test(trimmed)) return null;
  const dotted = trimmed.startsWith(".") ? `0${trimmed}` : trimmed;
  const [whole, frac = ""] = dotted.split(".");
  const amount = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0"));
  if (amount <= 0n || amount > MAX_LAMPORTS) return null;
  return amount;
}

/**
 * Smallest units as a figure a person reads: thousands grouped, at most
 * `places` decimals, trailing zeros dropped. `formatUnits(1234567890n, 6, 2)`
 * is "1,234.56".
 */
export function formatUnits(units: bigint | string, decimals: number, places = decimals): string {
  const value = typeof units === "string" ? BigInt(units) : units;
  const sign = value < 0n ? "-" : "";
  const magnitude = value < 0n ? -value : value;
  const scale = 10n ** BigInt(decimals);
  const whole = (magnitude / scale).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (magnitude % scale).toString().padStart(decimals, "0").slice(0, places).replace(/0+$/, "");
  return `${sign}${whole}${frac ? `.${frac}` : ""}`;
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

/**
 * When Pawket's day turns over, in the viewer's own clock: streaks, today's
 * round and the daily bonus all count the UTC day, as the program does, so
 * for most of the world it does not end at local midnight. "at midnight"
 * where local time is UTC, else "at 5:00 PM here".
 */
export function dayTurnsAt(now: Date = new Date(), options: { locale?: string; timeZone?: string } = {}): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const clock = new Intl.DateTimeFormat(options.locale, { hour: "numeric", minute: "2-digit", hourCycle: "h23", timeZone: options.timeZone }).format(next);
  if (/^0?0:00$/.test(clock)) return "at midnight";
  return `at ${new Intl.DateTimeFormat(options.locale, { hour: "numeric", minute: "2-digit", timeZone: options.timeZone }).format(next)} here`;
}

/**
 * The display size for a heading that holds a pet's name. A name is a proper
 * noun, which no browser hyphenates: a word in it longer than a phone's column
 * holds at the large size (about ten letters) takes the size below, rather than
 * breaking in the middle.
 */
export function nameHeadingClass(name: string, large = "display-l", small = "display-m"): string {
  return Math.max(...name.split(/\s+/).map((word) => [...word].length)) > 10 ? small : large;
}
