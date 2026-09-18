import { NextResponse } from "next/server";
import { getPublicEnv } from "@/config/env";

export async function GET() {
  const env = getPublicEnv();
  return NextResponse.json({
    status: "ok",
    service: "pawket-web",
    version: process.env.npm_package_version ?? "0.1.0",
    cluster: env.solanaCluster,
    timestamp: new Date().toISOString(),
  });
}
