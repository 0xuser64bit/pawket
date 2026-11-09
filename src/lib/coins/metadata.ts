import { coinName, coinSymbol } from "./presets";

export interface CoinMetadataGuild {
  slug: string;
  name: string;
  motto: string;
}

/**
 * The Metaplex metadata a launch points at. Its name and symbol are the same
 * calls the launch transaction makes, so the two cannot drift; the rest is
 * fixed for the guild and the app origin.
 */
export function coinMetadata(guild: CoinMetadataGuild, appUrl: string) {
  const app = appUrl.replace(/\/+$/, "");
  return {
    name: coinName(guild.name),
    symbol: coinSymbol(guild.slug),
    description: `${guild.name}'s coin, launched on Pawket. Optional, like the guild: it changes nothing about a pet, and Pawket promises it no value. ${guild.motto}`.trim(),
    image: `${app}/api/actions/icon?guild=${guild.slug}`,
    external_url: `${app}/guilds/${guild.slug}/coin`,
    attributes: [
      { trait_type: "Guild", value: guild.name },
      { trait_type: "Launched on", value: "Pawket" },
    ],
  };
}
