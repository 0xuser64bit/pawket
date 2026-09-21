import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BackLink,
  ButtonLink,
  Card,
  Chip,
  Meter,
  PetFrame,
  Row,
  Screen,
  Stack,
} from "@/components/pk";
import { PreviewNote } from "@/components/preview-note";
import { findDemoPet } from "@/lib/demo";
import { SPECIES_ART, SPECIES_LABEL } from "@/lib/game/appearance";
import { RARITY_LABEL } from "@/components/pk";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: findDemoPet(id)?.name ?? "Pet" };
}

/**
 * The pet, then her numbers, then what she is wearing. The ledger is a
 * separate room — two taps away, never layered over her.
 */
export default async function PetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pet = findDemoPet(id);
  if (!pet) notFound();

  return (
    <Screen>
      <BackLink label="Inventory" href="/inventory" />

      <Stack gap={4}>
        <div style={{ display: "grid", placeItems: "center", paddingTop: "var(--space-1)" }}>
          <PetFrame
            form={SPECIES_ART[pet.species]}
            rarity={pet.rarity}
            sky={pet.sky}
            size="lg"
            level={pet.level}
            mood={pet.mood}
          />
        </div>

        <div className="pk-spread">
          <div>
            <h1 className="display-l">{pet.name}</h1>
            <p className="body-sm pk-muted">
              {SPECIES_LABEL[pet.species]} · adopted {pet.adopted} · {RARITY_LABEL[pet.rarity]}
            </p>
          </div>
          <ButtonLink label="Dress" href="/inventory?tab=cosmetics" icon="spark" size="sm" />
        </div>

        <Row gap={2} wrap>
          {pet.traits.map((trait) => (
            <Chip key={trait} label={trait} />
          ))}
        </Row>

        {/* Progress you can count: three meters, three readouts. */}
        <Card>
          <Stack gap={3}>
            <Meter
              label={`Level ${pet.level}`}
              value={pet.level}
              max={10}
              readout={`${pet.xpIntoLevel} / ${pet.xpForNext} XP`}
            />
            <Meter
              label="Care streak"
              value={pet.careStreakDays}
              max={pet.streakGoal}
              readout={`${pet.careStreakDays} days`}
            />
            <Meter
              label="Games played"
              value={pet.gamesThisWeek}
              max={pet.gamesGoal}
              tone="pool"
              readout={`${pet.gamesTotal} total`}
            />
          </Stack>
        </Card>

        <Card variant="quiet">
          <div className="pk-spread">
            <span className="title">Wearing</span>
            <span className="caption pk-faint">
              {pet.wearing.length} of {pet.slots} slots
            </span>
          </div>
          <Row gap={2} wrap style={{ marginTop: "var(--space-3)" }}>
            {pet.wearing.length ? (
              pet.wearing.map((worn) => <Chip key={worn.name} label={worn.name} tone={worn.tone} />)
            ) : (
              <p className="body-sm pk-muted">
                Nothing yet. Anything you own can be worn by any pet you own.
              </p>
            )}
          </Row>
        </Card>

        <ButtonLink label="Ownership" href={`/pet/${pet.id}/ownership`} tone="quiet" full after="right" />

        <PreviewNote what={`${pet.name}, her levels and her streak are fixtures.`} />
      </Stack>
    </Screen>
  );
}
