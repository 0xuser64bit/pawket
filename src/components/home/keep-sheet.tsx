"use client";

import Link from "next/link";
import { useState } from "react";
import type { Address } from "@solana/kit";
import { Button, PetArt, Sheet, Stack } from "@/components/pk";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { getPublicEnv } from "@/config/env";
import { petLook } from "@/lib/game/appearance";
import { calculateLevelFromXp } from "@/lib/game/math";
import { projectGuestPet, type GuestPet } from "@/lib/guest/pet";
import { fetchPetOnChain } from "@/lib/solana/accounts";
import { rpc } from "@/lib/solana/browser-client";
import { getAdoptPetInstruction } from "@/lib/solana/instructions";
import { derivePassportPda, derivePetPda } from "@/lib/solana/pda";
import { useSponsor, type PawketSender } from "@/lib/solana/use-send";
import { useHere } from "@/lib/native/android";

/**
 * Keeping the pet in this browser on Solana, from Home's labelled control.
 * It does one specific thing: a record of every care that
 * nobody can edit, which outlives this browser. The chain only knows what it
 * saw, so the record there starts today, at level 1 — said here, with the
 * pet's own level beside it, before the wallet opens rather than after.
 */
export function KeepSheet({
  pet,
  owner,
  canSign,
  sender,
  onCarried,
  onDismiss,
}: {
  pet: GuestPet;
  owner: Address | null;
  canSign: boolean;
  /** Home's sender, so the toast outlives this sheet once the pet is on Solana. */
  sender: PawketSender;
  /** Called once Solana confirms the pet, with its address. The caller retires the browser copy. */
  onCarried: (address: Address) => void;
  onDismiss: () => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [taken, setTaken] = useState(false);
  const { here } = useHere();
  const sponsor = useSponsor();
  const cluster = getPublicEnv().solanaCluster;
  const level = calculateLevelFromXp(pet.xp);
  const fresh = pet.xp === 0;
  const ready = sender.pawketWallet?.linked && sender.pawketWallet.balance > 0n;

  async function carry() {
    if (!owner) return;
    const petPda = (await derivePetPda(owner, pet.name)).address;
    if (await fetchPetOnChain(rpc, petPda).catch(() => null)) {
      setTaken(true);
      return;
    }
    const passport = (await derivePassportPda(petPda)).address;
    const result = await sender.act(`Keep ${pet.name} on Solana`, ({ owner: signer, payer }) => [
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
    if (result?.outcome === "confirmed") {
      onCarried(petPda);
      onDismiss();
    }
  }

  if (connecting) {
    return (
      <WalletSheet
        why={`Connect the wallet that will keep ${pet.name}. It signs for the pet; nothing else is asked of it.`}
        onDismiss={() => setConnecting(false)}
      />
    );
  }

  return (
    <Sheet
      register="room"
      title={`Keep ${pet.name} on Solana`}
      meta={`Solana ${cluster}`}
      onDismiss={onDismiss}
      foot={(dismiss) => (
        <div className="pk-spread">
          <Button tone="ghost" size="sm" label="Not now" onClick={dismiss} />
          {owner && canSign && !ready ? (
            <Link className="pk-btn" href="/wallet">Link and fund Pawket Wallet</Link>
          ) : owner && canSign ? (
            <Button
              label="Keep on Solana"
              icon="keep"
              disabled={sender.busy || taken}
              onClick={() => void carry()}
            />
          ) : owner ? null : (
            <Button label="Connect a wallet" icon="wallet" onClick={() => setConnecting(true)} />
          )}
        </div>
      )}
    >
      <Stack gap={4}>
        <div className="pk-keep">
          <span className="pk-keep__face" aria-hidden="true">
            <PetArt {...petLook(pet, projectGuestPet(pet).mood)} still />
          </span>
          <div className="pk-keep__then">
            <span className="caption pk-faint">In {here}</span>
            <span className="title">Level {level}</span>
          </div>
          <span className="pk-keep__arrow" aria-hidden="true">→</span>
          <div className="pk-keep__then">
            <span className="caption pk-faint">On Solana, from today</span>
            <span className="title">Level 1</span>
          </div>
        </div>
        <p className="body-sm">
          A record nobody can edit or erase: every care from now on, the streak and the level, kept on Solana where
          anyone can look it up — long after {here}.{" "}
          {sponsor.data?.available ? "Pawket pays the fee." : "Keeping a new pet on Solana waits until Pawket can cover its account rent."}
          {" "}A linked, funded Pawket Wallet signs for your pet without pop-ups.
        </p>
        <p className="body-sm pk-keep__note">
          {fresh
            ? `${pet.name} is brand new, so nothing is lost: their record starts today either way.`
            : `Psst — Solana only keeps what it sees, so ${pet.name} starts there at level 1 with a fresh streak. Their name, look and personality come along; the sooner, the less there is to start over.`}
        </p>
        {owner && !canSign ? <p className="body-sm pk-muted">This wallet can only be read, not signed with. Connect one that signs.</p> : null}
        {taken ? (
          <p role="alert" className="body-sm" style={{ color: "var(--alarm-text)" }}>
            This wallet already keeps a pet named {pet.name}. Nothing changed.
          </p>
        ) : null}
      </Stack>
    </Sheet>
  );
}
