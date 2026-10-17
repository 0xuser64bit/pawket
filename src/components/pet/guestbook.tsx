"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Address } from "@solana/kit";
import { Button, Card } from "@/components/pk";
import { AddressLine } from "@/components/wallet/address";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { getPublicEnv } from "@/config/env";
import { useConnected } from "@/lib/solana/browser-client";
import { explorerAddressUrl } from "@/lib/solana/cluster";
import { getWaveInstruction } from "@/lib/solana/instructions";
import { deriveGuestbookPda } from "@/lib/solana/pda";
import { rentWaits, usePawketSend, useSponsor } from "@/lib/solana/use-send";
import { formatUtcDate } from "@/lib/utils/format";

/**
 * Who waved at a pet: every wave counted, the last eight kept on Solana in
 * its guestbook. Anyone but its owner can wave, once a UTC day, with
 * Pawket paying the fee — the one thing a visitor does on a pet's record,
 * and it changes nothing about the pet.
 */
export function Guestbook({
  pet,
  owner,
  name,
  waves,
  recent,
  today,
  onWaved,
}: {
  /** Called once Solana has the wave: a room plays it. */
  onWaved?: () => void;
  pet: Address;
  owner: Address;
  name: string;
  waves: number;
  /** Newest first. */
  recent: Array<{ visitor: Address; at: number }>;
  /** The UTC day the page was read on, counted from the epoch. */
  today: number;
}) {
  const connected = useConnected();
  const me = (connected?.account.address as Address | undefined) ?? null;
  const sender = usePawketSend();
  const sponsor = useSponsor();
  const waits = rentWaits(sponsor.data);
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const cluster = getPublicEnv().solanaCluster;
  const wavedToday = me !== null && recent.some((mark) => mark.visitor === me && Math.floor(mark.at / 86_400) === today);

  async function wave() {
    const guestbook = (await deriveGuestbookPda(pet)).address;
    const result = await sender.act(`Wave at ${name}`, ({ owner: visitor, payer }) => [
      getWaveInstruction({ visitor, payer, pet, guestbook }),
    ]);
    if (result?.outcome === "confirmed") {
      onWaved?.();
      router.refresh();
    }
  }

  return (
    <Card>
      <h2 className="title">Guestbook</h2>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        {waves === 0
          ? `Nobody has waved at ${name} yet.`
          : `Waved at ${waves} ${waves === 1 ? "time" : "times"}. The last ${Math.min(waves, recent.length)} are kept on Solana.`}
      </p>
      {recent.length ? (
        <ul className="pk-log">
          {recent.map((mark) => (
            <li key={`${mark.visitor}-${mark.at}`}>
              <AddressLine value={mark.visitor} label="visitor" href={explorerAddressUrl(mark.visitor, cluster)} />
              <span className="caption pk-faint">{formatUtcDate(new Date(mark.at * 1000).toISOString())}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div style={{ marginTop: "var(--space-4)" }}>
        {me === null ? (
          <Button label={`Wave at ${name}`} icon="paw" tone="quiet" size="sm" onClick={() => setConnecting(true)} />
        ) : me === owner ? (
          <p className="caption pk-faint">This is your pet: its guestbook is for everyone else.</p>
        ) : wavedToday ? (
          <p className="caption pk-faint">You waved today. Come back tomorrow.</p>
        ) : (
          <Button
            label={`Wave at ${name}`}
            icon="paw"
            tone="pool"
            size="sm"
            disabled={sender.busy || !connected?.signer || waits}
            onClick={() => void wave()}
          />
        )}
      </div>
      <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
        Once a day, from any wallet but the owner&apos;s, signed by its linked Pawket Wallet.{" "}
        {sponsor.data?.available ? "Pawket pays the fee." : waits ? "Waves wait until Pawket can pay for them again." : null} A
        wave changes nothing about {name}.
      </p>
      {connecting ? (
        <WalletSheet
          why={`Connect your wallet to wave at ${name}. The browser linked to your Pawket Wallet signs the wave; connecting signs nothing.`}
          onDismiss={() => setConnecting(false)}
        />
      ) : null}
    </Card>
  );
}
