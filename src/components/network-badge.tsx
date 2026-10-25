import { getPublicEnv } from "@/config/env";
import { APP_NAME } from "@/config/site";
import { PAWKET_PROGRAM_ID } from "@/lib/solana/program";
import { truncateAddress } from "@/lib/utils/format";

export function NetworkBadge() {
  const env = getPublicEnv();
  return (
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
      <span title={PAWKET_PROGRAM_ID}>{truncateAddress(PAWKET_PROGRAM_ID)}</span>
      <span className="pk-sr">for {APP_NAME}</span>
    </p>
  );
}
