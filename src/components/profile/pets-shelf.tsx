"use client";

import { NavLink as Link } from "@/components/pk/nav-link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, ButtonLink, Card, Chip, Icon, PetFrame, Row, SectionLabel, Stack, Waiting } from "@/components/pk";
import type { CompanionState } from "@/lib/companion/use-companion";
import { SPECIES_LABEL, SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { projectGuestPet, type GuestPet } from "@/lib/guest/pet";
import { useHere } from "@/lib/native/android";

/**
 * Every pet the player keeps, on Solana first, then in this browser: each
 * one's face, level and where it lives, the way to its record, and the way
 * home. The last pocket on the shelf adopts another.
 */
export function PetsShelf({ companion, onConnect }: { companion: CompanionState; onConnect: () => void }) {
  const router = useRouter();
  const [opening, startOpening] = useTransition();
  const { here } = useHere();
  const home = companion.pet?.id;
  const onChain = new Set<string>(companion.owned.map((entry) => entry.pet.address));

  function bringHome(id: string) {
    companion.choose(id);
    startOpening(() => router.push("/home", { transitionTypes: ["nav-place"] }));
  }

  return (
    <Stack gap={4}>
      <SectionLabel count={`${companion.all.length}`}>Your pets</SectionLabel>
      {opening ? <Waiting label="Opening the room" inline /> : null}
      <div className="pk-cards">
        {companion.all.map((pet) => (
          <PetCard key={pet.id} pet={pet} onChain={onChain.has(pet.id)} home={pet.id === home} onHome={() => bringHome(pet.id)} />
        ))}
        <Link href="/adopt" className="pk-slot pk-slot--link pk-slot--pocket">
          <span className="pk-slot__plus" aria-hidden="true">
            <Icon name="plus" size={26} />
          </span>
          <span className="title">Adopt another</span>
          <span className="caption pk-faint">Three taps. They start in {here}, beside the others.</span>
        </Link>
      </div>
      {companion.owner ? null : (
        <Card variant="quiet">
          <h2 className="title">Pets on Solana</h2>
          <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
            A pet kept on Solana belongs to a wallet. Connect it, and every pet it keeps joins the shelf.
          </p>
          <div style={{ marginTop: "var(--space-4)" }}>
            <Button label="Connect a wallet" icon="wallet" tone="quiet" size="sm" onClick={onConnect} />
          </div>
        </Card>
      )}
    </Stack>
  );
}

function PetCard({ pet, onChain, home, onHome }: { pet: GuestPet; onChain: boolean; home: boolean; onHome: () => void }) {
  const { here } = useHere();
  const { level, mood } = projectGuestPet(pet);
  return (
    <Card variant="flush">
      <Link href={`/pet/${pet.id}`} className="pk-card__art" aria-label={`${pet.name}'s record`} transitionTypes={["nav-forward"]}>
        <PetFrame {...petLook(pet, mood)} sky={SPECIES_SKY[pet.species]} level={level} size="fluid" still />
      </Link>
      <div className="pk-card__body">
        <h2 className="title">{pet.name}</h2>
        <p className="caption pk-faint">
          Level {level} · {SPECIES_LABEL[pet.species]}
        </p>
        <Row gap={2} wrap style={{ marginTop: "var(--space-3)" }}>
          {home ? (
            <Chip label="At home" tone="pool" icon="home" />
          ) : (
            <Button label="Bring home" icon="home" tone="quiet" size="sm" onClick={onHome} />
          )}
          <Chip label={onChain ? "On Solana" : `In ${here}`} tone={onChain ? "pool" : "plain"} icon={onChain ? "check" : undefined} />
        </Row>
      </div>
    </Card>
  );
}

/** An empty shelf: one action, and what it does. */
export function EmptyShelf() {
  const { here } = useHere();
  return (
    <Card>
      <h2 className="title">The shelf is empty</h2>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        Adopting takes three taps. The pet starts out in {here}, and can move onto Solana when you like.
      </p>
      <div style={{ marginTop: "var(--space-4)" }}>
        <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />
      </div>
    </Card>
  );
}
