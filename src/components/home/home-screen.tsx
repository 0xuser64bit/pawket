"use client";

import { NavLink as Link } from "@/components/pk/nav-link";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { chime } from "@/lib/play/sound";
import { RoomSound } from "./room-sound";
import { HomeScreenTip } from "./home-screen-tip";
import { SigningNote } from "./signing-note";
import { PetSwitcher } from "@/components/home/pet-switcher";
import { DecorPanel } from "@/components/home/decor-panel";
import { shownDecor, useRoomDecor } from "@/lib/room/decor";
import { useCoats } from "@/lib/player/use-coats";
import { useCloset } from "@/lib/market/use-closet";
import { Room, RoomViewSwitch, useRoomMode, type RoomState } from "@/components/home/room";
import type { DirectorStatus } from "@/components/room3d/director";
import type { RoomView } from "@/components/room3d/room-3d";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { findWearable } from "@/lib/closet/catalog";
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
import { CARE_MOMENT, type PhotoPose, type RoomCue } from "@/lib/room/moments";
import { getCareInstruction } from "@/lib/solana/instructions";
import { usePawketSend } from "@/lib/solana/use-send";
import { record, recordHomeOpened } from "@/lib/analytics/events";
import { dayTurnsAt } from "@/lib/utils/format";
import { localMinute } from "@/lib/utils/local-datetime";

export function HomeScreen() {
  const companion = useCompanion();
  const { here, Here } = useHere();
  const { ready, pet, active } = companion;
  const look = usePlayerLook();
  const profile = usePlayerProfile();
  const chosenDecor = useRoomDecor();
  const closet = useCloset(companion.owner);
  const owned = new Set(closet.data?.items ?? []);
  const decor = shownDecor(chosenDecor, owned);
  const coatOf = useCoats();
  const sender = usePawketSend();
  const [now, setNow] = useState(() => new Date());
  const [connecting, setConnecting] = useState(false);
  const [keeping, setKeeping] = useState<GuestPet | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [gain, setGain] = useState<Gain | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const roomView = useRef<RoomView>(null);
  const closePhoto = useCallback(() => {
    void roomView.current?.pose(null);
    setShot(null);
  }, []);
  const poseForPhoto = useCallback((id: PhotoPose | null) => roomView.current?.pose(id) ?? Promise.resolve(null), []);
  const allPets = companion.all;
  useEffect(() => {
    if (ready) recordHomeOpened(allPets);
  }, [ready, allPets]);
  const carried = useRef<{ id: string; address: Address } | null>(null);
  const [cue, setCue] = useState<RoomCue | null>(null);
  const [status, setStatus] = useState<DirectorStatus>({ moment: null, sentence: "" });
  const [roomState, setRoomState] = useState<RoomState>("loading");
  const [mode, setMode] = useRoomMode();
  const onStatus = useCallback((next: DirectorStatus) => setStatus(next), []);
  const ask = (moment: string) => {
    setCue({ moment, nonce: Date.now() });
    chime(moment);
  };
  const earned = (action: CareActionType, xp: number) => setGain({ action, xp, at: Date.now() });

  const resting = pet ? Object.values(cooldownsFor(pet, now)).some((left) => left > 0) : false;
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), resting ? 1_000 : 30_000);
    return () => window.clearInterval(id);
  }, [resting]);

  useEffect(() => {
    if (!panel) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("pk-deck-panel")?.scrollIntoView({ block: "nearest", behavior: reduce ? "instant" : "smooth" });
  }, [panel]);

  useEffect(() => {
    if (carried.current && active?.pet.address === carried.current.address) {
      if (!removePet(carried.current.id)) {
        showToast({ id: `local-copy-${carried.current.id}`, tone: "note", title: "Kept on Solana", body: "The local copy is still on this device. Remove it from its page when storage is available." });
      }
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
            decor={decor}
            onState={setRoomState}
            stage
            corner={<div className="pk-room-tools"><RoomSound /><RoomViewSwitch mode={mode} state={roomState} onMode={setMode} /></div>}
          />
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
          <ChainTrouble error={companion.chainError} kept={companion.owned.length > 0} onRetry={companion.refresh} />
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
    setNotice({
      tone: "ok",
      text: `${CARE_DONE_LABEL[action]}. +${result.xpGained} XP.${day}${earnedLine(current, result.pet)}`,
    });
    if (level) {
      showToast({
        id: `keep-${current.id}`,
        tone: "note",
        title: `${current.name} is level ${level}!`,
        ttl: 14_000,
        body: (
          <>
            This level lives in {here}. On Solana, {current.name} starts at level 1 — the sooner, the less to
            redo.{" "}
            <button type="button" className="pk-linkish" onClick={() => setKeeping(readPet(current.id) ?? current)}>
              Keep {current.name} on Solana
            </button>
          </>
        ),
      });
    }
    earned(action, result.xpGained);
    record({ name: "care_saved", where: "browser", action });
    ask(level ? "cheer" : CARE_MOMENT[action]);
    haptic(level ? "cheer" : "done");
  }

  async function careOnChain(action: CareActionType) {
    if (!active || !pet) return;
    const check = applyGuestCare(pet, action, new Date());
    if (!check.ok) {
      setNotice({ tone: "stop", text: check.message });
      haptic("refuse");
      return;
    }
    setNotice(undefined);
    const level = levelUp(pet.xp, check.pet.xp);
    const done = `${CARE_DONE_LABEL[action]}.${level ? ` ${pet.name} is level ${level} now.` : ""}${earnedLine(pet, check.pet, { onChain: true, guild: Boolean(active.member) })}`;
    const result = await sender.act(
      `${CARE_ACTION_LABEL[action]} ${pet.name}`,
      ({ owner }) => [getCareInstruction({ owner, pet: active.pet.address, passport: active.passport.address, action })],
      done,
    );
    if (!result) return;
    companion.refresh();
    if (result.outcome === "confirmed") {
      earned(action, check.xpGained);
      record({ name: "care_saved", where: "solana", action });
      ask(level ? "cheer" : CARE_MOMENT[action]);
    }
  }

  return (
    <Screen className="pk-home-screen">
      <ScreenBar>
        <div className={pet.name.length > 12 ? "pk-home__title--long" : undefined}>
          <h1 className="display-s">{pet.name}&apos;s room</h1>
          <Row gap={2} wrap style={{ marginTop: "var(--space-1)" }}>
            <span className="caption pk-faint">
              {PERSONALITY_LABEL[pet.personality]} · {SPECIES_LABEL[pet.species]}
              {onChain ? "" : ` · In ${here}`}
            </span>
            {worn ? <Chip label={worn.name} icon={worn.icon} /> : null}
          </Row>
        </div>
        {onChain ? (
          <Chip label="On Solana" tone="pool" icon="check" />
        ) : (
          <Button label="Keep on Solana" aria-label={`Keep ${pet.name} on Solana`} tone="quiet" size="sm" icon="keep" onClick={() => setKeeping(pet)} />
        )}
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
        <Room
          pet={{
            ...petLook(pet, projected.mood),
            species: pet.species,
            name: pet.name,
            mood: projected.mood,
            coat: coatOf(pet),
          }}
          look={look}
          sky={SPECIES_SKY[pet.species]}
          cue={cue}
          description={`${describeLook(look)}, and ${pet.name} the ${SPECIES_LABEL[pet.species].toLowerCase()}${worn ? ` in the ${worn.name.toLowerCase()}` : ""}, in the room with the window open.`}
          onStatus={onStatus}
          onState={setRoomState}
          stage
          viewRef={roomView}
          decor={decor}
          corner={<div className="pk-room-tools"><RoomSound /><RoomViewSwitch mode={mode} state={roomState} onMode={setMode} /></div>}
        />
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
        {onChain ? <SigningNote state={sender.pawketWallet} name={pet.name} /> : null}
        <p role="status" className="pk-sr">
          {status.sentence}
        </p>

        <div id="pk-deck-panel" className="pk-deck__panel" hidden={panel === null}>
          {panel === "say" ? <EmoteRow petName={pet.name} playing={status.moment} onEmote={ask} /> : null}
          {panel === "decor" ? <DecorPanel shown={decor} owned={owned} /> : null}
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

        <ChainTrouble error={companion.chainError} kept={companion.owned.length > 0} onRetry={companion.refresh} />

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
            // An RPC node can confirm a pet before it serves its account.
            void (async () => {
              for (let tries = 0; tries < 6 && carried.current?.address === address; tries++) {
                await companion.refresh();
                if (carried.current?.address !== address) return;
                await new Promise((resolve) => setTimeout(resolve, 2_000));
              }
            })();
          }}
        />
      ) : null}
      {shot ? (
        <PhotoDialog
          shot={shot}
          onPose={poseForPhoto}
          title={`${pet.name} and ${profile.name.trim() || "me"}`}
          line={`${PERSONALITY_LABEL[pet.personality]} ${SPECIES_LABEL[pet.species].toLowerCase()} · level ${projected.level} · ${localMinute(now).slice(0, 10)}`}
          file={`pawket-${pet.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${localMinute(now).slice(0, 10)}`}
          onClose={closePhoto}
        />
      ) : null}
    </Screen>
  );
}

