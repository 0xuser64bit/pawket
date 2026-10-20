"use client";

import { useState } from "react";
import { useConnect, useWallets } from "@solana/kit-plugin-wallet/react";
import { Button, Sheet, Stack, Problem } from "@/components/pk";
import { getPublicEnv } from "@/config/env";
import { PHONE_WALLETS, wallet } from "@/lib/solana/browser-client";
import { isUserRejection, mobileWalletProblem } from "@/lib/solana/transactions";
import { useSponsor } from "@/lib/solana/use-send";
import { DevnetFaucet } from "@/components/wallet/faucet";

const INSTALL = [
  { name: "Phantom", href: "https://phantom.com/download" },
  { name: "Solflare", href: "https://solflare.com/download" },
  { name: "Backpack", href: "https://backpack.app/download" },
];

/**
 * A phone's browser has no wallet of its own: the wallet app's browser does.
 * Each app publishes a link that opens a page inside it (and offers the app
 * where it is not installed yet).
 */
const OPEN_IN = [
  { name: "Phantom", href: (page: string, ref: string) => `https://phantom.app/ul/browse/${encodeURIComponent(page)}?ref=${encodeURIComponent(ref)}` },
  { name: "Solflare", href: (page: string, ref: string) => `https://solflare.com/ul/v1/browse/${encodeURIComponent(page)}?ref=${encodeURIComponent(ref)}` },
];

/**
 * Choosing a wallet. Offered only where connecting does something — keeping
 * a pet on Solana, or finding the ones a wallet already holds — and never
 * the first thing a player sees.
 */
export function WalletSheet({ onDismiss, why }: { onDismiss: () => void; why: string }) {
  const wallets = useWallets(wallet);
  const connect = useConnect(wallet);
  const sponsor = useSponsor();
  const cluster = getPublicEnv().solanaCluster;
  const declined = connect.isError && isUserRejection(connect.error);
  // The sheet opens only after a tap, so the page and the hand are known here.
  const [where] = useState(() => ({ page: window.location.href, ref: window.location.origin, phone: window.matchMedia("(pointer: coarse)").matches }));

  return (
    <Sheet
      register="room"
      title="Connect a wallet"
      meta={`Solana ${cluster}`}
      onDismiss={onDismiss}
      foot={(dismiss) => <Button tone="quiet" size="sm" label="Not now" full onClick={dismiss} />}
    >
      <Stack gap={4}>
        <p className="body-sm">{why}</p>
        {wallets.length > 0 ? (
          <Stack gap={2}>
            {wallets.map((option) => (
              <button
                key={option.name}
                type="button"
                className="pk-btn pk-btn--quiet pk-btn--full pk-wallet-pick"
                disabled={connect.isRunning}
                onClick={() => {
                  connect.dispatchAsync(option).then(onDismiss, () => {
                    // The error is on `connect`; the sheet says it below.
                  });
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a wallet's own data-URI mark */}
                <img src={option.icon} alt="" />
                {/* Mobile Wallet Adapter is how, not what: the player knows their wallet app by its own name. */}
                <span>{option.name === PHONE_WALLETS ? "A wallet app on this phone" : option.name}</span>
              </button>
            ))}
          </Stack>
        ) : where.phone ? (
          <Stack gap={2}>
            <p className="body-sm pk-muted">
              This browser has no wallet of its own. Open this page inside your wallet app, where it can sign — the
              link offers the app if you do not have it yet.
            </p>
            {OPEN_IN.map((option) => (
              <a key={option.name} className="pk-btn pk-btn--quiet pk-btn--full" href={option.href(where.page, where.ref)} rel="noreferrer">
                <span className="pk-btn__label">Open in {option.name}</span>
              </a>
            ))}
          </Stack>
        ) : (
          <Stack gap={2}>
            <p className="body-sm pk-muted">
              No Solana wallet in this browser. Any of these works; install one, then come back.
            </p>
            {INSTALL.map((option) => (
              <a key={option.name} className="pk-btn pk-btn--quiet pk-btn--full" href={option.href} target="_blank" rel="noreferrer">
                {option.name}
              </a>
            ))}
          </Stack>
        )}
        {connect.isError ? (
          <Problem>
            {declined
              ? "You declined in your wallet. Nothing changed."
              : `${mobileWalletProblem(connect.error) ?? "That wallet did not connect."} Nothing changed.`}
          </Problem>
        ) : null}
        <p className="caption pk-faint">
          {cluster === "devnet"
            ? "Pawket is on devnet, Solana's test network, so set your wallet to devnet (in Phantom: Settings, Developer settings, Testnet mode). "
            : null}
          {sponsor.data?.available
            ? "Pawket covers pet-action fees. Link Pawket Wallet before taking actions on Solana."
            : "Each record costs a small network fee from your Pawket Wallet."}
          {cluster === "devnet" ? <DevnetFaucet /> : null}
        </p>
      </Stack>
    </Sheet>
  );
}
