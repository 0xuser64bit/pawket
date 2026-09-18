import { getPublicEnv } from "@/config/env";
import { truncateAddress } from "@/lib/utils/format";

/**
 * Server Component: proves public env is readable server-side without
 * touching wallet state. Cluster + program ID shown here must match what
 * the client uses (single source: `getPublicEnv()`).
 */
export function NetworkBadge() {
  const env = getPublicEnv();
  return (
    <p className="text-xs text-slate-500">
      Cluster{" "}
      <span className="font-mono font-semibold text-slate-700">
        {env.solanaCluster}
      </span>{" "}
      · Program{" "}
      <span
        className="font-mono font-semibold text-slate-700"
        title={env.pawketProgramId}
      >
        {truncateAddress(env.pawketProgramId)}
      </span>
    </p>
  );
}
