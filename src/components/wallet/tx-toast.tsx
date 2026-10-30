import { NavLink as Link } from "@/components/pk/nav-link";
import type { Toast } from "@/components/pk/toast";
import type { SolanaCluster } from "@/config/env";
import { explorerTxUrl } from "@/lib/solana/cluster";
import type { TxState } from "@/lib/solana/use-send";
import { inAndroidApp } from "@/lib/native/android";
import { stopWaitingForPhoneWallet } from "@/lib/solana/browser-client";
import { DevnetFaucet } from "@/components/wallet/faucet";

const here = () => (inAndroidApp() ? "this app" : "this browser");

export function txToast(id: string, tx: TxState, cluster: SolanaCluster): Toast | null {
  const title = tx.label ?? "Your transaction";
  const look = tx.signature ? (
    <>
      {" "}
      <a href={explorerTxUrl(tx.signature, cluster)} target="_blank" rel="noreferrer">
        See it on Explorer
      </a>
    </>
  ) : null;
  switch (tx.stage) {
    case "idle":
      return null;
    case "preparing":
      return { id, tone: "wait", title, body: "Checking your wallet and preparing the record." };
    case "signing":
      return {
        id,
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
      return { id, tone: "wait", title, body: "On its way to Solana." };
    case "confirming":
      return { id, tone: "wait", title, body: "Waiting for Solana to confirm it." };
    case "confirmed": {
      const paid = tx.by === "device" ? "no pop-up" : tx.sponsored ? "Pawket paid the fee" : "you paid the fee";
      return {
        id,
        tone: "done",
        title,
        ttl: 6_000,
        body: (
          <>
            {tx.done ? `${tx.done} ` : ""}Recorded on Solana, {paid}.{look}
          </>
        ),
      };
    }
    case "unknown":
      return {
        id,
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
          id,
          tone: "note",
          ttl: 12_000,
          title: tx.needs === "limit" ? "Today's limit is used" : tx.needs === "fund" ? "Add SOL to your Pawket Wallet" : "Link your Pawket Wallet",
          body: (
            <>
              {tx.error} <Link href="/wallet">Open Pawket Wallet</Link>
            </>
          ),
        };
      }
      return {
        id,
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
