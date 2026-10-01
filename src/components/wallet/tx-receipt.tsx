"use client";

import { Banner, Receipt } from "@/components/pk";
import type { SolanaCluster } from "@/config/env";
import { explorerTxUrl } from "@/lib/solana/cluster";
import type { TxState } from "@/lib/solana/use-send";
import { AddressLine } from "./address";

/**
 * What a send looks like, stage by stage. Waiting is neutral; a confirmation
 * is a fact with its signature, not a celebration; a timeout is "still
 * waiting", never "failed"; a failure names its reason and what did not
 * change. The joy belongs to the animal above it.
 */
export function TxReceipt({ tx, cluster }: { tx: TxState; cluster: SolanaCluster }) {
  // Announced as it changes, so a send is followed without looking at it.
  return <div aria-live="polite">{tx.stage === "idle" ? null : <Stage tx={tx} cluster={cluster} />}</div>;
}

function Stage({ tx, cluster }: { tx: TxState; cluster: SolanaCluster }) {
  const signature = tx.signature ? (
    <div className="pk-receipt__row">
      <span className="pk-receipt__k">Signature</span>
      <AddressLine value={tx.signature} label="signature" href={explorerTxUrl(tx.signature, cluster)} />
    </div>
  ) : null;
  const what = tx.label ? `${tx.label}. ` : "";

  switch (tx.stage) {
    case "signing":
      return (
        <Banner
          tone="wait"
          title="Waiting for your wallet"
          body={`${what}Approve it there. Nothing is sent until you do.`}
        />
      );
    case "sending":
      return <Banner tone="wait" title="Sending" body={`${what}Signed, and on its way to Solana.`} />;
    case "confirming":
      return (
        <Banner tone="wait" title="Waiting for Solana" body={`${what}Sent. Waiting for the network to confirm it.`}>
          <div className="pk-receipt" style={{ marginTop: "var(--space-2)" }}>{signature}</div>
        </Banner>
      );
    case "confirmed":
      return (
        <Banner tone="done" title="Recorded on Solana" body={tx.label}>
          <div className="pk-receipt" style={{ marginTop: "var(--space-2)" }}>
            {signature}
            <Receipt rows={[{ k: "Network fee", v: tx.sponsored ? "Paid by Pawket" : "Paid by you" }]} />
          </div>
        </Banner>
      );
    case "unknown":
      return (
        <Banner
          tone="wait"
          title="Still waiting"
          body={`${what}Signed and sent, not yet seen. Nothing here changes until Solana confirms it — look it up below.`}
        >
          <div className="pk-receipt" style={{ marginTop: "var(--space-2)" }}>{signature}</div>
        </Banner>
      );
    case "failed":
      return (
        <Banner tone="risk" title="It did not go through" body={tx.error}>
          {signature ? <div className="pk-receipt" style={{ marginTop: "var(--space-2)" }}>{signature}</div> : null}
          {tx.error && /not enough sol/i.test(tx.error) && cluster !== "mainnet-beta" ? (
            <p className="body-sm" style={{ marginTop: "var(--space-2)" }}>
              Devnet SOL is free at{" "}
              <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">
                faucet.solana.com
              </a>
              .
            </p>
          ) : null}
        </Banner>
      );
  }
}
