"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Address } from "@solana/kit";
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  Chip,
  Icon,
  Meter,
  Row,
  Screen,
  ScreenBar,
  Stack,
  Waiting,
} from "@/components/pk";
import { KeepSheet } from "@/components/home/keep-sheet";
import { dismissToast, showToast } from "@/components/pk/toast";
import { RemindMe } from "@/components/home/remind-me";
import { CARE_ICON, Deck, type Gain, type Panel } from "@/components/home/deck";
import { EmoteRow } from "@/components/home/emote-row";
import { PhotoDialog } from "@/components/home/photo";
import { PetSwitcher } from "@/components/home/pet-switcher";
import { Room, preloadRoom3D, useRoomMode, type RoomState } from "@/components/home/room";
import type { DirectorStatus } from "@/components/room3d/director";
import type { RoomView } from "@/components/room3d/room-3d";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { WEARABLES, findWearable } from "@/lib/closet/catalog";
import { newlyEarned, type BadgeContext } from "@/lib/game/badges";
import { useCompanion } from "@/lib/companion/use-companion";
import {
  CARE_ACTION_LABEL,
  CARE_DONE_LABEL,
  MOOD_SENTENCE,
  PERSONALITY_LABEL,
  SPECIES_LABEL,
  SPECIES_SKY,
  petLook,
  suggestCare,
} from "@/lib/game/appearance";
import { CareActionType, type PetMood } from "@/lib/game/enums";
import { calculateLevelFromXp } from "@/lib/game/math";
import {
  applyGuestCare,
  cooldownsFor,
  projectGuestPet,
  streakAsOf,
  todayFor,
  utcDay,
  type GuestPet,
  type TodayGoals,
} from "@/lib/guest/pet";
import { readPet, removePet, savePet } from "@/lib/guest/storage";
import { haptic, useHere } from "@/lib/native/android";
import { describeLook } from "@/lib/player/look";
import { usePlayerProfile } from "@/lib/player/profile";
import { usePlayerLook } from "@/lib/player/use-player-look";
import { CARE_MOMENT, type RoomCue } from "@/lib/room/moments";
import { getCareInstruction } from "@/lib/solana/instructions";
import { usePawketSend } from "@/lib/solana/use-send";

/**
 * The room you actually live in, and the whole width of the screen: you and
 * the pet at home. Beneath it sits the deck — how the pet is, the four
 * cares and three tools — and a tool opens its panel below the deck, so the
 * room stays the largest thing on the screen. The pet is the one the player
 * chose, from any they keep; a care in this browser is saved at once, and a
 * care on Solana is signed, sent and confirmed first. The room shows a care
 * only once it is kept.
 */
