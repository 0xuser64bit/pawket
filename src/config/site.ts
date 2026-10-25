import { version } from "../../package.json";

export const APP_NAME = "Pawket";
export const APP_TAGLINE = "A living companion";
export const APP_DESCRIPTION =
  "Adopt a luna cat, a moss pup or a cloud bun and care for it in this browser. No wallet required.";
export const APP_VERSION: string = version;

export const SUPPORT_EMAIL = "hi@pawket.world";

export function guildReportUrl(guild: { slug: string; name: string }, page: string): string {
  const subject = `Report: ${guild.name} (${guild.slug})`;
  const body = `Guild: ${page}\n\nWhat is wrong (impersonation, a scam link, a misleading claim, abuse):\n\n\nPawket can stop promoting a guild. It cannot remove it from Solana, take a pet out of it or undo anything it did.`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
