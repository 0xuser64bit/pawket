import { NextResponse } from "next/server";
import { getPublicEnv } from "@/config/env";

/** The metadata Pawket's keepsake collection carries. */
export function GET() {
  const app = getPublicEnv().appUrl;
  return NextResponse.json(
    {
      name: "Pawket",
      symbol: "PAWKET",
      description:
        "Keepsakes of pets kept on Solana with Pawket: one card per pet, in its owner's wallet. They cannot be sold or sent; each points to its pet's record.",
      image: `${app}/api/actions/icon`,
      external_url: `${app}/park`,
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600, s-maxage=3600" } },
  );
}
