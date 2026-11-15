"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Address } from "@solana/kit";
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  PawGlyph,
  PetArt,
  Problem,
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
import type { OwnedPetsRefresh } from "@/lib/companion/use-companion";
import type { PetOnChain } from "@/lib/solana/accounts";
import type { SendResult } from "@/lib/solana/send";
import { recordPlay, utcDay, type GuestPet } from "@/lib/guest/pet";
import { dayTurnsAt } from "@/lib/utils/format";
import { useMounted } from "@/lib/utils/use-mounted";
import { record } from "@/lib/analytics/events";
import { readPet, savePet } from "@/lib/guest/storage";
import { getFinishRoundInstruction } from "@/lib/solana/instructions";
import { usePawketSend, type PawketSender } from "@/lib/solana/use-send";
import { dailySeed, keepBest, keepDaily, readBest, readDaily, type GameId } from "@/lib/play/best";
import { useSound } from "@/lib/play/sound";
import { useHere } from "@/lib/native/android";
import { Obstacle, RainCloud, Star, Treat } from "./game-art";

const CatchGame = dynamic(() => import("./catch-game").then((game) => game.CatchGame), { loading: () => <Waiting label="Opening Catch" /> });
const CopyGame = dynamic(() => import("./copy-game").then((game) => game.CopyGame), { loading: () => <Waiting label="Opening Copy" /> });
const HopGame = dynamic(() => import("./hop-game").then((game) => game.HopGame), { loading: () => <Waiting label="Opening Hop" /> });
const PairsGame = dynamic(() => import("./pairs-game").then((game) => game.PairsGame), { loading: () => <Waiting label="Opening Pairs" /> });

const GAMES: Array<{ id: GameId; name: string; line: string; unit: (score: number) => string }> = [
  { id: "catch", name: "Catch", line: "Treats fall. Move to catch them, and keep clear of the storm clouds.", unit: (n) => `${n} caught` },
  { id: "hop", name: "Hop", line: "Run the park path and jump what is in the way. It gets quicker.", unit: (n) => `${n} points` },
  { id: "copy", name: "Copy", line: "Your pet taps a pattern on a giant paw. Tap it back, one longer each time.", unit: (n) => `${n} copied` },
  { id: "pairs", name: "Pairs", line: "Twelve cards, six pairs from the wardrobe. Find them all, missing as little as you can.", unit: (n) => `${n} points` },
];

type Outcome = {
  game: GameId;
  score: number;
  best: boolean;
  daily: boolean;
  dailyBest: boolean;
  scoresSaved: boolean;
  xpGained: number;
  saved: boolean;
  onChain: boolean;
  completedAt: Date;
};

type RoundPet = { pet: GuestPet; chain: PetOnChain | null; owner: Address | null };

const noop = () => () => {};
const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