export function HomeScreen() {
  const companion = useCompanion();
  const { here, Here } = useHere();
  const { ready, pet, active } = companion;
  const look = usePlayerLook();
  const profile = usePlayerProfile();
  const sender = usePawketSend();
  const [now, setNow] = useState(() => new Date());
  const [connecting, setConnecting] = useState(false);
  /** The browser pet whose "keep it on Solana" sheet is open. */
  const [keeping, setKeeping] = useState<GuestPet | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [gain, setGain] = useState<Gain | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const roomView = useRef<RoomView>(null);
  const closePhoto = useCallback(() => setShot(null), []);
  /** A browser pet on its way onto Solana: its id here, and its address there. */
  const carried = useRef<{ id: string; address: Address } | null>(null);
  const [cue, setCue] = useState<RoomCue | null>(null);
  const [status, setStatus] = useState<DirectorStatus>({ moment: null, sentence: "" });
  const [roomState, setRoomState] = useState<RoomState>("loading");
  const [mode, setMode] = useRoomMode();
  const onStatus = useCallback((next: DirectorStatus) => setStatus(next), []);
  const lookShown = roomState === "live" || roomState === "loading";
  const ask = (moment: string) => setCue({ moment, nonce: Date.now() });
  const earned = (action: CareActionType, xp: number) => setGain({ action, xp, at: Date.now() });

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // A tool's panel opens under the deck; on a phone that is below the fold,
  // so it comes up to meet the tap rather than opening out of sight.
  useEffect(() => {
    if (!panel) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("pk-deck-panel")?.scrollIntoView({ block: "nearest", behavior: reduce ? "instant" : "smooth" });
  }, [panel]);

  // A pet carried onto Solana leaves this browser once the chain copy is the one drawn.
  useEffect(() => {
    if (carried.current && active?.pet.address === carried.current.address) {
      removePet(carried.current.id);
      carried.current = null;
    }
  }, [active]);

  if (!ready) {
    return (
      <Screen>
        <ScreenBar>
          <h1 className="display-s">Your room</h1>
        </ScreenBar>
        <Waiting label="Opening the room" />
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
        <Stack gap={4}>
          <Room
            pet={null}
            look={look}
            sky="warm"
            cue={cue}
            description={`${describeLook(look)}, in an empty room with the window open.`}
            onState={setRoomState}
            stage
          />
          <RoomLine sentence="" mode={mode} state={roomState} onMode={setMode} />
          <Card>
            <h2 className="title">The window is open</h2>
            <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
              Nobody lives here yet. Adopting takes three taps, and the pet starts out in {here}.
              {companion.owner ? "" : " Already keep a pet on Solana? Connect the wallet that keeps it, and it comes home here."}
            </p>
            <div className="pk-foot pk-acts">
              <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />
              {companion.owner ? null : (
                <Button label="Connect a wallet" icon="wallet" tone="quiet" onClick={() => setConnecting(true)} />
              )}
              <ButtonLink label="Change your look" href="/profile#look" tone="ghost" size="sm" className="pk-btn--flush" />
            </div>
          </Card>
          <ChainTrouble error={companion.chainError} onRetry={companion.refresh} />
        </Stack>
        {connecting ? (
          <WalletSheet
            why="Connect the wallet that keeps your pet. Pawket reads its pets from Solana; nothing is signed by connecting."
            onDismiss={() => setConnecting(false)}
          />
        ) : null}
      </Screen>
    );
  }

  const onChain = active !== null;
  function setNotice(next?: { tone: "ok" | "stop"; text: string }) {
    const id = `care-${pet!.id}`;
    if (!next) return dismissToast(id);
    showToast({
      id,
      tone: next.tone === "stop" ? "risk" : "done",
      title: next.tone === "stop" ? "Care not saved" : `${pet!.name}'s care ${onChain ? "recorded" : "saved"}`,
      body: next.text,
      ttl: next.tone === "stop" ? undefined : 10_000,
    });
  }
  const projected = projectGuestPet(pet, now);
  const cooldowns = cooldownsFor(pet, now);
  const streak = streakAsOf(pet.streak, now);
  const today = todayFor(pet, now);
  const worn = findWearable(pet.wearing);
  // The care the pet most wants wears sun; the rest wait their turn.
  const wanted = sender.busy ? null : suggestCare(projected.stats, cooldowns);

  function care(action: CareActionType) {
    if (active) {
      void careOnChain(action);
      return;
    }
    const current = readPet(pet!.id);
    if (!current) return;
    const result = applyGuestCare(current, action, new Date());
    if (!result.ok) {
      setNotice({ tone: "stop", text: result.message });
      haptic("refuse");
      return;
    }
    if (!savePet(result.pet)) {
      setNotice({
        tone: "stop",
        text: `${Here} did not store that. The action did not stick.`,
      });
      return;
    }
    const day = result.pet.streak.lastDay === utcDay(new Date()) ? ` Day ${result.pet.streak.count}.` : "";
    const level = levelUp(current.xp, result.pet.xp);
    // A level in this browser is a level Solana has not seen: worth a word, once, at the moment it counts.
    if (level) {
      showToast({
        id: `keep-${current.id}`,
        tone: "note",
        title: `${current.name} is level ${level}!`,
        ttl: 14_000,
        body: (
          <>
            Levels here live in {here}. Kept on Solana, {current.name} would start over at level 1 — the sooner,
            the less to redo.{" "}
            <button type="button" className="pk-linkish" onClick={() => setKeeping(readPet(current.id) ?? current)}>
              Keep {current.name} on Solana
            </button>
          </>
        ),
      });
    }
    setNotice({
      tone: "ok",
      text: `${CARE_DONE_LABEL[action]}. +${result.xpGained} XP.${day}${level ? ` ${current.name} is level ${level} now.` : ""}${earnedLine(current, result.pet)}`,
    });
    // Only now, with the care saved, does the room show it — and a new
    // level is the one thing worth a cheer.
    earned(action, result.xpGained);
    ask(level ? "cheer" : CARE_MOMENT[action]);
    haptic(level ? "cheer" : "done");
  }

  async function careOnChain(action: CareActionType) {
    if (!active || !pet) return;
    // The same rule the program enforces, checked before the wallet opens.
    const check = applyGuestCare(pet, action, new Date());
    if (!check.ok) {
      setNotice({ tone: "stop", text: check.message });
      haptic("refuse");
      return;
    }
    setNotice(undefined);
    const result = await sender.act(`${CARE_ACTION_LABEL[action]} ${pet.name}`, ({ owner }) => [
      getCareInstruction({ owner, pet: active.pet.address, passport: active.passport.address, action }),
    ]);
    if (!result) return;
    companion.refresh();
    // Only now, with the care confirmed, does the room show it.
    if (result.outcome === "confirmed") {
      const level = check.ok ? levelUp(pet.xp, check.pet.xp) : null;
      setNotice({
        tone: "ok",
        text: `${CARE_DONE_LABEL[action]}. Kept on Solana.${level ? ` ${pet.name} is level ${level} now.` : ""}${
          check.ok ? earnedLine(pet, check.pet, { onChain: true, guild: Boolean(active.member) }) : ""
        }`,
      });
      if (check.ok) earned(action, check.xpGained);
      ask(level ? "cheer" : CARE_MOMENT[action]);
    }
  }

  return (
    <Screen className="pk-home-screen">
      <ScreenBar>
        <div>
          <h1 className="display-s">{pet.name}&apos;s room</h1>
          <Row gap={2} wrap style={{ marginTop: "var(--space-1)" }}>
            <span className="caption pk-faint">
              {PERSONALITY_LABEL[pet.personality]} · {SPECIES_LABEL[pet.species]}
            </span>
            {worn ? <Chip label={worn.name} icon={worn.icon} /> : null}
          </Row>
        </div>
        <Chip label={onChain ? "On Solana" : `In ${here}`} tone={onChain ? "pool" : "plain"} icon={onChain ? "check" : undefined} />
      </ScreenBar>

      <div className="pk-home__pets">
        <PetSwitcher
          pets={companion.all}
          home={pet.id}
          onChoose={companion.choose}
          kept={new Set(companion.owned.map((entry) => entry.pet.address))}
        />
      </div>

      <Stack gap={3}>
        <RoomLine
          sentence=""
          mode={mode}
          state={roomState}
          onMode={setMode}
          action={!onChain ? <Button label="Keep on Solana" aria-label={`Keep ${pet.name} on Solana`} tone="quiet" size="sm" icon="keep" onClick={() => setKeeping(pet)} /> : undefined}
        />
        <Room
          pet={{
            ...petLook(pet, projected.mood),
            species: pet.species,
            name: pet.name,
            mood: projected.mood,
          }}
          look={look}
          sky={SPECIES_SKY[pet.species]}
          cue={cue}
          description={`${describeLook(look)}, and ${pet.name} the ${SPECIES_LABEL[pet.species].toLowerCase()}${worn ? ` in the ${worn.name.toLowerCase()}` : ""}, in the room with the window open.`}
          onStatus={onStatus}
          onState={setRoomState}
          stage
          viewRef={roomView}
        />
        {status.sentence ? <p role="status" className="body-sm pk-muted">{status.sentence}</p> : null}
        <Deck
          name={pet.name}
          mood={projected.mood}
          level={projected.level}
          xpInto={projected.xpIntoLevel}
          xpOf={projected.xpForNext}
          stats={projected.stats}
          cooldowns={cooldowns}
          wanted={wanted}
          busy={sender.busy}
          streak={streak.count}
          panel={panel}
          gain={gain}
          onCare={care}
          onPanel={setPanel}
          onSnap={roomState === "live" ? () => setShot(roomView.current?.snap() ?? null) : undefined}
        />


        <div id="pk-deck-panel" className="pk-deck__panel" hidden={panel === null}>
          {panel === "say" ? (
            lookShown ? (
              <EmoteRow petName={pet.name} playing={status.moment} onEmote={ask} />
            ) : (
              <Card variant="quiet">
                <p className="body-sm pk-muted">Emotes play in the 3D room. The flat room shows the care itself.</p>
              </Card>
            )
          ) : null}
          {panel === "today" ? (
            <TodayCard
              pet={pet}
              mood={projected.mood}
              stats={projected.stats}
              xpInto={projected.xpIntoLevel}
              xpOf={projected.xpForNext}
              streakCount={streak.count}
              activeToday={streak.activeToday}
              today={today}
              onChain={onChain}
            />
          ) : null}
        </div>

        <ChainTrouble error={companion.chainError} onRetry={companion.refresh} />

        <TodayStrip name={pet.name} today={today} />
        <HomeFoot pet={pet} onChain={onChain} others={companion.all.length - 1} />
      </Stack>
      {keeping ? (
        <KeepSheet
          pet={keeping}
          owner={companion.owner}
          canSign={companion.canSign}
          sender={sender}
          onDismiss={() => setKeeping(null)}
          onCarried={(address) => {
            carried.current = { id: keeping.id, address };
            companion.choose(address);
            companion.refresh();
          }}
        />
      ) : null}
      {shot ? (
        <PhotoDialog
          shot={shot}
          title={`${pet.name} and ${profile.name.trim() || "me"}`}
          line={`${PERSONALITY_LABEL[pet.personality]} ${SPECIES_LABEL[pet.species].toLowerCase()} · level ${projected.level} · ${utcDay(now)}`}
          file={`pawket-${pet.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${utcDay(now)}`}
          onClose={closePhoto}
        />
      ) : null}
    </Screen>
  );
}

