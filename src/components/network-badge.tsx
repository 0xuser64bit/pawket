import { getPublicEnv } from "@/config/env";
import { APP_NAME } from "@/config/site";
import { truncateAddress } from "@/lib/utils/format";

/**
 * Server Component: the cluster and program the client will actually use,
 * from one source. It is a fact, so it is set in the Paper register — mono,
 * hairline, no hue. The dot is never the only signal; the cluster is written
 * out beside it.
 */
export function NetworkBadge() {
  const env = getPublicEnv();
  return (
    // The one chip long enough to need a second line on a small phone.
    <p className="pk-chip pk-chip--paper" style={{ gap: "var(--space-2)", flexWrap: "wrap", whiteSpace: "normal" }}>
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "var(--radius-pill)",
          background: env.solanaCluster === "mainnet-beta" ? "var(--alarm)" : "var(--pool)",
          flex: "none",
        }}
      />
      Cluster {env.solanaCluster} · Program{" "}
      <span title={env.pawketProgramId}>{truncateAddress(env.pawketProgramId)}</span>
      <span className="pk-sr">for {APP_NAME}</span>
    </p>
  );
}
