"use client";

import { useEffect, useState } from "react";
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  Columns,
  Meter,
  Row,
  Screen,
  ScreenBar,
  Stack,
} from "@/components/pk";
import { Room } from "@/components/home/room";
import { findWearable } from "@/lib/closet/catalog";
import {
  CARE_ACTION_LABEL,
  CARE_DONE_LABEL,
  MOOD_LABEL,
  PERSONALITY_LABEL,
  SPECIES_ART,
  SPECIES_LABEL,
} from "@/lib/game/appearance";
import { CareActionType } from "@/lib/game/enums";
import {
  applyGuestCare,
  cooldownsFor,
  projectGuestPet,
  streakAsOf,
  utcDay,
  type GuestPet,
} from "@/lib/guest/pet";
import { useGuestPet } from "@/lib/guest/use-guest-pet";
import { clearGuestPet, readGuestPetSnapshot, saveGuestPet } from "@/lib/guest/storage";
import { formatCountdown } from "@/lib/utils/format";

const ACTIONS: Array<{
  action: CareActionType;
  icon: "bowl" | "ball" | "heart" | "clock";
  tone?: "sprout" | "quiet";
}> = [
  { action: CareActionType.Feed, icon: "bowl" },
  { action: CareActionType.Play, icon: "ball", tone: "sprout" },
  { action: CareActionType.Groom, icon: "heart", tone: "quiet" },
  { action: CareActionType.Rest, icon: "clock", tone: "quiet" },
];

/**
 * The room you actually live in. With a pet, the care loop is the guest
 * record. Without one, the room is empty — it does not borrow a fixture.
 */
export function HomeScreen() {
  const { ready, pet } = useGuestPet();
  const [now, setNow] = useState(() => new Date());
  const [notice, setNotice] = useState<{ tone: "ok" | "stop"; text: string }>();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!ready) {
    return (
      <Screen>
        <ScreenBar>
          <h1 className="display-s">Your room</h1>
        </ScreenBar>
        <p className="body-sm pk-faint">Opening the room.</p>
      </Screen>
    );
  }

  if (!pet) {
    return (
      <Screen>
        <ScreenBar>
          <div>
            <h1 className="display-s">Your room</h1>
            <p className="caption pk-faint">Window open</p>
          </div>
        </ScreenBar>
        <Columns
          pin
          first={<Room occupied={false} description="You, in an empty room, the window open." />}
          second={
            <Card>
              <h2 className="title">The window is open</h2>
              <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
                Nobody lives here yet. Adopting takes three taps, and the pet stays in this browser.
              </p>
              <div style={{ marginTop: "var(--space-4)" }}>
                <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />
              </div>
            </Card>
          }
        />
      </Screen>
    );
  }

  const projected = projectGuestPet(pet, now);
  const cooldowns = cooldownsFor(pet, now);
  const streak = streakAsOf(pet.streak, now);
  const worn = findWearable(pet.wearing);

  function care(action: CareActionType) {
    const current = readGuestPetSnapshot();
    if (!current) return;
    const result = applyGuestCare(current, action, new Date());
    if (!result.ok) {
      setNotice({ tone: "stop", text: result.message });
      return;
    }
    if (!saveGuestPet(result.pet)) {
      setNotice({
        tone: "stop",
        text: "This browser did not store that. The action did not stick.",
      });
      return;
    }
    const day = result.pet.streak.lastDay === utcDay(new Date()) ? ` Day ${result.pet.streak.count}.` : "";
    setNotice({
      tone: "ok",
      text: `${CARE_DONE_LABEL[action]}. +${result.xpGained} XP.${day}`,
    });
  }

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-s">{pet.name}&apos;s room</h1>
          <p className="caption pk-faint">
            {PERSONALITY_LABEL[pet.personality]} · {SPECIES_LABEL[pet.species]}
          </p>
        </div>
        <Chip label={`Level ${projected.level}`} tone="sprout" icon="spark" />
      </ScreenBar>

      <Columns
        pin
        first={
          <>
            <Room
              form={SPECIES_ART[pet.species]}
              description={`You and ${pet.name} in the room, window open.`}
            />
            <Row gap={2} wrap>
              <Chip label={MOOD_LABEL[projected.mood]} icon="paw" />
              <Chip label={SPECIES_LABEL[pet.species]} />
              {worn ? <Chip label={worn.name} icon={worn.icon} /> : null}
            </Row>
          </>
        }
        second={
          <>
            <CareCard
              pet={pet}
              xpIntoLevel={projected.xpIntoLevel}
              xpForNext={projected.xpForNext}
              stats={projected.stats}
              cooldowns={cooldowns}
              streakCount={streak.count}
              activeToday={streak.activeToday}
              notice={notice}
              onCare={care}
            />
            <Card variant="quiet">
              <div className="pk-spread">
                <h2 className="title">{pet.name} lives in this browser</h2>
                <ButtonLink label="Their record" href={`/pet/${pet.id}`} tone="ghost" size="sm" after="right" />
              </div>
              <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
                Saved here, and nowhere else. Vitals above are an estimate of time away. There is no
                death — only a pet that misses you.
              </p>
              <div style={{ marginTop: "var(--space-4)" }}>
                {confirming ? (
                  <Stack gap={3}>
                    <p className="body-sm">
                      Remove {pet.name} from this browser? Their care, streak and clothes go too.
                      This cannot be undone.
                    </p>
                    <Row gap={2} wrap>
                      <Button
                        tone="alarm"
                        size="sm"
                        label={`Remove ${pet.name}`}
                        onClick={() => clearGuestPet()}
                      />
                      <Button tone="quiet" size="sm" label="Keep them" onClick={() => setConfirming(false)} />
                    </Row>
                  </Stack>
                ) : (
                  <Button tone="ghost" size="sm" label="Start over" onClick={() => setConfirming(true)} />
                )}
              </div>
            </Card>
          </>
        }
      />
    </Screen>
  );
}

