"use client";

import { useState } from "react";
import { useConnectedWallet, useDisconnect } from "@solana/kit-plugin-wallet/react";
import { Button, ButtonLink, Receipt, Sheet, Stack } from "@/components/pk";
import { getPublicEnv } from "@/config/env";
import { explorerAddressUrl } from "@/lib/solana/cluster";
import { wallet } from "@/lib/solana/browser-client";
import { truncateAddress } from "@/lib/utils/format";
import { AddressLine } from "./address";

/**
 * The connected wallet, in the shell: an address is a fact, so Paper, mono
 * and hue-free. Nothing is drawn while no wallet is connected — the shell
 * does not ask anyone to connect.
 */
export function WalletChip() {
  const connected = useConnectedWallet(wallet);
  const disconnect = useDisconnect(wallet);
  const [open, setOpen] = useState(false);
  if (!connected) return null;

  const address = connected.account.address;
  const cluster = getPublicEnv().solanaCluster;
  return (
    <>
      <button
        type="button"
        className="pk-chip pk-chip--paper pk-chip--press pk-chip--wallet"
        aria-label={`Wallet ${truncateAddress(address)}`}
        onClick={() => setOpen(true)}
      >
        {truncateAddress(address)}
      </button>
      {open ? (
        <Sheet
          title="Your wallet"
          meta={`Solana ${cluster}`}
          onDismiss={() => setOpen(false)}
          foot={
            <Stack gap={2}>
              <ButtonLink tone="paper" label="Pawket Wallet" href="/wallet" full onClick={() => setOpen(false)} />
              <Button
                tone="paper"
                label="Disconnect"
                full
                onClick={() => {
                  disconnect.dispatch();
                  setOpen(false);
                }}
              />
              <Button tone="paper" label="Close" full onClick={() => setOpen(false)} />
            </Stack>
          }
        >
          <Stack gap={3}>
            <div className="pk-receipt">
              <div className="pk-receipt__row">
                <span className="pk-receipt__k">Address</span>
                <AddressLine value={address} label="address" href={explorerAddressUrl(address, cluster)} />
              </div>
              <Receipt rows={[{ k: "Wallet", v: connected.wallet.name }]} />
            </div>
            <p className="body-sm pk-muted">
              Disconnecting changes nothing on Solana. Your pets stay there, and this browser&apos;s pet comes
              back to Home. Your Pawket Wallet — care with no prompt each time — is a tap away above.
            </p>
          </Stack>
        </Sheet>
      ) : null}
    </>
  );
}
