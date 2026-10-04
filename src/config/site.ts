import { version } from "../../package.json";

export const APP_NAME = "Pawket";
export const APP_TAGLINE = "A living companion";
export const APP_DESCRIPTION =
  "Adopt a luna cat, a moss pup or a cloud bun and care for it in this browser. No wallet required.";
/** Single source for the release version (mirrors package.json). */
export const APP_VERSION: string = version;

/** Where Pawket's code and its issues live: reports about a guild open an issue here. */
export const SOURCE_URL = "https://github.com/0xuser64bit/pawket";

/**
 * A report about a guild — impersonation, a scam link, abuse — as a new
 * issue, prefilled. Pawket can only stop promoting a guild
 * (`src/lib/guilds/delisted.ts`); the report says so.
 */
export function guildReportUrl(guild: { slug: string; name: string }, page: string): string {
  const params = new URLSearchParams({
    title: `Report: ${guild.name} (${guild.slug})`,
    labels: "report",
    body: `Guild: ${page}\n\nWhat is wrong (impersonation, a scam link, a misleading claim, abuse):\n\n\nPawket can stop promoting a guild. It cannot remove it from Solana, take a pet out of it or undo anything it did.`,
  });
  return `${SOURCE_URL}/issues/new?${params}`;
}