export function PlaygroundScreen() {
  const companion = useCompanion();
  const { ready, refresh } = companion;
  const sender = usePawketSend();
  const [chosen, setChosen] = useState<string | null>(null);
  const [game, setGame] = useState<GameId | null>(null);
  const [daily, setDaily] = useState(true);
  const [round, setRound] = useState(randomSeed);
  const [day, setDay] = useState(() => utcDay(new Date()));
  const [outcome, setOutcome] = useState<Outcome>();
  const [playing, setPlaying] = useState<RoundPet>();
  const [paused, setPaused] = useState(false);
  const [reloadingPets, setReloadingPets] = useState(false);
  const field = useRef<HTMLDivElement>(null);
  const [sound, setSound] = useSound();
  const mounted = useMounted();
  const today = utcDay(new Date());
  const stored = useSyncExternalStore(noop, () => JSON.stringify([readBest(), readDaily(today)]), () => "[{},{}]");
  const [bests, todays] = JSON.parse(stored) as [Partial<Record<GameId, number>>, Partial<Record<GameId, number>>];

  const selected = companion.all.find((p) => p.id === chosen) ?? companion.pet;
  const pet = game && playing ? playing.pet : selected;
  const chain = game && playing ? playing.chain : companion.owned.find((entry) => entry.pet.address === pet?.id) ?? null;
  const seed = game && daily ? dailySeed(game, day) : round;

  function play(id: GameId, asDaily = daily) {
    if (!pet || sender.busy || sender.tx.stage === "unknown") return;
    sender.reset();
    const nextPet = companion.all.find((record) => record.id === pet.id) ?? pet;
    const nextChain = companion.owned.find((entry) => entry.pet.address === pet.id) ?? chain;
    setPlaying({ pet: nextPet, chain: nextChain, owner: nextChain?.pet.owner ?? companion.owner });
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
      const completedAt = new Date();
      const base = {
        game, score, best: isBest === true, daily, dailyBest: dailyBest === true,
        scoresSaved: isBest !== null && dailyBest !== null, completedAt,
      };
      if (chain) {
        setOutcome({ ...base, xpGained: recordPlay(pet, completedAt).xpGained, saved: false, onChain: true });
        return;
      }
      const current = readPet(pet.id);
      if (!current) {
        setOutcome({ ...base, xpGained: 0, saved: false, onChain: false });
        return;
      }
      const result = recordPlay(current, completedAt);
      const saved = savePet(result.pet);
      if (saved) record({ name: "round_finished", where: "browser", game });
      setOutcome({ ...base, xpGained: result.xpGained, saved, onChain: false });
    },
    [game, pet, chain, daily, day],
  );

  async function recordRound(): Promise<SendResult | null> {
    if (!chain || !pet || !playing || companion.owner !== playing.owner) return null;
    const result = await sender.act(`Finish a round with ${pet.name}`, ({ owner }) => {
      if (owner.address !== playing.owner) throw new Error("Reconnect the wallet that started this round. Nothing was sent.");
      return [getFinishRoundInstruction({ owner, pet: chain.pet.address, passport: chain.passport.address })];
    });
    if (result?.outcome === "confirmed" && game) record({ name: "round_finished", where: "solana", game });
    return result;
  }

  function retryLocalRound() {
    if (!outcome || outcome.onChain || outcome.saved || !pet) return;
    const current = readPet(pet.id);
    if (!current) return;
    // Recover this completion, not another round. Later care and daily progress
    // remain authoritative when storage becomes available again.
    const laterDay = current.lastDailyPlayDay && current.lastDailyPlayDay > utcDay(outcome.completedAt);
    const result = recordPlay(current, laterDay ? new Date(current.lastDailyPlayDay!) : outcome.completedAt);
    const saved = savePet({
      ...result.pet,
      modifiedAt: new Date(Math.max(Date.now(), Date.parse(current.modifiedAt ?? current.statsUpdatedAt))).toISOString(),
      streak: current.streak.lastDay && current.streak.lastDay > utcDay(outcome.completedAt) ? current.streak : result.pet.streak,
    });
    if (saved) record({ name: "round_finished", where: "browser", game: outcome.game });
    setOutcome({ ...outcome, saved, xpGained: result.xpGained });
  }

  function retryScores() {
    if (!outcome) return;
    const best = keepBest(outcome.game, outcome.score);
    const dailyBest = outcome.daily ? keepDaily(outcome.game, day, outcome.score) : false;
    setOutcome({ ...outcome, best: outcome.best || best === true, dailyBest: outcome.dailyBest || dailyBest === true, scoresSaved: best !== null && dailyBest !== null });
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
            label="Sound"
            icon="music"
            tone="ghost"
            size="sm"
            className="pk-btn--flush pk-btn--toggle"
            aria-pressed={sound}
            onClick={() => setSound(!sound)}
          />
          {pet ? <Chip label={pet.name} tone="pool" icon="paw" /> : null}
        </Row>
      </ScreenBar>

      {!ready ? <Waiting label="Opening the playground" /> : null}
      {companion.chainError ? <Banner tone="wait" title="Solana did not answer" body="The pets on Solana are unchanged, but this read may be behind. You can still play with the pets saved on this device." action={<Button label="Reload pets" tone="quiet" size="sm" disabled={reloadingPets} onClick={async () => {
        setReloadingPets(true);
        try { await refresh(); } finally { setReloadingPets(false); }
      }} />} /> : null}

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
                <Button label="All games" tone="ghost" size="sm" icon="left" className="pk-btn--flush" disabled={sender.busy || sender.tx.stage === "unknown"} onClick={() => setGame(null)} />
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
                key={round}
                pet={pet}
                chain={chain}
                owner={companion.owner}
                roundOwner={playing?.owner ?? null}
                refresh={refresh}
                outcome={outcome}
                name={current.name}
                unit={current.unit}
                bestScore={bests[current.id]}
                day={day}
                sender={sender}
                onRecord={recordRound}
                onRetryLocal={retryLocalRound}
                onRetryScores={retryScores}
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
  chain,
  owner,
  roundOwner,
  refresh,
  outcome,
  name,
  unit,
  bestScore,
  day,
  sender,
  onRecord,
  onRetryLocal,
  onRetryScores,
  onAgain,
  onPractice,
  onOther,
}: {
  pet: GuestPet;
  chain: PetOnChain | null;
  owner: Address | null;
  roundOwner: Address | null;
  refresh: (signal?: AbortSignal) => Promise<OwnedPetsRefresh>;
  outcome: Outcome;
  name: string;
  unit: (score: number) => string;
  bestScore?: number;
  day: string;
  sender: PawketSender;
  onRecord: () => Promise<SendResult | null>;
  onRetryLocal: () => void;
  onRetryScores: () => void;
  onAgain: () => void;
  onPractice: () => void;
  onOther: () => void;
}) {
  const { Here } = useHere();
  const [receipt, setReceipt] = useState<{ stage: "unrecorded" | "sending" | "unknown" | "reading" | "retry" | "recorded"; signature?: string; xp: number }>({ stage: "unrecorded", xp: 0 });
  const read = useRef<AbortController | null>(null);
  const live = useRef(false);
  const currentOwner = useRef(owner);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; read.current?.abort(); };
  }, []);
  useEffect(() => {
    currentOwner.current = owner;
    return () => { read.current?.abort(); };
  }, [owner]);
  const reload = useCallback(async (signature: string) => {
    if (!chain || owner !== roundOwner || currentOwner.current !== roundOwner || read.current) return;
    const controller = new AbortController();
    read.current = controller;
    try {
      const result = await refresh(controller.signal);
      if (!live.current || controller.signal.aborted || currentOwner.current !== roundOwner) return;
      const after = result.status === "success" && result.owner === roundOwner
        ? result.pets.find((entry) => entry.pet.address === chain.pet.address && entry.pet.owner === roundOwner &&
          entry.passport.pet === chain.pet.address && entry.passport.owner === roundOwner &&
          entry.passport.plays > chain.passport.plays && entry.pet.xp >= chain.pet.xp) : undefined;
      if (after) {
        const bonus = after.passport.lastPlayDay > chain.passport.lastPlayDay && after.pet.xp >= chain.pet.xp + DAILY_GOAL_REWARD_XP;
        setReceipt({ stage: "recorded", signature, xp: bonus ? DAILY_GOAL_REWARD_XP : 0 });
      } else setReceipt({ stage: "retry", signature, xp: 0 });
    } catch {
      if (live.current && !controller.signal.aborted) setReceipt({ stage: "retry", signature, xp: 0 });
    } finally {
      if (read.current === controller) read.current = null;
      if (live.current && controller.signal.aborted) setReceipt({ stage: "retry", signature, xp: 0 });
    }
  }, [chain, owner, roundOwner, refresh]);
  useEffect(() => {
    if (receipt.stage !== "unknown" || sender.tx.signature !== receipt.signature) return;
    let cancelled = false;
    // Late settlement arrives outside this round's click handler. Reconcile it
    // asynchronously, with cleanup preventing work for a changed wallet/page.
    queueMicrotask(() => {
      if (!cancelled && sender.tx.stage === "confirmed" && receipt.signature) void reload(receipt.signature);
    });
    return () => { cancelled = true; };
  }, [receipt.stage, receipt.signature, sender.tx.stage, sender.tx.signature, reload]);
  const failed = receipt.stage === "unknown" && sender.tx.signature === receipt.signature && sender.tx.stage === "failed";
  async function record() {
    if ((receipt.stage !== "unrecorded" && !failed) || owner !== roundOwner) return;
    setReceipt({ stage: "sending", xp: 0 });
    const result = await onRecord();
    if (!live.current) return;
    if (!result) return setReceipt({ stage: "unrecorded", xp: 0 });
    const canRead = result.outcome === "confirmed" && currentOwner.current === roundOwner;
    setReceipt({ stage: canRead ? "reading" : result.outcome === "confirmed" ? "retry" : "unknown", signature: result.signature, xp: 0 });
    if (canRead) await reload(result.signature);
  }
  const recorded = receipt.stage === "recorded";
  const pending = receipt.stage !== "unrecorded" && !recorded && !failed;
  const busy = sender.busy || receipt.stage === "sending" || receipt.stage === "reading" || (receipt.stage === "unknown" && !failed);
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "instant" : "smooth" });
  }, []);
  const line = outcome.onChain
    ? recorded
      ? receipt.xp > 0
        ? `Recorded. +${receipt.xp} XP for playing today, kept on Solana.`
        : "Recorded on Solana. Today's play bonus was already kept."
      : pending
        ? "The round's receipt is kept. The bonus appears after confirmation and a fresh pet and Passport read."
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
          {!outcome.scoresSaved ? <Problem small>{Here} could not store all of your best scores.</Problem> : null}
          {!outcome.onChain && !outcome.saved ? <Problem small>The round is still here. Free some storage, then retry saving it without playing again.</Problem> : null}
          {outcome.onChain && owner !== roundOwner ? <Problem small>Reconnect the wallet that started this round to record it or read its result.</Problem> : null}
        </div>
        {pending ? <Banner tone="wait" title={receipt.stage === "sending" ? "Recording the round" : receipt.stage === "unknown" ? "Checking round receipt" : "Round confirmed; record pending"} body={receipt.stage === "sending" ? "Preparing this round's transaction. Nothing is recorded until Solana confirms it." : receipt.stage === "unknown" ? "Solana has not confirmed this receipt yet. Do not record it again while its outcome is unknown." : "Waiting for the updated pet and Passport. Reloading only reads the record; it never sends another transaction."} action={receipt.stage === "retry" && receipt.signature ? <Button label="Reload round record" tone="quiet" size="sm" disabled={owner !== roundOwner} onClick={() => { setReceipt({ ...receipt, stage: "reading" }); void reload(receipt.signature!); }} /> : undefined} /> : null}
        <div className="pk-result__acts">
          {outcome.onChain && (receipt.stage === "unrecorded" || failed) ? (
            <Button label="Record the round" icon="spark" tone="sun" full disabled={busy || owner !== roundOwner} onClick={() => void record()} />
          ) : null}
          {!outcome.onChain && !outcome.saved ? <Button label="Retry saving round" icon="check" tone="sun" full onClick={onRetryLocal} /> : null}
          {!outcome.scoresSaved ? <Button label="Retry saving scores" tone="quiet" full onClick={onRetryScores} /> : null}
          <Button label="Play again" icon="ball" tone={outcome.onChain && !recorded ? "quiet" : "sprout"} full disabled={busy || (outcome.onChain && owner !== roundOwner)} onClick={outcome.daily ? onAgain : onPractice} />
          <div className="pk-result__more">
            {outcome.daily ? (
              <ShareButton name={`${pet.name} and I`} label="Share the score" full url={new URL("/playground", getPublicEnv().appUrl).toString()} text={`${pet.name} and I played today's ${name} in Pawket (${day}): ${unit(outcome.score)}. Same round for everyone today.`} />
            ) : null}
            <Button label="Another game" tone="quiet" full disabled={busy} onClick={onOther} />
          </div>
          <ButtonLink label="Back home" href="/home" tone="ghost" icon="home" size="sm" className="pk-btn--flush" />
        </div>

      </Stack>
    </Card>
    </div>
  );
}
