import { NextResponse } from "next/server";
import { getPublicEnv } from "@/config/env";
import { APP_VERSION } from "@/config/site";

export async function GET() {
  const env = getPublicEnv();
  return NextResponse.json({
    status: "ok",
    service: "pawket-web",
    version: APP_VERSION,
    cluster: env.solanaCluster,
    timestamp: new Date().toISOString(),
  });
}
