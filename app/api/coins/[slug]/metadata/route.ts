import { NextResponse } from "next/server";
import { getPublicEnv } from "@/config/env";
import { coinMetadata } from "@/lib/coins/metadata";
import { isValidSlug } from "@/lib/guilds/guild";
import { readGuild } from "@/server/solana";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const CORS = { "Access-Control-Allow-Origin": "*" };
const IMMUTABLE = { ...CORS, "Cache-Control": "public, max-age=31536000, immutable" };
const UNCACHED = { ...CORS, "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params;
  const guild = isValidSlug(slug) ? await readGuild(slug).catch(() => undefined) : null;
  if (guild === undefined) return NextResponse.json({ error: "Solana did not answer. Try again." }, { status: 503, headers: UNCACHED });
  if (!guild) return NextResponse.json({ error: "No guild has that name." }, { status: 404, headers: UNCACHED });
  return NextResponse.json(coinMetadata(guild, getPublicEnv().appUrl), { headers: IMMUTABLE });
}
