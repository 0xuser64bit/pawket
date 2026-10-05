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
import { CarryCard } from "@/components/home/carry-card";
import { RemindMe } from "@/components/home/remind-me";
import { CARE_ICON, Deck, type Panel } from "@/components/home/deck";
import { EmoteRow } from "@/components/home/emote-row";
import { PhotoDialog } from "@/components/home/photo";
import { PetSwitcher } from "@/components/home/pet-switcher";
import { Room, preloadRoom3D, useRoomMode, type RoomState } from "@/components/home/room";
import type { DirectorStatus } from "@/components/room3d/director";
import type { RoomView } from "@/components/room3d/room-3d";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { getPublicEnv } from "@/config/env";
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
import { lookSummary } from "@/components/profile/look-editor";
import { describeLook } from "@/lib/player/look";
import { usePlayerProfile } from "@/lib/player/profile";
import { usePlayerLook } from "@/lib/player/use-player-look";
import { CARE_MOMENT, type RoomCue } from "@/lib/room/moments";
import { getCareInstruction } from "@/lib/solana/instructions";
import { deviceFallback, usePawketSend } from "@/lib/solana/use-send";
import type { PawketWalletState } from "@/lib/wallet/pawket-wallet";

/**
 * The room you actually live in, and the whole width of the screen: you and
 * the pet at home. Beneath it floats the deck — how the pet is, the four
 * cares and three tools — and a tool opens its panel below the deck, so the
 * room stays the largest thing on the screen. The pet is the one the player
 * chose, from any they keep; a care in this browser is saved at once, and a
 * care on Solana is signed, sent and confirmed first. The room shows a care
 * only once it is kept.
 */
