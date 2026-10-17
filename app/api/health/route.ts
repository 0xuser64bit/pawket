import { NextResponse } from "next/server";
import { getPublicEnv } from "@/config/env";
import { APP_VERSION } from "@/config/site";
import { sponsorRpc, sponsorState } from "@/server/sponsor";

export const dynamic = "force-dynamic";

/**
 * Whether Pawket can do its job now, for a person or a monitor: the server
 * answers (this response), its Solana RPC answers and how fast, and whether
 * the sponsor is paying — never a secret, a balance or the provider's URL.
 * `status` is "ok" when the RPC answers, else "degraded"; HTTP 200 either
 * way, so a monitor reads the fields rather than the code.
 */
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
