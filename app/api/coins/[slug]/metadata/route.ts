import { NextResponse } from "next/server";
import { getPublicEnv } from "@/config/env";
import { coinName, coinSymbol } from "@/lib/coins/presets";
import { isValidSlug } from "@/lib/guilds/guild";
import { readGuild } from "@/server/solana";

/**
 * A guild coin's token metadata: the URI its mint carries, read live from
 * the guild's account so a wallet that looks again sees the guild as it is.
 * The image is the guild's crest card.
 */

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params;
  const guild = isValidSlug(slug) ? await readGuild(slug).catch(() => null) : null;
  const headers = { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300, s-maxage=300" };
  if (!guild) return NextResponse.json({ error: "No guild has that name." }, { status: 404, headers });
  const app = getPublicEnv().appUrl;
  return NextResponse.json(
    {
      name: coinName(guild.name),
      symbol: coinSymbol(slug),
      description: `${guild.name}'s coin, launched on Pawket. Optional, like the guild: it changes nothing about a pet, and Pawket promises it no value. ${guild.motto}`.trim(),
      image: `${app}/api/actions/icon?guild=${slug}`,
      external_url: `${app}/guilds/${slug}/coin`,
      attributes: [
        { trait_type: "Guild", value: guild.name },
        { trait_type: "Launched on", value: "Pawket" },
      ],
    },
    { headers },
  );
}