export function HomeScreen() {
  const companion = useCompanion();
  const { ready, pet, active } = companion;
  const look = usePlayerLook();
  const profile = usePlayerProfile();
  const sender = usePawketSend();
  const cluster = getPublicEnv().solanaCluster;
  const [now, setNow] = useState(() => new Date());
  const [said, setSaid] = useState<{ pet: string; tone: "ok" | "stop"; text: string }>();
  const [connecting, setConnecting] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
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

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

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
          <div className="pk-home__more">
            <Card>
              <h2 className="title">The window is open</h2>
              <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
                Nobody lives here yet. Adopting takes three taps, and the pet starts out in this browser.
              </p>
              <div className="pk-foot">
                <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />
              </div>
            </Card>
            {companion.owner ? null : (
              <Card variant="quiet">
                <h2 className="title">Already keep a pet on Solana?</h2>
                <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
                  Connect the wallet that keeps it, and it comes home here.
                </p>
                <div className="pk-foot">
                  <Button label="Connect a wallet" icon="wallet" tone="quiet" size="sm" onClick={() => setConnecting(true)} />
                </div>
              </Card>
            )}
            <Card>
              <h2 className="title">How you look</h2>
              <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
                {lookSummary(look)}. Saved on this device, and yours to change.
              </p>
              <div className="pk-foot">
                <ButtonLink label="Change your look" href="/profile#look" tone="quiet" size="sm" icon="person" />
              </div>
            </Card>
          </div>
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
  // What was said about one pet is not about the next one home.
  const notice = said?.pet === pet.id ? said : undefined;
  const setNotice = (next?: { tone: "ok" | "stop"; text: string }) => setSaid(next && { ...next, pet: pet.id });
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
      return;
    }
    if (!savePet(result.pet)) {
      setNotice({
        tone: "stop",
        text: "This browser did not store that. The action did not stick.",
      });
      return;
    }
    const day = result.pet.streak.lastDay === utcDay(new Date()) ? ` Day ${result.pet.streak.count}.` : "";
    const level = levelUp(current.xp, result.pet.xp);
    setNotice({
      tone: "ok",
      text: `${CARE_DONE_LABEL[action]}. +${result.xpGained} XP.${day}${level ? ` ${current.name} is level ${level} now.` : ""}${earnedLine(current, result.pet)}`,
    });
    // Only now, with the care saved, does the room show it — and a new
    // level is the one thing worth a cheer.
    ask(level ? "cheer" : CARE_MOMENT[action]);
  }

  async function careOnChain(action: CareActionType) {
    if (!active || !pet) return;
    // The same rule the program enforces, checked before the wallet opens.
    const check = applyGuestCare(pet, action, new Date());
    if (!check.ok) {
      setNotice({ tone: "stop", text: check.message });
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
      ask(level ? "cheer" : CARE_MOMENT[action]);
    }
  }

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-s">{pet.name}&apos;s room</h1>
          <Row gap={2} wrap style={{ marginTop: "var(--space-1)" }}>
            <span className="caption pk-faint">
              {PERSONALITY_LABEL[pet.personality]} · {SPECIES_LABEL[pet.species]}
            </span>
            <Chip label={onChain ? "On Solana" : "In this browser"} tone={onChain ? "pool" : undefined} />
            {worn ? <Chip label={worn.name} icon={worn.icon} /> : null}
          </Row>
        </div>
        <PetSwitcher pets={companion.all} home={pet.id} onChoose={companion.choose} />
      </ScreenBar>

      <Stack gap={3}>
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
          onCare={care}
          onPanel={setPanel}
          onSnap={roomState === "live" ? () => setShot(roomView.current?.snap() ?? null) : undefined}
        />
        <p
          role="status"
          className="body-sm pk-home__notice"
          style={{ color: notice?.tone === "stop" ? "var(--alarm-text)" : "var(--sprout-text)" }}
        >
          {notice ? (
            <span key={notice.text} className="pk-swap-in" style={{ display: "inline-block" }}>
              {notice.text}
            </span>
          ) : null}
        </p>
        <RoomLine sentence={status.sentence} mode={mode} state={roomState} onMode={setMode} />
        {onChain ? <NoPrompt state={sender.pawketWallet} now={now} /> : null}

        <div id="pk-deck-panel" className="pk-deck__panel">
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

        <div className="pk-home__more">
          <GoalsCard name={pet.name} today={today} />
          {!onChain ? (
            <CarryCard
              pet={pet}
              owner={companion.owner}
              canSign={companion.canSign}
              sender={sender}
              onCarried={(address) => {
                carried.current = { id: pet.id, address };
                companion.choose(address);
                companion.refresh();
              }}
            />
          ) : null}
          <RecordCard pet={pet} onChain={onChain} cluster={cluster} others={companion.all.length - 1} />
        </div>
      </Stack>
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
}: {
  sentence: string;
  mode: "3d" | "flat";
  state: RoomState;
  onMode: (mode: "3d" | "flat") => void;
}) {
  return (
    <div className="pk-spread pk-home__line">
      <p role="status" className="body-sm pk-muted">
        {sentence}
      </p>
      {state === "unsupported" || state === "failed" ? null : (
        <Button
          label={mode === "3d" ? (state === "loading" ? "Stay flat" : "Flat room") : "3D room"}
          tone="ghost"
          size="sm"
          onClick={() => onMode(mode === "3d" ? "flat" : "3d")}
          onPointerEnter={mode === "flat" ? preloadRoom3D : undefined}
          onFocus={mode === "flat" ? preloadRoom3D : undefined}
        />
      )}
    </div>
  );
}

/**
 * For a pet on Solana: whether what it does will ask the wallet, and why —
 * this browser not linked, its link run out, today's limit used — with the
 * way to change it.
 */
function NoPrompt({ state, now }: { state: PawketWalletState | null; now: Date }) {
  const why = deviceFallback(state, now.getTime() / 1000);
  const line: ReactNode =
    why === null ? (
      <>
        Signed by this browser, with no pop-up. <Link href="/wallet">Your Pawket Wallet</Link>
      </>
    ) : why === "expired" ? (
      <>
        This browser&apos;s link ran out, so your wallet asks again. <Link href="/wallet">Link it again</Link>
      </>
    ) : why === "limit" ? (
      <>This browser has done all it may today; your wallet signs until midnight UTC.</>
    ) : (
      <>
        Each care asks your wallet. <Link href="/wallet">Link this browser</Link> and it stops asking.
      </>
    );
  return (
    <p className="caption pk-faint pk-home__noprompt">
      <Icon name="bolt" size={14} />
      <span>{line}</span>
    </p>
  );
}

