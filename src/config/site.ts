import { version } from "../../package.json";

export const APP_NAME = "Pawket";
export const APP_TAGLINE = "A living companion";
export const APP_DESCRIPTION =
  "Adopt a luna cat, a moss pup or a cloud bun and care for it in this browser. No wallet required.";
/** Single source for the release version (mirrors package.json). */
export const APP_VERSION: string = version;

/** Where a player writes to Pawket: support, privacy, and reports about a guild. */
export const SUPPORT_EMAIL = "hi@pawket.world";

/**
 * A report about a guild — impersonation, a scam link, abuse — as an email
 * to Pawket, prefilled. Pawket can only stop promoting a guild
 * (`src/lib/guilds/delisted.ts`); the report says so.
 */
export function guildReportUrl(guild: { slug: string; name: string }, page: string): string {
  const subject = `Report: ${guild.name} (${guild.slug})`;
  const body = `Guild: ${page}\n\nWhat is wrong (impersonation, a scam link, a misleading claim, abuse):\n\n\nPawket can stop promoting a guild. It cannot remove it from Solana, take a pet out of it or undo anything it did.`;
  // A mail client reads %20 as a space, never "+": each part is encoded on its own.
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