/** A sticker a care just earned, said after it — and the piece of the wardrobe it opens, if any. */
function earnedLine(before: GuestPet, after: GuestPet, context: BadgeContext = {}): string {
  const earned = newlyEarned(before, after, context);
  if (earned.length === 0) return "";
  const pieces = WEARABLES.filter((item) => earned.some((badge) => badge.id === item.earnedBy));
  const opens = pieces.length
    ? ` The ${pieces.map((piece) => piece.name.toLowerCase()).join(" and the ")} ${pieces.length === 1 ? "is" : "are"} theirs to wear now.`
    : "";
  return ` New sticker: ${earned.map((badge) => badge.name).join(", ")}.${opens}`;
}

/** The new level when XP crosses one, else null. */
function levelUp(before: number, after: number): number | null {
  const level = calculateLevelFromXp(after);
  return level > calculateLevelFromXp(before) ? level : null;
}

/** What the room is doing, said out loud, and the player's choice of room. */
function RoomLine({
  sentence,
  mode,
  state,
  onMode,
  action,
}: {
  sentence: string;
  mode: "3d" | "flat";
  state: RoomState;
  onMode: (mode: "3d" | "flat") => void;
  action?: ReactNode;
}) {
  return (
    <div className="pk-spread pk-home__line">
      <p role="status" className="body-sm pk-muted">
        {sentence}
      </p>
      <Row gap={2} wrap>
        {action}
        {state === "unsupported" || state === "failed" ? null : (
          <Button
            label={mode === "3d" ? "2D view" : "3D view"}
            aria-label={mode === "3d" ? "Switch to 2D view" : "Switch to 3D view"}
            tone="ghost"
            size="sm"
            onClick={() => onMode(mode === "3d" ? "flat" : "3d")}
            onPointerEnter={mode === "flat" ? preloadRoom3D : undefined}
            onFocus={mode === "flat" ? preloadRoom3D : undefined}
          />
        )}
      </Row>
    </div>
  );
}