/** Solana did not answer: say what is shown instead, and offer to ask again. */
function ChainTrouble({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (!error) return null;
  return (
    <Banner
      tone="wait"
      title="Solana did not answer"
      body="Your pets there are unchanged; this screen could not read them just now. What you see is this browser's."
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

/** Today's round of care as a checklist. Guidance only: it changes no rule and grants nothing new. */
function GoalsCard({ name, today }: { name: string; today: TodayGoals }) {
  return (
    <Card>
      <div className="pk-spread">
        <h2 className="title">Today&apos;s round</h2>
        <span className="amount-sm pk-faint">
          {today.done} / {today.of}
        </span>
      </div>
      <ul className="pk-goals">
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
          <span className="pk-goal__mark" aria-hidden="true">
            <Icon name={today.round ? "check" : "ball"} size={14} />
          </span>
          {today.round ? <span>A round in the playground</span> : <Link href="/playground">A round in the playground</Link>}
          <span className="pk-sr">{today.round ? ", done" : ", not yet"}</span>
        </li>
      </ul>
      <p className="caption pk-faint pk-foot">
        {today.done === today.of
          ? `All of it, today. ${name} is well looked after.`
          : "Any one of these keeps the streak. A day with all five is a good day."}
      </p>
      <RemindMe name={name} />
    </Card>
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
          ? "An estimate. Each care is +10 XP once Solana confirms it, then that care rests for 30 minutes."
          : "An estimate. Each care is +10 XP, then that care rests for 30 minutes."}
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

/** Where the pet's record lives, the way to it, and — in this browser — letting a pet go. */
function RecordCard({
  pet,
  onChain,
  cluster,
  others,
}: {
  pet: GuestPet;
  onChain: boolean;
  cluster: ReturnType<typeof getPublicEnv>["solanaCluster"];
  others: number;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Card variant="quiet">
      <div className="pk-spread">
        <h2 className="title">{onChain ? `${pet.name} lives on Solana` : `${pet.name} lives in this browser`}</h2>
        <ButtonLink label="Their record" href={`/pet/${pet.id}`} tone="ghost" size="sm" after="right" />
      </div>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        {onChain
          ? `Every care is signed by your wallet and kept on Solana ${cluster}, where anyone can check it. The vitals are an estimate of time away, worked out the same way the program does.`
          : "Saved here, and nowhere else. The vitals are an estimate of time away."}{" "}
        There is no death — only a pet that misses you.
      </p>
      <Row gap={2} wrap className="pk-foot">
        {others > 0 ? (
          <ButtonLink label={`All ${others + 1} of your pets`} href="/profile#shelf" tone="quiet" size="sm" icon="pocket" />
        ) : (
          <ButtonLink label="Adopt another" href="/adopt" tone="quiet" size="sm" icon="plus" />
        )}
        {onChain ? null : confirming ? null : (
          <Button tone="ghost" size="sm" label={`Let ${pet.name} go`} onClick={() => setConfirming(true)} />
        )}
      </Row>
      {!onChain && confirming ? (
        <Stack gap={3} style={{ marginTop: "var(--space-4)" }}>
          <p className="body-sm">
            Let {pet.name} go from this browser? Their care, streak and clothes go too. This cannot be undone.
            {others > 0 ? " Your other pets stay." : ""}
          </p>
          <Row gap={2} wrap>
            <Button tone="alarm" size="sm" label={`Let ${pet.name} go`} onClick={() => removePet(pet.id)} />
            <Button tone="quiet" size="sm" label="Keep them" onClick={() => setConfirming(false)} />
          </Row>
        </Stack>
      ) : null}
    </Card>
  );
}
