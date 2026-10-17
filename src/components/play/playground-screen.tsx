"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  PawGlyph,
  PetArt,
  Row,
  Screen,
  ScreenBar,
  Stack,
  Waiting,
  WearableArt,
} from "@/components/pk";
import { ShareButton } from "@/components/pet/share-button";
import { PetSwitcher } from "@/components/home/pet-switcher";
import { getPublicEnv } from "@/config/env";
import { DAILY_GOAL_REWARD_XP } from "@/lib/game/constants";
import { SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { useCompanion } from "@/lib/companion/use-companion";
import { recordPlay, utcDay, type GuestPet } from "@/lib/guest/pet";
import { dayTurnsAt } from "@/lib/utils/format";
import { useMounted } from "@/lib/utils/use-mounted";
import { readPet, savePet } from "@/lib/guest/storage";
import { getFinishRoundInstruction } from "@/lib/solana/instructions";
import { usePawketSend, type PawketSender } from "@/lib/solana/use-send";
import { dailySeed, keepBest, keepDaily, readBest, readDaily, type GameId } from "@/lib/play/best";
import { useSound } from "@/lib/play/sound";
import { useHere } from "@/lib/native/android";
import { CatchGame } from "./catch-game";
import { CopyGame } from "./copy-game";
import { HopGame } from "./hop-game";
import { PairsGame } from "./pairs-game";
import { Obstacle, RainCloud, Star, Treat } from "./game-art";

const GAMES: Array<{ id: GameId; name: string; line: string; unit: (score: number) => string }> = [
  { id: "catch", name: "Catch", line: "Treats fall. Move to catch them, and keep clear of the storm clouds.", unit: (n) => `${n} caught` },
  { id: "hop", name: "Hop", line: "Run the park path and jump what is in the way. It gets quicker.", unit: (n) => `${n} points` },
  { id: "copy", name: "Copy", line: "Your pet taps a pattern on a giant paw. Tap it back, one longer each time.", unit: (n) => `${n} copied` },
  { id: "pairs", name: "Pairs", line: "Twelve cards, six pairs from the wardrobe. Find them all, missing as little as you can.", unit: (n) => `${n} points` },
];

/** A finished round: the score, and — for a pet in this browser — what was saved. */
type Outcome = {
  game: GameId;
  score: number;
  best: boolean;
  /** The day's shared round, and its best on this device. */
  daily: boolean;
  dailyBest: boolean;
  xpGained: number;
  saved: boolean;
  onChain: boolean;
};

const noop = () => () => {};
const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

/**
 * Four games, each one round. Finishing any of them is the day's round:
 * the first of a UTC day adds the daily XP, once, to the pet that played.
 * The score is the player's; nothing about the pet changes it, and it
 * changes nothing about the pet. Today's round is the same for everyone on
 * the same UTC day, so a score can be compared by sharing it; practice is
 * a new round every time. A pet in this browser keeps the round at once; a
 * pet on Solana keeps it when the player records it — a send is never made
 * for them.
 */
export function PlaygroundScreen() {
  const companion = useCompanion();
  const { ready, refresh } = companion;
  const sender = usePawketSend();
  const [chosen, setChosen] = useState<string | null>(null);
  const [game, setGame] = useState<GameId | null>(null);
  const [daily, setDaily] = useState(true);
  const [round, setRound] = useState(randomSeed);
  // The UTC day a round began on: its seed and its daily best stay that day's, even across midnight.
  const [day, setDay] = useState(() => utcDay(new Date()));
  const [outcome, setOutcome] = useState<Outcome>();
  const [paused, setPaused] = useState(false);
  const field = useRef<HTMLDivElement>(null);
  const [sound, setSound] = useSound();
  const mounted = useMounted();
  const today = utcDay(new Date());
  const stored = useSyncExternalStore(noop, () => JSON.stringify([readBest(), readDaily(today)]), () => "[{},{}]");
  const [bests, todays] = JSON.parse(stored) as [Partial<Record<GameId, number>>, Partial<Record<GameId, number>>];

  const pet = companion.all.find((p) => p.id === chosen) ?? companion.pet;
  const chain = companion.owned.find((entry) => entry.pet.address === pet?.id) ?? null;
  const seed = game && daily ? dailySeed(game, day) : round;

  function play(id: GameId, asDaily = daily) {
    sender.reset();
    setOutcome(undefined);
    setPaused(false);
    setDaily(asDaily);
    setRound(randomSeed());
    setDay(utcDay(new Date()));
    setGame(id);
  }

  useEffect(() => {
    const hide = () => { if (document.hidden) setPaused(true); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(() => {
    if (game) field.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [game]);

  const finish = useCallback(
    (score: number) => {
      if (!game || !pet) return;
      const isBest = keepBest(game, score);
      const dailyBest = daily ? keepDaily(game, day, score) : false;
      const base = { game, score, best: isBest, daily, dailyBest };
      if (chain) {
        // Kept on Solana only when the player records it; the bonus is the program's call.
        setOutcome({ ...base, xpGained: recordPlay(pet, new Date()).xpGained, saved: false, onChain: true });
        return;
      }
      const current = readPet(pet.id);
      if (!current) {
        setOutcome({ ...base, xpGained: 0, saved: false, onChain: false });
        return;
      }
      const result = recordPlay(current, new Date());
      const saved = savePet(result.pet);
      setOutcome({ ...base, xpGained: result.xpGained, saved, onChain: false });
    },
    [game, pet, chain, daily, day],
  );

  async function recordRound() {
    if (!chain || !pet) return;
    const result = await sender.act(`Finish a round with ${pet.name}`, ({ owner }) => [
      getFinishRoundInstruction({ owner, pet: chain.pet.address, passport: chain.passport.address }),
    ]);
    if (result) refresh();
  }

  const current = GAMES.find((g) => g.id === game);

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l">Playground</h1>
          <p className="caption pk-faint">
            Four games. Any one of them is today&apos;s round{mounted ? `, and a new one comes ${dayTurnsAt()}` : ""}.
          </p>
        </div>
        <Row gap={2}>
          <Button
            label={sound ? "Sound on" : "Sound off"}
            icon="music"
            tone="ghost"
            size="sm"
            className="pk-btn--flush"
            aria-pressed={sound}
            onClick={() => setSound(!sound)}
          />
          {pet ? <Chip label={pet.name} tone="pool" icon="paw" /> : null}
        </Row>
      </ScreenBar>

      {!ready ? <Waiting label="Opening the playground" /> : null}

      {ready && !pet ? (
        <EmptyState
          icon="ball"
          title="The playground is quiet"
          body="A round needs a pet. Adopting takes three taps, and the daily bonus is kept with them."
          action={<ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />}
        />
      ) : null}

      {ready && pet && !current ? (
        <Picker
          pet={pet}
          pets={companion.all}
          bests={bests}
          todays={todays}
          onChoose={setChosen}
          onPlay={play}
        />
      ) : null}

      {ready && pet && current ? (
        <Stack gap={4}>
          <div className="pk-spread">
            <div>
              <Row gap={2} wrap>
                <h2 className="display-m">{current.name}</h2>
                <Chip label={daily ? "Today's round" : "Practice"} tone={daily ? "sun" : undefined} icon={daily ? "star" : "ball"} />
              </Row>
              <p className="body-sm pk-muted">{current.line}</p>
            </div>
          </div>
          <div className="pk-play">
            <div ref={field} className="pk-play__field">
              <div className="pk-spread pk-play__controls">
                <Button label="All games" tone="ghost" size="sm" icon="left" className="pk-btn--flush" disabled={sender.busy} onClick={() => setGame(null)} />
                {!outcome ? <Button label={paused ? "Resume round" : "Pause round"} tone="quiet" size="sm" onClick={() => setPaused(!paused)} /> : null}
              </div>
              <div className="pk-play__stage">
                <div inert={paused && !outcome}>
                  <Field key={`${current.id}-${seed}-${round}`} game={current.id} pet={pet} seed={seed} paused={paused} onFinish={finish} />
                </div>
                {paused && !outcome ? <div className="pk-play__pause" role="status"><p className="title">Round paused</p><Button label="Keep playing" tone="pool" onClick={() => setPaused(false)} /></div> : null}
              </div>
            </div>
            {outcome ? (
              <Result
                pet={pet}
                outcome={outcome}
                name={current.name}
                unit={current.unit}
                bestScore={bests[current.id]}
                day={day}
                sender={sender}
                onRecord={() => void recordRound()}
                onAgain={() => play(current.id)}
                onPractice={() => play(current.id, false)}
                onOther={() => setGame(null)}
              />
            ) : (
              <Banner
                tone="info"
                title="Nothing here can be bought"
                body={`Finishing a round once a day adds ${DAILY_GOAL_REWARD_XP} XP to ${pet.name}. The score is yours: clothes, mood and vitals do not change it, and it does not change them.`}
              />
            )}
          </div>
        </Stack>
      ) : null}
    </Screen>
  );
}

function Field({ game, pet, seed, paused, onFinish }: { game: GameId; pet: GuestPet; seed: number; paused: boolean; onFinish: (score: number) => void }) {
  const { form, temper, wearing } = petLook(pet);
  if (game === "catch") return <CatchGame form={form} temper={temper} wearing={wearing} seed={seed} paused={paused} onFinish={onFinish} />;
  if (game === "hop") return <HopGame form={form} temper={temper} wearing={wearing} seed={seed} paused={paused} onFinish={onFinish} />;
  if (game === "pairs") return <PairsGame form={form} temper={temper} wearing={wearing} seed={seed} paused={paused} onFinish={onFinish} />;
  return <CopyGame form={form} temper={temper} wearing={wearing} sky={SPECIES_SKY[pet.species]} seed={seed} paused={paused} onFinish={onFinish} />;
}

/** The four games as cards, each drawn with the player's own pet in it. */
function Picker({
  pet,
  pets,
  bests,
  todays,
  onChoose,
  onPlay,
}: {
  pet: GuestPet;
  pets: GuestPet[];
  bests: Partial<Record<GameId, number>>;
  todays: Partial<Record<GameId, number>>;
  onChoose: (id: string) => void;
  onPlay: (id: GameId, daily?: boolean) => void;
}) {
  const look = petLook(pet);
  const claimed = pet.lastDailyPlayDay === utcDay(new Date());
  return (
    <Stack gap={5}>
      {pets.length > 1 ? (
        <div className="pk-spread">
          <span className="label pk-faint">Playing</span>
          <PetSwitcher
            pets={pets}
            home={pet.id}
            onChoose={onChoose}
            label="Who is playing"
            chooseLabel={(p) => `Play with ${p.name}`}
            chosenLabel={(p) => `${p.name}, playing`}
            adopt={false}
          />
        </div>
      ) : null}
      <Banner
        tone={claimed ? "done" : "info"}
        title={claimed ? `${pet.name} has today's round` : `Today's round is worth ${DAILY_GOAL_REWARD_XP} XP to ${pet.name}`}
        body={
          claimed
            ? `${pet.name} already has today's bonus. Play for the fun of it, or for your best.`
            : `Finish any game once today and ${pet.name} keeps the bonus. The score itself is only yours.`
        }
      />
      <div className="pk-games">
        {GAMES.map((game) => (
          <article key={game.id} className="pk-gamecard" aria-labelledby={`game-${game.id}`}>
              <span className={`pk-gamecard__art pk-gamecard__art--${game.id}`} aria-hidden="true">
                {game.id === "catch" ? (
                  <>
                    <span className="pk-gamecard__item" style={{ left: "22%", top: "12%" }}>
                      <Treat form={look.form} />
                    </span>
                    <span className="pk-gamecard__item" style={{ left: "70%", top: "8%" }}>
                      <Star />
                    </span>
                    <span className="pk-gamecard__item pk-gamecard__item--sm" style={{ left: "84%", top: "34%" }}>
                      <RainCloud />
                    </span>
                  </>
                ) : null}
                {game.id === "hop" ? (
                  <span className="pk-gamecard__pot">
                    <Obstacle kind="pot" />
                  </span>
                ) : null}
                {game.id === "copy" ? (
                  <>
                    {[0, 1, 2, 3].map((bean) => (
                      <span key={bean} className={`pk-gamecard__bean pk-paws__bean--${bean}`} />
                    ))}
                  </>
                ) : null}
                {game.id === "pairs" ? (
                  <span className="pk-gamecard__cards">
                    <span className="pk-gamecard__card">
                      <PawGlyph size={22} />
                    </span>
                    <span className="pk-gamecard__card pk-gamecard__card--up">
                      <WearableArt id="party-hat" />
                    </span>
                    <span className="pk-gamecard__card pk-gamecard__card--up">
                      <WearableArt id="party-hat" />
                    </span>
                  </span>
                ) : null}
                <span className="pk-gamecard__pet">
                  <PetArt {...look} feeling={game.id === "hop" ? "radiant" : "happy"} pose="full" />
                </span>
              </span>
              <span className="pk-gamecard__words">
                <span className="pk-spread">
                  <h2 id={`game-${game.id}`} className="display-s">{game.name}</h2>
                  {todays[game.id] !== undefined ? (
                    <span className="amount-sm pk-faint">Today {todays[game.id]}</span>
                  ) : bests[game.id] ? (
                    <span className="amount-sm pk-faint">Best {bests[game.id]}</span>
                  ) : null}
                </span>
                <span className="body-sm pk-muted">{game.line}</span>
                {/* Play covers the whole card, so the drawing is a target too; Practice sits above it. */}
                <span className="pk-gamecard__go">
                  <Button label="Play" icon="ball" tone="sprout" size="sm" className="pk-gamecard__play" aria-label={`Play ${game.name}, today's round`} onClick={() => onPlay(game.id, true)} />
                  <Button label="Practice" tone="ghost" size="sm" className="pk-gamecard__practice" aria-label={`Practise ${game.name}, a new round`} onClick={() => onPlay(game.id, false)} />
                </span>
              </span>
          </article>
        ))}
      </div>
      <p className="caption pk-faint">
        Play is today&apos;s round — the same one for everyone today, so a score is worth sharing. Practice is a new
        round every time.
      </p>
    </Stack>
  );
}

function Result({
  pet,
  outcome,
  name,
  unit,
  bestScore,
  day,
  sender,
  onRecord,
  onAgain,
  onPractice,
  onOther,
}: {
  pet: GuestPet;
  outcome: Outcome;
  name: string;
  unit: (score: number) => string;
  bestScore?: number;
  day: string;
  sender: PawketSender;
  onRecord: () => void;
  onAgain: () => void;
  onPractice: () => void;
  onOther: () => void;
}) {
  const { Here } = useHere();
  const recorded = sender.tx.stage === "confirmed";
  // A round ends where it was played; on a phone the score is below it, so
  // it comes up to meet the player rather than waiting to be found.
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "instant" : "smooth" });
  }, []);
  const line = outcome.onChain
    ? recorded
      ? outcome.xpGained > 0
        ? `Recorded. +${outcome.xpGained} XP for playing today, kept on Solana.`
        : "Recorded on Solana. Today's play bonus was already kept."
      : outcome.xpGained > 0
        ? `Record it on Solana to keep +${outcome.xpGained} XP for playing today.`
        : "Today's bonus is already kept; recording counts the round."
    : outcome.saved
      ? outcome.xpGained > 0
        ? `+${outcome.xpGained} XP for playing today.`
        : "You already earned today's play bonus."
      : `Finished, but ${Here.toLowerCase()} did not store the bonus.`;


  return (
    <div ref={card} className="pk-result">
    <Card>
      <Stack gap={4}>
        <div>
          <Row gap={2} wrap>
            <Chip label="Round finished" tone="pool" icon="check" />
            {outcome.best ? <Chip label="Your best" tone="sun" icon="star" /> : null}
            {outcome.daily && outcome.dailyBest && !outcome.best ? <Chip label="Today's best" icon="star" /> : null}
          </Row>
          <p className="display-m" style={{ marginTop: "var(--space-3)" }} aria-live="polite">
            {unit(outcome.score)}
          </p>
          <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
            {line} {bestScore != null && !outcome.best ? `Your best here is ${bestScore}.` : ""}
          </p>
        </div>
        {/* The one thing to do next across the width; the rest beneath it, side by side. */}
        <div className="pk-result__acts">
          {outcome.onChain && !recorded ? (
            <Button label="Record the round" icon="spark" tone="sun" full disabled={sender.busy} onClick={onRecord} />
          ) : null}
          <Button label="Play again" icon="ball" tone={outcome.onChain && !recorded ? "quiet" : "sprout"} full disabled={sender.busy} onClick={outcome.daily ? onAgain : onPractice} />
          <div className="pk-result__more">
            {outcome.daily ? (
              <ShareButton name={`${pet.name} and I`} label="Share the score" full url={new URL("/playground", getPublicEnv().appUrl).toString()} text={`${pet.name} and I played today's ${name} in Pawket (${day}): ${unit(outcome.score)}. Same round for everyone today.`} />
            ) : null}
            <Button label="Another game" tone="quiet" full disabled={sender.busy} onClick={onOther} />
          </div>
          <ButtonLink label="Back home" href="/home" tone="ghost" icon="home" size="sm" className="pk-btn--flush" />
        </div>

      </Stack>
    </Card>
    </div>
  );
}