/** Solana did not answer: say what is shown instead, and offer to ask again. */
function ChainTrouble({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { here } = useHere();
  if (!error) return null;
  return (
    <Banner
      tone="wait"
      title="Solana did not answer"
      body={`Your pets there are unchanged; this screen could not read them just now. What you see is ${here}'s.`}
      action={<Button label="Try again" tone="quiet" size="sm" onClick={onRetry} />}
    />
  );
}

const GOALS: Array<{ action: CareActionType; label: string }> = [
  { action: CareActionType.Feed, label: "A meal" },
  { action: CareActionType.Play, label: "A game" },
  { action: CareActionType.Groom, label: "A brush" },
  { action: CareActionType.Rest, label: "A rest" },
];

/**
 * Today's round in one band: the five things that make a good day, ticked as
 * they happen. Guidance only: it changes no rule and grants nothing new.
 */
function TodayStrip({ name, today }: { name: string; today: TodayGoals }) {
  return (
    <section className="pk-today" aria-labelledby="pk-today-title">
      <div className="pk-today__head">
        <h2 id="pk-today-title" className="title">
          Today&apos;s round
        </h2>
        <span className="amount-sm pk-faint">
          {today.done} / {today.of}
        </span>
      </div>
      <ul className="pk-today__goals">
        {GOALS.map((goal) => (
          <li key={goal.action} className={today.cares[goal.action] ? "pk-goal pk-goal--done" : "pk-goal"}>
            <span className="pk-goal__mark" aria-hidden="true">
              <Icon name={today.cares[goal.action] ? "check" : CARE_ICON[goal.action]} size={14} />
            </span>
            <span>{goal.label}</span>
            <span className="pk-sr">{today.cares[goal.action] ? ", done" : ", not yet"}</span>
          </li>
        ))}
        <li className={today.round ? "pk-goal pk-goal--done" : "pk-goal"}>
          {today.round ? (
            <>
              <span className="pk-goal__mark" aria-hidden="true">
                <Icon name="check" size={14} />
              </span>
              <span>A round</span>
              <span className="pk-sr">, done</span>
            </>
          ) : (
            // The one goal played elsewhere: its whole mark is the way there.
            <Link href="/playground" className="pk-goal__go" transitionTypes={["nav-place"]}>
              <span className="pk-goal__mark" aria-hidden="true">
                <Icon name="ball" size={14} />
              </span>
              <span className="pk-goal__link">A round</span>
              <span className="pk-sr">, not yet — to the playground</span>
            </Link>
          )}
        </li>
      </ul>
      <p className="caption pk-faint pk-today__line">
        {today.done === today.of ? `All of it, today. ${name} is well looked after.` : "Any one keeps the streak; all five make a good day."}
      </p>
    </section>
  );
}

/** The full numbers behind the deck: each vital, the level, the streak. */
function TodayCard({
  pet,
  mood,
  stats,
  xpInto,
  xpOf,
  streakCount,
  activeToday,
  today,
  onChain,
}: {
  pet: GuestPet;
  mood: PetMood;
  stats: GuestPet["stats"];
  xpInto: number;
  xpOf: number;
  streakCount: number;
  activeToday: boolean;
  today: TodayGoals;
  onChain: boolean;
}) {
  const streakReadout = streakCount === 0 ? "0 days" : `${streakCount} ${streakCount === 1 ? "day" : "days"}`;
  return (
    <Card>
      <div className="pk-spread">
        <h2 className="title">Today with {pet.name}</h2>
        <span className="amount-sm pk-faint">
          {xpInto} / {xpOf} XP
        </span>
      </div>
      <p className="body-sm pk-muted" style={{ margin: "var(--space-1) 0 var(--space-4)" }}>
        {pet.name} {MOOD_SENTENCE[mood]}
      </p>
      <div className="pk-home__vitals">
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
        <Meter label="Today's round" value={today.done} max={today.of} readout={`${today.done} / ${today.of}`} tone="pool" />
      </div>
      <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
        {onChain
          ? "An estimate of time away. Each care is +10 XP once Solana confirms it, then that care rests for 30 minutes."
          : "An estimate of time away. Each care is +10 XP, then that care rests for 30 minutes."}{" "}
        There is no death — only a pet that misses you.
      </p>
      <div style={{ marginTop: "var(--space-4)" }}>
        <RemindMe name={pet.name} />
      </div>
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

/**
 * Under the day: the way to the pet's whole record, and to the rest of the
 * family. Letting a pet go lives on its record, away from the daily care.
 */
function HomeFoot({ pet, onChain, others }: { pet: GuestPet; onChain: boolean; others: number }) {
  const { here } = useHere();
  return (
    <div className="pk-home__foot">
      <Card href={`/pet/${pet.id}`} className="pk-rowcard">
        <span className="pk-rowcard__words">
          <span className="title">{pet.name}&apos;s record</span>
          <span className="caption pk-faint">
            Every care, sticker and round, {onChain ? "kept on Solana for anyone to read" : `kept in ${here}`}
          </span>
        </span>
        <Icon name="right" size={18} />
      </Card>
      {others > 0 ? (
        <ButtonLink label={`All ${others + 1} of your pets`} href="/profile#shelf" tone="ghost" size="sm" after="right" className="pk-btn--flush" />
      ) : null}
    </div>
  );
}
