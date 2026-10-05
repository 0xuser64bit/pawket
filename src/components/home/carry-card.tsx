"use client";

import { useState } from "react";
import { Button, Card, Stack } from "@/components/pk";
import { TxReceipt } from "@/components/wallet/tx-receipt";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { getPublicEnv } from "@/config/env";
import type { GuestPet } from "@/lib/guest/pet";
import { fetchPetOnChain } from "@/lib/solana/accounts";
import { rpc } from "@/lib/solana/browser-client";
import { getAdoptPetInstruction } from "@/lib/solana/instructions";
import { derivePassportPda, derivePetPda } from "@/lib/solana/pda";
import { useSponsor, type PawketSender } from "@/lib/solana/use-send";
import type { Address } from "@solana/kit";

/**
 * Moving the pet in this browser onto Solana. It is offered here because it
 * does something specific: a record of every care that nobody can edit,
 * which outlives this browser. The chain only knows what it saw, so the
 * record there starts today — said before the wallet opens, not after.
 */
export function CarryCard({
  pet,
  owner,
  canSign,
  sender,
  fresh = false,
  onCarried,
}: {
  pet: GuestPet;
  owner: Address | null;
  canSign: boolean;
  /** Home's sender, so the receipt outlives this card once the pet is on Solana. */
  sender: PawketSender;
  /** Offered on the day of adoption, when the record there starting today loses nothing. */
  fresh?: boolean;
  /** Called once Solana confirms the pet, with its address. The caller retires the browser copy. */
  onCarried: (address: Address) => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [taken, setTaken] = useState(false);
  const sponsor = useSponsor();
  const cluster = getPublicEnv().solanaCluster;

  async function carry() {
    if (!owner) return;
    const petPda = (await derivePetPda(owner, pet.name)).address;
    if (await fetchPetOnChain(rpc, petPda).catch(() => null)) {
      setTaken(true);
      return;
    }
    const passport = (await derivePassportPda(petPda)).address;
    const result = await sender.act(`Record ${pet.name} on Solana`, ({ owner: signer, payer }) => [
      getAdoptPetInstruction({
        owner: signer,
        payer,
        pet: petPda,
        passport,
        name: pet.name,
        species: pet.species,
        personality: pet.personality,
      }),
    ]);
    if (result?.outcome === "confirmed") onCarried(petPda);
  }

  return (
    <Card>
      <h2 className="title">Keep {pet.name} on Solana</h2>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        A record nobody can edit or erase: every care, the streak and the level, on Solana {cluster}. It
        outlives this browser, and anyone can look it up.{" "}
        {sponsor.data?.available ? "Pawket pays the network fee." : "It costs a small network fee in devnet SOL."}
      </p>
      <Stack gap={3} className="pk-foot">
        {owner && canSign ? (
          <>
            <p className="body-sm">
              {fresh
                ? `${pet.name} arrived today, so nothing is lost: their record there starts today too.`
                : `${pet.name}'s record there starts today, at level 1 with a fresh streak — the chain can only keep what it sees.`}{" "}
              Once Solana confirms it, the copy in this browser is replaced.
            </p>
            {taken ? (
              <p role="alert" className="body-sm" style={{ color: "var(--alarm-text)" }}>
                This wallet already keeps a pet named {pet.name}. Nothing changed.
              </p>
            ) : null}
            <div>
              <Button
                label={`Record ${pet.name}`}
                icon="paw"
                tone="pool"
                disabled={sender.busy || taken}
                onClick={() => void carry()}
              />
            </div>
            <TxReceipt tx={sender.tx} cluster={cluster} />
          </>
        ) : owner ? (
          <p className="body-sm pk-muted">This wallet can only be read, not signed with. Connect one that signs.</p>
        ) : (
          <div>
            <Button label="Connect a wallet" icon="wallet" tone="quiet" onClick={() => setConnecting(true)} />
          </div>
        )}
      </Stack>
      {connecting ? (
        <WalletSheet
          why={`Connect the wallet that will keep ${pet.name}. It signs for the pet; nothing else is asked of it.`}
          onDismiss={() => setConnecting(false)}
        />
      ) : null}
    </Card>
  );
}
