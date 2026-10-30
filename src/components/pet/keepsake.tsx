"use client";

import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/pk";
import { getPublicEnv } from "@/config/env";
import { useConnected } from "@/lib/solana/browser-client";
import { rentWaits, usePawketSend, useSponsor } from "@/lib/solana/use-send";

export function KeepsakeCard({ owner, pet, name, made }: { owner: string; pet: string; name: string; made: boolean }) {
  const connected = useConnected();
  const sender = usePawketSend();
  const sponsor = useSponsor();
  const router = useRouter();
  const cluster = getPublicEnv().solanaCluster;
  if (connected?.account.address !== owner) return null;
  if (made) return null;
  // The card's fee and rent are always Pawket's, so it waits while Pawket cannot pay them.
  const waits = rentWaits(sponsor.data);

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
        way.{" "}
        {sponsor.data?.available
          ? "Pawket pays the fee and the rent."
          : waits
            ? "Keeping it waits until Pawket can cover its fee and rent again."
            : null}
      </p>
      <div style={{ marginTop: "var(--space-4)" }}>
        <Button
          label="Keep the card"
          icon="wallet"
          tone="pool"
          disabled={sender.busy || waits}
          onClick={() => void keep()}
        />
      </div>
    </Card>
  );
}