function earnedLine(before: GuestPet, after: GuestPet, context: BadgeContext = {}): string {
  const earned = newlyEarned(before, after, context);
  if (earned.length === 0) return "";
  return ` New sticker: ${earned.map((badge) => badge.name).join(", ")}.`;
}

function levelUp(before: number, after: number): number | null {
  const level = calculateLevelFromXp(after);
  return level > calculateLevelFromXp(before) ? level : null;
}

function ChainTrouble({ error, kept, onRetry }: { error: unknown; kept: boolean; onRetry: () => void }) {
  const { here } = useHere();
  if (!error) return null;
  return (
    <Banner
      tone="wait"
      title="Solana did not answer"
      body={
        kept
          ? "Your pets there are unchanged; this screen could not read them again just now, so what it shows of them may be behind."
          : `Your pets there are unchanged; this screen could not read them just now. What you see is ${here}'s.`
      }
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
        {today.done === today.of
          ? `All of it, today. ${name} is well looked after. A new day starts ${dayTurnsAt()}.`
          : `Any one keeps the streak; all five make a good day. The day turns ${dayTurnsAt()}.`}
      </p>
    </section>
  );
}

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

function HomeFoot({ pet, onChain, others }: { pet: GuestPet; onChain: boolean; others: number }) {
  const { here } = useHere();
  return (
    <div className="pk-home__foot">
      {onChain ? null : <HomeScreenTip name={pet.name} />}
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
