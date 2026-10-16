import { NavLink as Link } from "@/components/pk/nav-link";
import type { Toast } from "@/components/pk/toast";
import type { SolanaCluster } from "@/config/env";
import { explorerTxUrl } from "@/lib/solana/cluster";
import type { TxState } from "@/lib/solana/use-send";
import { inAndroidApp } from "@/lib/native/android";
import { DevnetFaucet } from "@/components/wallet/faucet";

/** Where a linked device key lives, said as the player sees it: this app, or this browser. Toasts are made at run time, never on the server. */
const here = () => (inAndroidApp() ? "this app" : "this browser");

/**
 * What a send looks like, as a toast. Waiting is neutral; a record is a fact
 * with its signature a tap away, not a celebration; a timeout is "still
 * waiting", never "failed"; a failure names its reason and stays until it is
 * read. The joy belongs to the animal on the screen.
 */
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
        body: tx.by === "device" ? `Signing in ${here()}.` : "Approve it in your wallet. Nothing is sent until you do.",
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
            Recorded on Solana, {paid}.{look}
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
            {title}: signed, confirmation unknown. Check its receipt before trying again. Nothing changes here until Solana confirms it.{look}
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

