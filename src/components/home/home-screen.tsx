"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
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
import { EmoteRow } from "@/components/home/emote-row";
import { LookCard } from "@/components/home/look-card";
import { Room, useRoomMode, type RoomState } from "@/components/home/room";
import type { DirectorStatus } from "@/components/room3d/director";
import { findWearable } from "@/lib/closet/catalog";
import {
  CARE_ACTION_LABEL,
  CARE_DONE_LABEL,
  MOOD_LABEL,
  PERSONALITY_LABEL,
  SPECIES_ART,
  SPECIES_LABEL,
  SPECIES_SKY,
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
import { describeLook } from "@/lib/player/look";
import { usePlayerLook } from "@/lib/player/use-player-look";
import { CARE_MOMENT, type RoomCue } from "@/lib/room/moments";
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
  const look = usePlayerLook();
  const [now, setNow] = useState(() => new Date());
  const [notice, setNotice] = useState<{ tone: "ok" | "stop"; text: string }>();
  const [confirming, setConfirming] = useState(false);
  const [cue, setCue] = useState<RoomCue | null>(null);
  const [status, setStatus] = useState<DirectorStatus>({ moment: null, sentence: "" });
  const [roomState, setRoomState] = useState<RoomState>("loading");
  const [mode, setMode] = useRoomMode();
  const wide = useWide();
  const onStatus = useCallback((next: DirectorStatus) => setStatus(next), []);
  const lookShown = roomState === "live" || roomState === "loading";
  const ask = (moment: string) => setCue({ moment, nonce: Date.now() });

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
          first={
            <>
              <Room
                pet={null}
                look={look}
                sky="warm"
                cue={cue}
                description={`${describeLook(look)}, in an empty room with the window open.`}
                onState={setRoomState}
              />
              <RoomMode mode={mode} state={roomState} onMode={setMode} />
              {wide ? null : <LookCard look={look} shown={lookShown} />}
            </>
          }
          second={
            <>
              <Card>
                <h2 className="title">The window is open</h2>
                <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
                  Nobody lives here yet. Adopting takes three taps, and the pet stays in this browser.
                </p>
                <div style={{ marginTop: "var(--space-4)" }}>
                  <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />
                </div>
              </Card>
              {wide ? <LookCard look={look} shown={lookShown} /> : null}
            </>
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
    // Only now, with the care saved, does the room show it.
    ask(CARE_MOMENT[action]);
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
              pet={{
                species: pet.species,
                form: SPECIES_ART[pet.species],
                name: pet.name,
                wearing: pet.wearing,
                mood: projected.mood,
              }}
              look={look}
              sky={SPECIES_SKY[pet.species]}
              cue={cue}
              description={`${describeLook(look)}, and ${pet.name} the ${SPECIES_LABEL[pet.species].toLowerCase()}${worn ? ` in the ${worn.name.toLowerCase()}` : ""}, in the room with the window open.`}
              onStatus={onStatus}
              onState={setRoomState}
            />
            <div className="pk-spread">
              <Row gap={2} wrap>
                <Chip label={MOOD_LABEL[projected.mood]} icon="paw" />
                <Chip label={SPECIES_LABEL[pet.species]} />
                {worn ? <Chip label={worn.name} icon={worn.icon} /> : null}
              </Row>
              <RoomMode mode={mode} state={roomState} onMode={setMode} />
            </div>
            {/* Stacked, the look sits right under the room so it stays in view. */}
            {wide ? null : <LookCard look={look} shown={lookShown} />}
            {lookShown ? (
              <EmoteRow petName={pet.name} playing={status.moment} sentence={status.sentence} onEmote={ask} />
            ) : null}
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
            {wide ? <LookCard look={look} shown={lookShown} /> : null}
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

/** The player's choice between the 3D room and the flat one, on this device. */
function RoomMode({
  mode,
  state,
  onMode,
}: {
  mode: "3d" | "flat";
  state: RoomState;
  onMode: (mode: "3d" | "flat") => void;
}) {
  if (state === "unsupported" || state === "failed") return null;
  return (
    <Button
      label={mode === "3d" ? "Flat room" : "3D room"}
      tone="ghost"
      size="sm"
      onClick={() => onMode(mode === "3d" ? "flat" : "3d")}
    />
  );
}

/** Side by side (the Columns breakpoint), the room stays pinned beside the second column. */
function useWide(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const media = window.matchMedia("(min-width: 1024px)");
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}
