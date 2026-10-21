"use client";

import { useState } from "react";
import type { Address } from "@solana/kit";
import { Button, ButtonLink, PetArt, Sheet, Stack, Problem } from "@/components/pk";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { getPublicEnv } from "@/config/env";
import { petLook } from "@/lib/game/appearance";
import { calculateLevelFromXp } from "@/lib/game/math";
import { projectGuestPet, type GuestPet } from "@/lib/guest/pet";
import { fetchPetOnChain } from "@/lib/solana/accounts";
import { rpc } from "@/lib/solana/browser-client";
import { getAdoptPetInstruction } from "@/lib/solana/instructions";
import { derivePassportPda, derivePetPda } from "@/lib/solana/pda";
import { needsSol, useSponsor, type PawketSender } from "@/lib/solana/use-send";
import { useHere } from "@/lib/native/android";
import { useLinkBrowser } from "@/lib/wallet/link";
import { record } from "@/lib/analytics/events";

const LATELY_MS = 6 * 60 * 60 * 1000;

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
  sender: PawketSender;
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
  const sponsored = Boolean(sponsor.data?.available);
  const linked = Boolean(sender.pawketWallet?.linked);
  const ready = linked && !needsSol(sender.pawketWallet?.balance ?? 0n, sponsored);
  const linking = useLinkBrowser();
  const linkHere = sponsored && !linked;

  const isThisKeep = (found: NonNullable<Awaited<ReturnType<typeof fetchPetOnChain>>>) =>
    found.pet.species === pet.species &&
    found.pet.personality === pet.personality &&
    found.pet.birthTimestamp * 1000 >= Date.parse(pet.createdAt) &&
    Date.now() - found.pet.birthTimestamp * 1000 < LATELY_MS;

  function carried(address: Awaited<ReturnType<typeof derivePetPda>>["address"]) {
    record({ name: "keep_confirmed" });
    onCarried(address);
    onDismiss();
  }

  async function carry() {
    if (!owner) return;
    record({ name: "keep_started" });
    const petPda = (await derivePetPda(owner, pet.name)).address;
    const existing = await fetchPetOnChain(rpc, petPda).catch(() => null);
    if (existing) {
      if (isThisKeep(existing)) return carried(petPda);
      record({ name: "keep_blocked", reason: "name-taken" });
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
    if (result?.outcome === "confirmed") return carried(petPda);
    if (result?.outcome === "unknown") {
      for (let tries = 0; tries < 6; tries++) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        const found = await fetchPetOnChain(rpc, petPda).catch(() => null);
        if (found && isThisKeep(found)) return carried(petPda);
      }
    }
  }

  async function linkThenCarry() {
    const result = await linking.link({ deposit: 0n });
    if (result?.outcome === "confirmed") await carry();
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
            linkHere ? (
              <Button
                label={`Link ${here}, then keep`}
                icon="bolt"
                disabled={linking.busy || sender.busy || taken}
                onClick={() => void linkThenCarry()}
              />
            ) : (
              <ButtonLink label="Set up Pawket Wallet" icon="wallet" href="/wallet" onClick={() => record({ name: "keep_blocked", reason: "needs-wallet" })} />
            )
          ) : owner && canSign ? (
            <Button
              label="Keep on Solana"
              icon="keep"
              disabled={sender.busy || taken}
              onClick={() => void carry()}
            />
          ) : owner ? null : (
            <Button
              label="Connect a wallet"
              icon="wallet"
              onClick={() => {
                record({ name: "keep_blocked", reason: "no-wallet" });
                setConnecting(true);
              }}
            />
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
          {" "}A browser linked to your Pawket Wallet signs for your pet without pop-ups.
        </p>
        <p className="body-sm pk-keep__note">
          {fresh
            ? `${pet.name} is brand new, so nothing is lost: their record starts today either way.`
            : `Psst — Solana only keeps what it sees, so ${pet.name} starts there at level 1 with a fresh streak. Their name, look and personality come along; the sooner, the less there is to start over.`}
        </p>
        {owner && canSign && linkHere ? (
          <p className="body-sm pk-muted">
            Your wallet approves once, to link {here} to your Pawket Wallet. Pawket pays the fees and the rent, and {here}{" "}
            keeps {pet.name} on Solana straight after, with no second pop-up.
          </p>
        ) : null}
        {linking.problem ? (
          <Problem>
            {linking.problem}
          </Problem>
        ) : null}
        {owner && !canSign ? <p className="body-sm pk-muted">This wallet can only be read, not signed with. Connect one that signs.</p> : null}
        {taken ? (
          <Problem>
            This wallet already keeps a pet named {pet.name}. Nothing changed.
          </Problem>
        ) : null}
      </Stack>
    </Sheet>
  );
}