function CareCard({
  pet,
  xpIntoLevel,
  xpForNext,
  stats,
  cooldowns,
  streakCount,
  activeToday,
  notice,
  onCare,
}: {
  pet: GuestPet;
  xpIntoLevel: number;
  xpForNext: number;
  stats: GuestPet["stats"];
  cooldowns: Record<CareActionType, number>;
  streakCount: number;
  activeToday: boolean;
  notice?: { tone: "ok" | "stop"; text: string };
  onCare: (action: CareActionType) => void;
}) {
  const streakReadout = streakCount === 0 ? "0 days" : `${streakCount} ${streakCount === 1 ? "day" : "days"}`;
  return (
    <Card>
      <div className="pk-spread" style={{ marginBottom: "var(--space-4)" }}>
        <h2 className="title">Today with {pet.name}</h2>
        <span className="amount-sm pk-faint">
          {xpIntoLevel} / {xpForNext} XP
        </span>
      </div>
      <Stack gap={3}>
        <Vital label="Fullness" value={stats.hunger} />
        <Vital label="Happiness" value={stats.happiness} />
        <Vital label="Energy" value={stats.energy} />
        <Vital label="Coat" value={stats.hygiene} />
        <Meter
          label="Days in a row"
          value={Math.min(streakCount, 7)}
          max={7}
          readout={activeToday ? streakReadout : streakCount === 0 ? "Show up today" : `${streakReadout} if you show up`}
        />
      </Stack>
      <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
        An estimate. Each action is +10 XP, then that action rests for 30 minutes.
      </p>
      <Row gap={2} wrap style={{ marginTop: "var(--space-4)" }}>
        {ACTIONS.map(({ action, icon, tone }) => {
          const left = cooldowns[action];
          return (
            <Button
              key={action}
              label={CARE_ACTION_LABEL[action]}
              meta={left > 0 ? formatCountdown(left) : undefined}
              icon={icon}
              size="sm"
              tone={tone}
              disabled={left > 0}
              onClick={() => onCare(action)}
            />
          );
        })}
      </Row>
      <p
        role="status"
        className="body-sm"
        style={{
          color: notice?.tone === "stop" ? "var(--alarm-text)" : "var(--sprout-text)",
          marginTop: notice ? "var(--space-3)" : 0,
        }}
      >
        {notice?.text}
      </p>
    </Card>
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
