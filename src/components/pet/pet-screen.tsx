"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BackLink,
  Button,
  ButtonLink,
  Card,
  Columns,
  EmptyState,
  Meter,
  PetFrame,
  Screen,
  Stack,
  Waiting,
  showToast,
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
import { projectGuestPet, streakAsOf, type GuestPet } from "@/lib/guest/pet";
import { removePet } from "@/lib/guest/storage";
import { usePets } from "@/lib/guest/use-pets";
import { formatUtcDate } from "@/lib/utils/format";
import { StickerStrip } from "./sticker-strip";
import { useHere } from "@/lib/native/android";

/**
 * The record of a pet kept in this browser. An id this browser does not
 * keep is a plain miss: the pet may live in another browser.
 */
export function PetScreen({ id }: { id: string }) {
  const { ready, pets } = usePets();
  const { here } = useHere();
  const pet = pets.find((p) => p.id === id) ?? null;

  if (!ready) {
    return (
      <Screen>
        <BackLink label="Profile" href="/profile#shelf" />
        <Waiting label="Opening their record" />
      </Screen>
    );
  }

  if (!pet) {
    return (
      <Screen width="narrow">
        <BackLink label="Profile" href="/profile#shelf" />
        <EmptyState
          icon="paw"
          title={pets.length ? `That pet is not in ${here}` : `No pet in ${here}`}
          body={
            pets.length
              ? "A pet in another browser stays there. Yours here are on the shelf."
              : `Adopting takes three taps, and the pet stays in ${here}.`
          }
          action={
            pets.length ? (
              <ButtonLink label="Your pets" href="/profile#shelf" icon="pocket" />
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
      <BackLink label="Profile" href="/profile#shelf" />

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
              <ButtonLink label="Dress" href="/profile?tab=wardrobe#shelf" icon="spark" size="sm" tone="quiet" />
            </div>

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

            <StickerStrip name={pet.name} record={pet} context={{ onChain: false }} />

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
            <LetGo pet={pet} others={pets.length - 1} />
          </>
        }
      />
    </Screen>
  );
}

/**
 * Letting a pet go from this browser: last on its record, behind a second
 * press that says what goes with it — never one tap away on the daily room.
 */
function LetGo({ pet, others }: { pet: GuestPet; others: number }) {
  const { here } = useHere();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  return (
    <section className="pk-letgo" aria-label={`Let ${pet.name} go`}>
      {confirming ? (
        <Card variant="quiet">
          <p className="body-sm">
            Let {pet.name} go from {here}? Their care, streak and clothes go too. This cannot be undone.
            {others > 0 ? " Your other pets stay." : ""}
          </p>
          <div className="pk-spread" style={{ marginTop: "var(--space-3)" }}>
            <Button tone="quiet" size="sm" label="Keep them" onClick={() => setConfirming(false)} />
            <Button
              tone="alarm"
              size="sm"
              label="Let them go"
              onClick={() => {
                if (!removePet(pet.id)) {
                  showToast({ id: `let-go-${pet.id}`, tone: "risk", title: "Could not save that change", body: "Pawket could not remove the pet. Try again when storage is available." });
                  return;
                }
                router.replace(others > 0 ? "/profile#shelf" : "/home");
              }}
            />
          </div>
        </Card>
      ) : (
        <Button tone="ghost" size="sm" label={`Let ${pet.name} go`} className="pk-btn--flush" onClick={() => setConfirming(true)} />
      )}
    </section>
  );
}
