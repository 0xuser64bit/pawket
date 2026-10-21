const LAMPORTS_PER_SOL = 1_000_000_000n;

export function truncateAddress(value: string, chars = 4): string {
  if (value.length <= chars * 2 + 1) return value;
  return `${value.slice(0, chars)}…${value.slice(-chars)}`;
}

export function formatSol(lamports: bigint): string {
  const sign = lamports < 0n ? "-" : "";
  const magnitude = lamports < 0n ? -lamports : lamports;
  const whole = magnitude / LAMPORTS_PER_SOL;
  const frac = magnitude % LAMPORTS_PER_SOL;
  if (frac === 0n) return `${sign}${whole}`;
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return `${sign}${whole}.${fracStr}`;
}

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

export function formatUtcDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCDate()} ${UTC_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function parseSolToLamports(input: string): bigint | null {
  return parseUnits(input, 9);
}

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

export function formatUnits(units: bigint | string, decimals: number, places = decimals): string {
  const value = typeof units === "string" ? BigInt(units) : units;
  const sign = value < 0n ? "-" : "";
  const magnitude = value < 0n ? -value : value;
  const scale = 10n ** BigInt(decimals);
  const whole = (magnitude / scale).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (magnitude % scale).toString().padStart(decimals, "0").slice(0, places).replace(/0+$/, "");
  return `${sign}${whole}${frac ? `.${frac}` : ""}`;
}

export function formatAgo(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  const days = Math.floor(s / 86_400);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function dayTurnsAt(now: Date = new Date(), options: { locale?: string; timeZone?: string } = {}): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const clock = new Intl.DateTimeFormat(options.locale, { hour: "numeric", minute: "2-digit", hourCycle: "h23", timeZone: options.timeZone }).format(next);
  if (/^0?0:00$/.test(clock)) return "at midnight";
  return `at ${new Intl.DateTimeFormat(options.locale, { hour: "numeric", minute: "2-digit", timeZone: options.timeZone }).format(next)} here`;
}

/** No browser hyphenates a proper noun, so a word over ten letters steps the heading down a size. */
export function nameHeadingClass(name: string, large = "display-l", small = "display-m"): string {
  return Math.max(...name.split(/\s+/).map((word) => [...word].length)) > 10 ? small : large;
}
