"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  Meter,
  Row,
  Stack,
} from "@/components/pk";
import { Room } from "@/components/home/room";
import { MOOD_LABEL, SPECIES_ART, SPECIES_LABEL } from "@/lib/game/appearance";
import { CareActionType } from "@/lib/game/enums";
import { applyGuestCare, cooldownsFor, projectGuestPet } from "@/lib/guest/pet";
import {
  readGuestPetSnapshot,
  saveGuestPet,
  subscribeGuestPet,
} from "@/lib/guest/storage";
import { formatCountdown } from "@/lib/utils/format";
import { useMounted } from "@/lib/utils/use-mounted";

/**
 * The one real loop in the product: a wallet-free pet, kept in this browser,
 * running the same game math the on-chain adoption uses. When a player has
 * adopted, Home shows their pet instead of the fixture — so the adopt flow
 * leads somewhere true.
 *
 * Vitals are a projection: stored stats decayed forward to now. They are
 * labelled an estimate, because that is what they are.
 */
export function GuestRoom({ fallback }: { fallback: React.ReactNode }) {
  const mounted = useMounted();
  const pet = useSyncExternalStore(subscribeGuestPet, readGuestPetSnapshot, () => null);

  // The only setInterval in Pawket: a cooldown is a display of a stored
  // timestamp, so it ticks rather than refetching anything.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [notice, setNotice] = useState<string>();

  if (!mounted || !pet) return <>{fallback}</>;

  const projected = projectGuestPet(pet, now);
  const cooldowns = cooldownsFor(pet, now);
  const form = SPECIES_ART[pet.species];

  function care(action: CareActionType) {
    const current = readGuestPetSnapshot();
    if (!current) return;
    const result = applyGuestCare(current, action, new Date());
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    saveGuestPet(result.pet);
    setNotice(undefined);
  }

  const actions: Array<{ action: CareActionType; label: string; icon: "bowl" | "ball" | "heart" | "clock"; tone?: "sprout" | "quiet" }> = [
    { action: CareActionType.Feed, label: "Feed", icon: "bowl" },
    { action: CareActionType.Play, label: "Play", icon: "ball", tone: "sprout" },
    { action: CareActionType.Groom, label: "Brush", icon: "heart", tone: "quiet" },
    { action: CareActionType.Rest, label: "Rest", icon: "clock", tone: "quiet" },
  ];

  return (
    <Stack gap={4}>
      <Room form={form} description={`You and ${pet.name} in the room, window open.`} />

      <Row gap={2} wrap>
        <Chip label={MOOD_LABEL[projected.mood]} tone="sun" icon="paw" />
        <Chip label={SPECIES_LABEL[pet.species]} />
        <Chip label={`Level ${projected.level}`} tone="sprout" icon="spark" />
      </Row>

      <Card>
        <div className="pk-spread" style={{ marginBottom: "var(--space-4)" }}>
          <span className="title">Today with {pet.name}</span>
          <span className="amount-sm pk-faint">
            {projected.xpIntoLevel} / {projected.xpForNext} XP
          </span>
        </div>
        <Stack gap={3}>
          <Vital label="Fullness" value={projected.stats.hunger} />
          <Vital label="Happiness" value={projected.stats.happiness} />
          <Vital label="Energy" value={projected.stats.energy} />
          <Vital label="Coat" value={projected.stats.hygiene} />
        </Stack>
        <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
          An estimate. Vitals drift while you are away, and there is no death — only a pet that
          misses you.
        </p>

        <Row gap={2} wrap style={{ marginTop: "var(--space-4)" }}>
          {actions.map(({ action, label, icon, tone }) => {
            const left = cooldowns[action];
            return (
              <Button
                key={action}
                label={label}
                meta={left > 0 ? formatCountdown(left) : undefined}
                icon={icon}
                size="sm"
                tone={tone}
                disabled={left > 0}
                onClick={() => care(action)}
              />
            );
          })}
        </Row>
        {notice ? (
          <p className="body-sm" style={{ color: "var(--alarm-text)", marginTop: "var(--space-3)" }}>
            {notice}
          </p>
        ) : null}
      </Card>

      <Card variant="quiet">
        <div className="pk-spread">
          <span className="title">{pet.name} is a guest pet</span>
          <ButtonLink label="Adopt another" href="/adopt" tone="ghost" size="sm" after="right" />
        </div>
        <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
          Saved in this browser, and nowhere else. Nothing about {pet.name} is recorded on-chain,
          and nothing needs to be.
        </p>
      </Card>
    </Stack>
  );
}

/** Five segments and the raw count beside them — never a percentage. */
function Vital({ label, value }: { label: string; value: number }) {
  return (
    <Meter
      label={label}
      value={Math.round(value / 20)}
      max={5}
      readout={`${value} / 100`}
      tone={value < 25 ? "sun" : "sprout"}
    />
  );
}
