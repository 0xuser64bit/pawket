import { describe, expect, it } from "vitest";
import { coinMetadata } from "./metadata";
import { coinName, coinSymbol } from "./presets";

const guild = { slug: "sunbeam-club", name: "Sunbeam Club", motto: "We rise together." };

describe("a coin's metadata", () => {
  it("uses the launch's own name and symbol", () => {
    const metadata = coinMetadata(guild, "https://pawket.world");
    expect(metadata.name).toBe(coinName(guild.name));
    expect(metadata.symbol).toBe(coinSymbol(guild.slug));
  });

  it("points the image and the page at the configured app origin", () => {
    const metadata = coinMetadata(guild, "https://dev.pawket.world/");
    expect(metadata.image).toBe("https://dev.pawket.world/api/actions/icon?guild=sunbeam-club");
    expect(metadata.external_url).toBe("https://dev.pawket.world/guilds/sunbeam-club/coin");
  });
});
