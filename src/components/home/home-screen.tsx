"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Address } from "@solana/kit";
import {
  Banner,
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
  Waiting,
} from "@/components/pk";
import { CarryCard } from "@/components/home/carry-card";
import { EmoteRow } from "@/components/home/emote-row";
import { LookCard } from "@/components/home/look-card";
import { Room, useRoomMode, type RoomState } from "@/components/home/room";
import type { DirectorStatus } from "@/components/room3d/director";
import { TxReceipt } from "@/components/wallet/tx-receipt";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { getPublicEnv } from "@/config/env";
import { findWearable } from "@/lib/closet/catalog";
import { useCompanion } from "@/lib/companion/use-companion";
import {
  CARE_ACTION_LABEL,
  CARE_DONE_LABEL,
  MOOD_LABEL,
  MOOD_SENTENCE,
  PERSONALITY_LABEL,
  SPECIES_LABEL,
  SPECIES_SKY,
  petLook,
  suggestCare,
} from "@/lib/game/appearance";
import { CareActionType, type PetMood } from "@/lib/game/enums";
import {
  applyGuestCare,
  cooldownsFor,
  projectGuestPet,
  streakAsOf,
  utcDay,
  type GuestPet,
} from "@/lib/guest/pet";
import { describeLook } from "@/lib/player/look";
import { usePlayerLook } from "@/lib/player/use-player-look";
import { CARE_MOMENT, type RoomCue } from "@/lib/room/moments";
import { clearGuestPet, readGuestPetSnapshot, saveGuestPet } from "@/lib/guest/storage";
import { getCareInstruction } from "@/lib/solana/instructions";
import { usePawketSend, type TxState } from "@/lib/solana/use-send";
import { formatCountdown } from "@/lib/utils/format";

const ACTIONS: Array<{ action: CareActionType; icon: "bowl" | "ball" | "heart" | "clock" }> = [
  { action: CareActionType.Feed, icon: "bowl" },
  { action: CareActionType.Play, icon: "ball" },
  { action: CareActionType.Groom, icon: "heart" },
  { action: CareActionType.Rest, icon: "clock" },
];

/**
 * The room you actually live in. The pet is the one on Solana when a
 * connected wallet keeps one, else the one in this browser; without either,
 * the room is empty — it does not borrow a fixture. A care in this browser
 * is saved at once; a care on Solana is signed, sent and confirmed first,
 * and the room shows it only then.
 */
