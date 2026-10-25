export const DELISTED_SLUGS: ReadonlySet<string> = new Set<string>([]);

export const TEST_GUILD_NAME = "Devnet Check";

export function isListed(guild: { slug: string; name: string }): boolean {
  return !DELISTED_SLUGS.has(guild.slug) && !guild.name.startsWith(TEST_GUILD_NAME);
}
