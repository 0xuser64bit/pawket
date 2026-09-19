import { getPublicEnv } from "@/config/env";
import { APP_NAME } from "@/config/site";
import { truncateAddress } from "@/lib/utils/format";

const CLUSTER_DOT: Record<string, string> = {
  devnet: "bg-emerald-400",
  testnet: "bg-sky-400",
  localnet: "bg-amber-400",
  "mainnet-beta": "bg-rose-400",
};

/**
 * Server Component: proves public env is readable server-side without
 * touching wallet state. Cluster + program ID shown here must match what
 * the client uses (single source: `getPublicEnv()`).
 */
export function NetworkBadge() {
  const env = getPublicEnv();
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
      <span
        aria-hidden="true"
        className={`inline-block size-2 rounded-full ${CLUSTER_DOT[env.solanaCluster] ?? "bg-slate-400"}`}
      />
      Cluster{" "}
      <span className="font-mono font-semibold text-slate-100">
        {env.solanaCluster}
      </span>
      <span aria-hidden="true" className="text-slate-600">
        ·
      </span>
      Program{" "}
      <span
        className="font-mono font-semibold text-slate-100"
        title={env.pawketProgramId}
      >
        {truncateAddress(env.pawketProgramId)}
      </span>
      <span className="sr-only">for {APP_NAME}</span>
    </p>
  );
}