export function HomeScreen() {
  const companion = useCompanion();
  const { ready, pet, active } = companion;
  const look = usePlayerLook();
  const sender = usePawketSend();
  const cluster = getPublicEnv().solanaCluster;
  const [now, setNow] = useState(() => new Date());
  const [notice, setNotice] = useState<{ tone: "ok" | "stop"; text: string }>();
  const [confirming, setConfirming] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const carried = useRef<Address | null>(null);
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

  // A pet carried onto Solana leaves this browser once the chain copy is the one drawn.
  useEffect(() => {
    if (carried.current && active?.pet.address === carried.current) {
      carried.current = null;
      clearGuestPet();
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
                  Nobody lives here yet. Adopting takes three taps, and the pet starts out in this browser.
                </p>
                <div style={{ marginTop: "var(--space-4)" }}>
                  <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />
                </div>
              </Card>
              {companion.owner ? null : (
                <Card variant="quiet">
                  <h2 className="title">Already keep a pet on Solana?</h2>
                  <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
                    Connect the wallet that keeps it, and it comes home here.
                  </p>
                  <div style={{ marginTop: "var(--space-4)" }}>
                    <Button label="Connect a wallet" icon="wallet" tone="quiet" size="sm" onClick={() => setConnecting(true)} />
                  </div>
                </Card>
              )}
              <ChainTrouble error={companion.chainError} onRetry={companion.refresh} />
              {wide ? <LookCard look={look} shown={lookShown} /> : null}
            </>
          }
        />
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
  const projected = projectGuestPet(pet, now);
  const cooldowns = cooldownsFor(pet, now);
  const streak = streakAsOf(pet.streak, now);
  const worn = findWearable(pet.wearing);

  function care(action: CareActionType) {
    if (active) {
      void careOnChain(action);
      return;
    }
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

  async function careOnChain(action: CareActionType) {
    if (!active || !pet) return;
    // The same rule the program enforces, checked before the wallet opens.
    const check = applyGuestCare(pet, action, new Date());
    if (!check.ok) {
      setNotice({ tone: "stop", text: check.message });
      return;
    }
    setNotice(undefined);
    const result = await sender.send(`${CARE_ACTION_LABEL[action]} ${pet.name}`, ({ owner }) => [
      getCareInstruction({ owner, pet: active.pet.address, passport: active.passport.address, action }),
    ]);
    if (!result) return;
    companion.refresh();
    // Only now, with the care confirmed, does the room show it.
    if (result.outcome === "confirmed") ask(CARE_MOMENT[action]);
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
            />
            <div className="pk-spread">
              <Row gap={2} wrap>
                <Chip label={MOOD_LABEL[projected.mood]} icon="paw" />
                <Chip label={onChain ? "On Solana" : "In this browser"} tone={onChain ? "pool" : undefined} />
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
              mood={projected.mood}
              xpIntoLevel={projected.xpIntoLevel}
              xpForNext={projected.xpForNext}
              stats={projected.stats}
              cooldowns={cooldowns}
              streakCount={streak.count}
              activeToday={streak.activeToday}
              notice={notice}
              onChain={onChain}
              busy={sender.busy}
              tx={sender.tx}
              cluster={cluster}
              onCare={care}
            />
            <ChainTrouble error={companion.chainError} onRetry={companion.refresh} />
            {!onChain ? (
              <CarryCard
                pet={pet}
                owner={companion.owner}
                canSign={companion.canSign}
                sender={sender}
                onCarried={(address) => {
                  carried.current = address;
                  companion.choose(address);
                  companion.refresh();
                }}
              />
            ) : null}
            {wide ? <LookCard look={look} shown={lookShown} /> : null}
            {onChain ? (
              <Card variant="quiet">
                <div className="pk-spread">
                  <h2 className="title">{pet.name} lives on Solana</h2>
                  <ButtonLink label="Their record" href={`/pet/${pet.id}`} tone="ghost" size="sm" after="right" />
                </div>
                <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
                  Every care is signed by your wallet and kept on Solana {cluster}, where anyone can check it.
                  Vitals above are an estimate of time away, worked out the same way the program does. There
                  is no death — only a pet that misses you.
                </p>
                {companion.owned.length > 1 ? (
                  <div style={{ marginTop: "var(--space-4)" }}>
                    <ButtonLink label={`Your ${companion.owned.length} pets`} href="/inventory" tone="quiet" size="sm" icon="pocket" />
                  </div>
                ) : null}
              </Card>
            ) : (
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
            )}
          </>
        }
      />
    </Screen>
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

function CareCard({
  pet,
  mood,
  xpIntoLevel,
  xpForNext,
  stats,
  cooldowns,
  streakCount,
  activeToday,
  notice,
  onChain,
  busy,
  tx,
  cluster,
  onCare,
}: {
  pet: GuestPet;
  mood: PetMood;
  xpIntoLevel: number;
  xpForNext: number;
  stats: GuestPet["stats"];
  cooldowns: Record<CareActionType, number>;
  streakCount: number;
  activeToday: boolean;
  notice?: { tone: "ok" | "stop"; text: string };
  onChain: boolean;
  busy: boolean;
  tx: TxState;
  cluster: ReturnType<typeof getPublicEnv>["solanaCluster"];
  onCare: (action: CareActionType) => void;
}) {
  const streakReadout = streakCount === 0 ? "0 days" : `${streakCount} ${streakCount === 1 ? "day" : "days"}`;
  // The care the pet most wants wears sun; the rest wait their turn.
  const wanted = busy ? null : suggestCare(stats, cooldowns);
  return (
    <Card>
      <div className="pk-spread">
        <h2 className="title">Today with {pet.name}</h2>
        <span className="amount-sm pk-faint">
          {xpIntoLevel} / {xpForNext} XP
        </span>
      </div>
      <p className="body-sm pk-muted" style={{ margin: "var(--space-1) 0 var(--space-4)" }}>
        {pet.name} {MOOD_SENTENCE[mood]}
      </p>
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
        {onChain
          ? "An estimate. Each action is +10 XP once Solana confirms it, then that action rests for 30 minutes."
          : "An estimate. Each action is +10 XP, then that action rests for 30 minutes."}
      </p>
      <Row gap={2} wrap style={{ marginTop: "var(--space-4)" }}>
        {ACTIONS.map(({ action, icon }) => {
          const left = cooldowns[action];
          return (
            <Button
              key={action}
              label={CARE_ACTION_LABEL[action]}
              meta={left > 0 ? formatCountdown(left) : undefined}
              icon={icon}
              size="sm"
              tone={action === wanted ? undefined : "quiet"}
              disabled={left > 0 || busy}
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
      {onChain && tx.stage !== "idle" ? (
        <div style={{ marginTop: "var(--space-3)" }}>
          <TxReceipt tx={tx} cluster={cluster} />
        </div>
      ) : null}
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
