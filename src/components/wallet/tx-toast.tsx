import { NavLink as Link } from "@/components/pk/nav-link";
import type { Toast } from "@/components/pk/toast";
import type { SolanaCluster } from "@/config/env";
import { explorerTxUrl } from "@/lib/solana/cluster";
import type { TxState } from "@/lib/solana/use-send";
import { inAndroidApp } from "@/lib/native/android";
import { stopWaitingForPhoneWallet } from "@/lib/solana/browser-client";
import { DevnetFaucet } from "@/components/wallet/faucet";

const here = () => (inAndroidApp() ? "this app" : "this browser");

function ReceiptLinks({ signature, cluster }: { signature: string; cluster: SolanaCluster }) {
  return (
    <>
      {" "}
      <a href={explorerTxUrl(signature, cluster)} target="_blank" rel="noreferrer">
        See it on Explorer
      </a>
      <span className="pk-toast__signature" role="group" aria-label="Transaction signature" tabIndex={0}>{signature}</span>
    </>
  );
}

export function txToast(id: string, tx: TxState, cluster: SolanaCluster): Toast | null {
  const title = tx.label ?? "Your transaction";
  const receipt = { id, persistent: true } as const;
  // Stage copy and recovery actions change position; receipt controls must not remount.
  const look = tx.signature ? <ReceiptLinks key="receipt" signature={tx.signature} cluster={cluster} /> : null;
  switch (tx.stage) {
    case "idle":
      return null;
    case "preparing":
      return { ...receipt, tone: "wait", title, body: "Checking your wallet and preparing the record." };
    case "signing":
      return {
        ...receipt,
        tone: "wait",
        title,
        body:
          tx.by === "device" ? (
            `Signing in ${here()}.`
          ) : tx.phone ? (
            <>
              Approve it in your wallet app. Nothing is sent until you do.{" "}
              <button type="button" className="pk-linkish" onClick={stopWaitingForPhoneWallet}>
                Nothing there? Stop waiting
              </button>
            </>
          ) : (
            "Approve it in your wallet. Nothing is sent until you do."
          ),
      };
    case "sending":
      return { ...receipt, tone: "wait", title, body: <>On its way to Solana.{look}</> };
    case "confirming":
      return { ...receipt, tone: "wait", title, body: <>Waiting for Solana to confirm it.{look}</> };
    case "confirmed": {
      const paid = tx.by === "device" ? ", no pop-up" : tx.sponsored === true ? ", Pawket paid the fee" : tx.sponsored === false ? ", you paid the fee" : "";
      return {
        ...receipt,
        tone: "done",
        title,
        body: (
          <>
            {tx.done ? `${tx.done} ` : ""}Recorded on Solana{paid}.{look}
          </>
        ),
      };
    }
    case "unknown":
      return {
        ...receipt,
        tone: "wait",
        title: "Still waiting",
        body: (
          <>
            {title}: signed, not confirmed yet. {tx.error ?? "Pawket keeps checking for a couple of minutes and says how it ends; try it again only if it did not land."}{" "}
            Nothing changes here until Solana confirms it.{look}
          </>
        ),
      };
    case "failed":
      if (tx.needs) {
        return {
          ...receipt,
          tone: "note",
          title: tx.needs === "limit" ? "Today's limit is used" : tx.needs === "fund" ? "Add SOL to your Pawket Wallet" : "Link your Pawket Wallet",
          body: (
            <>
              {tx.error} <Link href="/wallet">Open Pawket Wallet</Link>{look}
            </>
          ),
        };
      }
      return {
        ...receipt,
        tone: "risk",
        title: `${title}: it did not go through`,
        body: (
          <>
            {tx.error}
            {tx.error?.includes("Pawket Wallet") ? <> <Link href="/wallet">Open Pawket Wallet</Link></> : null}
            {tx.error && /not enough sol/i.test(tx.error) ? <DevnetFaucet /> : null}
            {look}
          </>
        ),
      };
  }
}
