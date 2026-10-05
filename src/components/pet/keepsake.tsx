"use client";

import { useRouter } from "next/navigation";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { Button, Card } from "@/components/pk";
import { getPublicEnv } from "@/config/env";
import { wallet } from "@/lib/solana/browser-client";
import { usePawketSend } from "@/lib/solana/use-send";

/**
 * The owner's offer of a keepsake: the pet's card in their wallet. Shown to
 * the connected owner only, and only while Pawket can pay for it. Once Solana
 * confirms it the page reads the record again; the card is never assumed.
 */
export function KeepsakeCard({ owner, pet, name, made }: { owner: string; pet: string; name: string; made: boolean }) {
  const connected = useConnectedWallet(wallet);
  const sender = usePawketSend();
  const router = useRouter();
  const cluster = getPublicEnv().solanaCluster;
  if (connected?.account.address !== owner) return null;
  if (made) return null;

  async function keep() {
    const result = await sender.sendFromServer(`Keep ${name}'s card`, `/api/keepsake/${pet}`);
    if (result?.outcome === "confirmed") router.refresh();
  }

  return (
    <Card>
      <h2 className="title">{name}&apos;s card, in your wallet</h2>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        A keepsake for your wallet&apos;s collectibles, in Pawket&apos;s collection on Solana {cluster}, pointing back
        to this record. It is frozen for good: it cannot be sold or sent, and {name} stays with this wallet either
        way. Pawket pays the fee and the rent.
      </p>
      <div style={{ marginTop: "var(--space-4)" }}>
        <Button
          label={`Keep ${name}'s card`}
          icon="wallet"
          tone="pool"
          disabled={sender.busy}
          onClick={() => void keep()}
        />
      </div>
    </Card>
  );
}
