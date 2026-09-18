import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "pawket-web",
    version: process.env.npm_package_version ?? "0.1.0",
    cluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet",
    timestamp: new Date().toISOString(),
  });
}
