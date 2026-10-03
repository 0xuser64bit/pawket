/**
 * Guilds Pawket no longer shows in discovery, by slug. A guild lives on
 * Solana and Pawket cannot remove it, take a pet out of it or undo anything
 * it did — this list only stops Pawket promoting it, and its page says so.
 * A slug goes here for impersonation, a misleading claim or abuse.
 */
export const DELISTED_SLUGS: ReadonlySet<string> = new Set<string>([]);

/** What the devnet tests call the guilds they found, so they never crowd the real ones. */
export const TEST_GUILD_NAME = "Devnet Check";

/** Whether discovery shows a guild. Its own page is always reachable. */
export function isListed(guild: { slug: string; name: string }): boolean {
  return !DELISTED_SLUGS.has(guild.slug) && !guild.name.startsWith(TEST_GUILD_NAME);
}
