"use client";

import {
  BackLink,
  ButtonLink,
  Card,
  Chip,
  Columns,
  EmptyState,
  Meter,
  PetFrame,
  Row,
  Screen,
  Stack,
} from "@/components/pk";
import { findWearable } from "@/lib/closet/catalog";
import {
  CARE_DONE_LABEL,
  MOOD_LABEL,
  PERSONALITY_LABEL,
  SPECIES_LABEL,
  SPECIES_SKY,
  petLook,
} from "@/lib/game/appearance";
import { projectGuestPet, streakAsOf } from "@/lib/guest/pet";
import { useGuestPet } from "@/lib/guest/use-guest-pet";
import { formatUtcDate } from "@/lib/utils/format";

/**
 * The record of the one pet in this browser. A link to any other id is a
 * miss, not a second pet.
 */
export function PetScreen({ id }: { id: string }) {
  const { ready, pet } = useGuestPet();

  if (!ready) {
    return (
      <Screen>
        <BackLink label="Inventory" href="/inventory" />
        <p className="body-sm pk-faint">Opening their record.</p>
      </Screen>
    );
  }

  if (!pet || pet.id !== id) {
    return (
      <Screen width="narrow">
        <BackLink label="Inventory" href="/inventory" />
        <EmptyState
          icon="paw"
          title={pet ? "That is not the pet in this browser" : "No pet in this browser"}
          body={
            pet
              ? `${pet.name} is the companion saved here. Pawket keeps one.`
              : "Adopting takes three taps, and the pet stays in this browser."
          }
          action={
            pet ? (
              <ButtonLink label={`Open ${pet.name}`} href={`/pet/${pet.id}`} icon="paw" />
            ) : (
              <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />
            )
          }
        />
      </Screen>
    );
  }

  const projected = projectGuestPet(pet);
  const streak = streakAsOf(pet.streak, new Date());
  const worn = findWearable(pet.wearing);
  const history = [...pet.careLog].reverse();
  const streakReadout =
    streak.count === 0 ? "0 days" : `${streak.count} ${streak.count === 1 ? "day" : "days"}`;

  return (
    <Screen>
      <BackLink label="Inventory" href="/inventory" />

      <Columns
        split="portrait"
        pin
        first={
          <div className="pk-portrait">
            <PetFrame
              {...petLook(pet, projected.mood)}
              sky={SPECIES_SKY[pet.species]}
              size="lg"
              level={projected.level}
              mood={MOOD_LABEL[projected.mood]}
            />
          </div>
        }
        second={
          <>
            <div className="pk-spread">
              <div>
                <h1 className="display-l" style={{ overflowWrap: "anywhere" }}>
                  {pet.name}
                </h1>
                <p className="body-sm pk-muted">
                  {SPECIES_LABEL[pet.species]} · {PERSONALITY_LABEL[pet.personality]} · adopted{" "}
                  {formatUtcDate(pet.createdAt)}
                </p>
              </div>
              <ButtonLink label="Dress" href="/inventory?tab=wardrobe" icon="spark" size="sm" tone="quiet" />
            </div>

            <Row gap={2} wrap>
              <Chip label="Cloth" />
              <Chip label={PERSONALITY_LABEL[pet.personality]} />
              {worn ? <Chip label={worn.name} icon={worn.icon} /> : null}
            </Row>

            <Card>
              <Stack gap={3}>
                <Meter
                  label={`Level ${projected.level}`}
                  value={Math.round(projected.xpIntoLevel / 10)}
                  max={10}
                  readout={`${projected.xpIntoLevel} / ${projected.xpForNext} XP`}
                />
                <Meter
                  label="Days in a row"
                  value={Math.min(streak.count, 7)}
                  max={7}
                  readout={
                    streak.activeToday
                      ? streakReadout
                      : streak.count === 0
                        ? "Show up today"
                        : `${streakReadout} if you show up`
                  }
                />
              </Stack>
              <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
                {pet.plays} {pet.plays === 1 ? "round" : "rounds"} finished. Vitals on the home
                screen are an estimate. This record is what was saved.
              </p>
            </Card>

            <Card variant="quiet">
              <div className="pk-spread">
                <h2 className="title">Wearing</h2>
                <span className="caption pk-faint">{worn ? "1 of 1" : "0 of 1"}</span>
              </div>
              <p className="body-sm pk-muted" style={{ marginTop: "var(--space-3)" }}>
                {worn
                  ? `${worn.name}. It changes how they look in words, and nothing else.`
                  : "Nothing yet. Anything in the wardrobe can be worn, and none of it changes a vital."}
              </p>
            </Card>

            <Card>
              <h2 className="title">Care</h2>
              {history.length === 0 ? (
                <p className="body-sm pk-muted" style={{ marginTop: "var(--space-3)" }}>
                  No care yet. The first feed, game, brush or rest is written here.
                </p>
              ) : (
                <ul className="pk-log">
                  {history.map((entry) => (
                    <li key={`${entry.at}-${entry.action}`}>
                      <span>{CARE_DONE_LABEL[entry.action]}</span>
                      <span className="caption pk-faint">
                        {formatUtcDate(entry.at)} · +{entry.xpGained} XP
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <ButtonLink label="Back to the room" href="/home" tone="quiet" full icon="home" />
          </>
        }
      />
    </Screen>
  );
}
