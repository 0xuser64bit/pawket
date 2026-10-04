/**
 * What Pawket says about a guild coin, in one place, so the words a player
 * reads before buying are the words this file holds — and a test can hold
 * them to the rule: a coin is described, never sold — `BANNED_PHRASES` are
 * the words no coin surface uses (`docs/SAFETY-ECONOMY.md`).
 */

/** Read before a first trade in a coin, and on its page after. Each says what can go wrong, plainly. */
export const COIN_RISKS: readonly string[] = [
  "A coin's price moves with every trade, and it can fall to nothing. Put in only what you would be fine losing.",
  "Nobody promises it any value — not Pawket, not the guild's founder, not Meteora. Owning it earns you nothing.",
  "Selling may not find a buyer at the price you want, especially before the curve graduates.",
  "It runs on Meteora's programs on Solana. A program can have a flaw, and a transaction can be slow or fail.",
  "If Pawket stops promoting the guild, it stops offering trades in the coin here. What you hold stays yours on Solana; Pawket cannot take it or reverse a trade.",
];

/** What holding a coin does on Pawket. Cosmetic and social only, and selling ends it. */
export const COIN_DOES: readonly string[] = [
  "Pets whose owner holds any of the coin wear the guild's crest pin on the guild's page.",
  "Selling all of it takes the pin off. Nothing else changes.",
];

/** What a coin never does, whatever anyone holds. The guild rule's coin half (`src/lib/guilds/boundary.ts`). */
export const COIN_NEVER: readonly string[] = [
  "It never changes a pet's vitals, XP, level, cooldowns or streak.",
  "It never decides who may join a guild, play, or adopt.",
  "It never weighs a vote, a score or a place in the park.",
];

/** A devnet coin, said once at the top of its page. */
export const DEVNET_COIN_NOTE =
  "This is devnet: its coins are test tokens with no value, and its SOL comes free from a faucet. Everything else works as it will on mainnet.";

/**
 * Words a coin's copy never uses, case-insensitively — the list
 * `docs/AGENT-GUIDE.md` §5 asks every coin surface to pass.
 */
export const BANNED_PHRASES: readonly string[] = [
  "guaranteed",
  "moon",
  "100x",
  "risk-free",
  "passive income",
  "yield",
  "apy",
  "profit share",
  "price support",
  "can't lose",
  "investment",
  "opportunity",
];
