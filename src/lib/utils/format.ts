const LAMPORTS_PER_SOL = 1_000_000_000n;

/** `abc1…xyz9` truncation for addresses and signatures. */
export function truncateAddress(value: string, chars = 4): string {
  if (value.length <= chars * 2 + 1) return value;
  return `${value.slice(0, chars)}…${value.slice(-chars)}`;
}

/** BigInt-safe lamports → SOL string with up to 9 decimals, trimmed. */
export function formatSol(lamports: bigint): string {
  const whole = lamports / LAMPORTS_PER_SOL;
  const frac = lamports % LAMPORTS_PER_SOL;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

/** Parse a user-typed SOL amount to lamports. Returns null when invalid. */
export function parseSolToLamports(input: string): bigint | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,9})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const amount =
    BigInt(whole) * LAMPORTS_PER_SOL +
    BigInt((frac + "000000000").slice(0, 9));
  return amount > 0n ? amount : null;
}
