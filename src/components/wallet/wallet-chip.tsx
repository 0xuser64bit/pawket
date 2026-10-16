"use client";

import { NavLink as Link } from "@/components/pk/nav-link";
import { useState } from "react";
import type { Address } from "@solana/kit";
import { useConnectedWallet, useDisconnect, useIsWalletReady } from "@solana/kit-plugin-wallet/react";
import { Button, ButtonLink, Icon, Sheet, Stack } from "@/components/pk";
import { getPublicEnv } from "@/config/env";
import { explorerAddressUrl } from "@/lib/solana/cluster";
import { wallet } from "@/lib/solana/browser-client";
import { deviceFallback } from "@/lib/solana/use-send";
import { formatUtcDate, truncateAddress } from "@/lib/utils/format";
import { useMounted } from "@/lib/utils/use-mounted";
import { useLinkBrowser } from "@/lib/wallet/link";
import { AddressLine } from "./address";
import { WalletSheet } from "./wallet-sheet";
import { useHere } from "@/lib/native/android";
import { DevnetFaucet } from "@/components/wallet/faucet";

/**
 * The wallet, in the shell, just before the room switch and drawn the same
 * way: "Connect" until one is connected, then its own mark and address —
 * with a bolt while this browser signs for it, so "no pop-ups" is visible
 * from every screen. Tapping it opens the wallet you are: the address, this
 * browser's link (or one approval to make it), and the way out.
 */
