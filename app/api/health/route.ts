import { NextResponse } from "next/server";
import { getPublicEnv } from "@/config/env";
import { APP_VERSION } from "@/config/site";
import { sponsorRpc, sponsorState } from "@/server/sponsor";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getPublicEnv();
  const started = Date.now();
  const rpc = await sponsorRpc()
    .getSlot({ commitment: "confirmed" })
    .send({ abortSignal: AbortSignal.timeout(5_000) })
    .then(
      () => ({ ok: true, ms: Date.now() - started }),
      () => ({ ok: false, ms: Date.now() - started }),
    );
  const sponsor = await sponsorState().then(
    (state) => (state.available ? { available: true } : { available: false, reason: state.reason }),
    () => ({ available: false, reason: "The sponsor cannot reach the network." }),
  );
  return NextResponse.json(
    {
      status: rpc.ok ? "ok" : "degraded",
      service: "pawket-web",
      version: APP_VERSION,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      cluster: env.solanaCluster,
      rpc,
      sponsor,
      timestamp: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
