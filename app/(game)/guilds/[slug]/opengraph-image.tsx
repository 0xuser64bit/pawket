import { guildCard, petCard, WIDE } from "@/server/card";
import { readGuild } from "@/server/solana";
import { isValidSlug } from "@/lib/guilds/guild";
import { isListed } from "@/lib/guilds/delisted";

export const alt = "A guild of pets on Solana, in Pawket";
export const size = WIDE;
export const contentType = "image/png";

/** The card a guild's page unfurls as: its crest, name and motto, and its pets. One Pawket no longer promotes, or none, is Pawket's own card. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guild = isValidSlug(slug) ? await readGuild(slug).catch(() => null) : null;
  return guild && isListed(guild) ? guildCard(guild, "wide") : petCard(null, "wide");
}