export function WalletChip() {
  const mounted = useMounted();
  const ready = useIsWalletReady(wallet);
  const connected = useConnectedWallet(wallet);
  // Which sheet is open: choosing a wallet, or the wallet you are. Connecting from the first never opens the second.
  const [open, setOpen] = useState<"connect" | "panel" | null>(null);
  const linking = useLinkBrowser();
  const { Here } = useHere();
  // Nothing until the wallet has had its chance to reconnect: never a "Connect" that turns into an address.
  if (!mounted || !ready) return <span className="pk-shell-btn pk-shell-btn--hold" aria-hidden="true" />;

  if (!connected) {
    return (
      <>
        <button type="button" className="pk-btn pk-btn--quiet pk-btn--sm pk-shell-btn" onClick={() => setOpen("connect")}>
          <Icon name="wallet" size={14} />
          <span>Connect</span>
        </button>
        {open === "connect" ? (
          <WalletSheet why="Connect the wallet that keeps your pets on Solana. Connecting signs nothing." onDismiss={() => setOpen(null)} />
        ) : null}
      </>
    );
  }

  const address = connected.account.address as Address;
  const signsHere = deviceFallback(linking.state) === null && (linking.state?.balance ?? 0n) > 0n && !linking.state?.error;
  return (
    <>
      <button
        type="button"
        className="pk-btn pk-btn--quiet pk-btn--sm pk-shell-btn"
        aria-label={`Your wallet, ${truncateAddress(address)}${signsHere ? `. ${Here} signs with no pop-up` : ""}`}
        onClick={() => setOpen("panel")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a wallet's own data-URI mark */}
        <img className="pk-shell-btn__mark" src={connected.wallet.icon} alt="" />
        <span className="pk-shell-btn__address">{truncateAddress(address)}</span>
        {signsHere ? (
          <span className="pk-shell-btn__bolt" aria-hidden="true">
            <Icon name="bolt" size={10} weight={2.6} />
          </span>
        ) : null}
      </button>
      {open === "panel" ? (
        <WalletPanel address={address} name={connected.wallet.name} icon={connected.wallet.icon} linking={linking} onDismiss={() => setOpen(null)} />
      ) : null}
    </>
  );
}

/** The wallet you are: whose it is, whether this browser signs for it, and the way out. */
function WalletPanel({
  address,
  name,
  icon,
  linking,
  onDismiss,
}: {
  address: Address;
  name: string;
  icon: string;
  linking: ReturnType<typeof useLinkBrowser>;
  onDismiss: () => void;
}) {
  const disconnect = useDisconnect(wallet);
  const cluster = getPublicEnv().solanaCluster;
  const { here, Here } = useHere();
  const state = linking.state;
  const why = deviceFallback(state);
  const linkedWallet = state?.wallet;

  return (
    <Sheet
      register="room"
      title="Your wallet"
      meta={`Solana ${cluster}`}
      onDismiss={onDismiss}
      foot={(dismiss) => (
        <div className="pk-spread">
          <Button
            tone="ghost"
            size="sm"
            label="Disconnect"
            onClick={() => {
              disconnect.dispatch();
              dismiss();
            }}
          />
          <Button tone="quiet" size="sm" label="Done" onClick={dismiss} />
        </div>
      )}
    >
      <Stack gap={4}>
        <div className="pk-wallet-who">
          {/* eslint-disable-next-line @next/next/no-img-element -- a wallet's own data-URI mark */}
          <img src={icon} alt="" />
          <div className="pk-fill">
            <p className="title">{name}</p>
            <AddressLine value={address} label="address" href={explorerAddressUrl(address, cluster)} />
          </div>
        </div>

        <div className={`pk-wallet-link${why === null ? " pk-wallet-link--on" : ""}`}>
          <span className="pk-wallet-link__icon" aria-hidden="true">
            <Icon name="bolt" size={16} />
          </span>
          {!state || state.status === "loading" ? (
            <p className="body-sm pk-muted pk-fill">Reading your Pawket Wallet…</p>
          ) : state.error ? (
            <p className="body-sm pk-muted pk-fill">Pawket Wallet could not be read. Open it and try again.</p>
          ) : state.balance <= 0n && why === null ? (
            <div className="pk-fill">
              <p className="title">Add SOL to Pawket Wallet</p>
              <p className="caption pk-muted">
                {Here} is linked. Pawket acts on Solana from this balance — add some before caring, playing or buying.
                <DevnetFaucet />
              </p>
              <div style={{ marginTop: "var(--space-3)" }}>
                <ButtonLink label="Add SOL" icon="wallet" tone="sun" size="sm" href="/wallet#put-in" onClick={onDismiss} />
              </div>
            </div>
          ) : why === null ? (
            <div className="pk-fill">
              <p className="title">No pop-ups in {here}</p>
              <p className="caption pk-muted">
                It signs for your pets until {formatUtcDate(new Date(linkedWallet!.deviceExpiresAt * 1000))} —{" "}
                {linkedWallet!.actionsToday} of {linkedWallet!.dailyActions} today. Anything that spends SOL still asks.{" "}
                <Link href="/wallet" onClick={onDismiss}>
                  Manage
                </Link>
              </p>
            </div>
          ) : why === "limit" ? (
            <div className="pk-fill">
              <p className="title">Today&apos;s limit is used</p>
              <p className="caption pk-muted">
                This device can act again after midnight UTC.{" "}
                <Link href="/wallet" onClick={onDismiss}>
                  Change the limit
                </Link>
              </p>
            </div>
          ) : (
            <div className="pk-fill">
              <p className="title">{why === "expired" ? `${Here}'s link ran out` : "Set up Pawket Wallet"}</p>
              <p className="caption pk-muted">
                Pawket acts on Solana through it: {here} signs what your pets do — care, rounds, outfits, guilds,
                waves — with no pop-up, and Market looks and coins spend its balance once your wallet approves.
                <DevnetFaucet />
              </p>
              <div style={{ marginTop: "var(--space-3)" }}>
                <Button
                  tone="sun"
                  size="sm"
                  icon="bolt"
                  label={state.balance <= 0n ? "Link + add 0.01 SOL" : why === "expired" ? "Link it again" : `Link ${here}`}
                  disabled={linking.busy}
                  onClick={() => void linking.link({ deposit: state.balance > 0n ? 0n : 10_000_000n })}
                />
              </div>
              {linking.problem ? (
                <p role="alert" className="caption" style={{ color: "var(--alarm-text)", marginTop: "var(--space-2)" }}>
                  {linking.problem}
                </p>
              ) : null}
            </div>
          )}
        </div>
        <ButtonLink label="Open Pawket Wallet" icon="wallet" tone="quiet" full href="/wallet" onClick={onDismiss} />
        <p className="caption pk-faint">Disconnecting changes nothing on Solana; your pets stay there.</p>
      </Stack>
    </Sheet>
  );
}
