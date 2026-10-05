"use client";

import { useConnect, useWallets } from "@solana/kit-plugin-wallet/react";
import { Button, Sheet, Stack } from "@/components/pk";
import { wallet } from "@/lib/solana/browser-client";
import { isUserRejection, mobileWalletProblem } from "@/lib/solana/transactions";
import { useSponsor } from "@/lib/solana/use-send";

/** The name Mobile Wallet Adapter registers under (its SolanaMobileWalletAdapterWalletName), kept here so the sheet does not pull the adapter into every bundle. */
const PHONE_WALLETS = "Mobile Wallet Adapter";

const INSTALL = [
  { name: "Phantom", href: "https://phantom.com/download" },
  { name: "Solflare", href: "https://solflare.com/download" },
  { name: "Backpack", href: "https://backpack.app/download" },
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
  const declined = connect.isError && isUserRejection(connect.error);

  return (
    <Sheet
      register="room"
      title="Connect a wallet"
      meta="Solana devnet"
      onDismiss={onDismiss}
      foot={<Button tone="quiet" size="sm" label="Not now" full onClick={onDismiss} />}
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
        ) : (
          <Stack gap={2}>
            <p className="body-sm pk-muted">
              No Solana wallet in this browser. Any of these works; install one, then come back. On a
              phone, open Pawket inside the wallet app&apos;s own browser instead.
            </p>
            {INSTALL.map((option) => (
              <a key={option.name} className="pk-btn pk-btn--quiet pk-btn--full" href={option.href} target="_blank" rel="noreferrer">
                {option.name}
              </a>
            ))}
          </Stack>
        )}
        {connect.isError ? (
          <p role="alert" className="body-sm" style={{ color: "var(--alarm-text)" }}>
            {declined
              ? "You declined in your wallet. Nothing changed."
              : `${mobileWalletProblem(connect.error) ?? "That wallet did not connect."} Nothing changed.`}
          </p>
        ) : null}
        <p className="caption pk-faint">
          Pawket is on devnet, Solana&apos;s test network, so set your wallet to devnet (in Phantom: Settings,
          Developer settings, Testnet mode).{" "}
          {sponsor.data?.available
            ? "Pawket pays the network fee, so the wallet needs no SOL."
            : "Each record costs a small network fee in devnet SOL, which is free at faucet.solana.com."}
        </p>
      </Stack>
    </Sheet>
  );
}
