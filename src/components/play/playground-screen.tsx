"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  PetArt,
  Row,
  Screen,
  ScreenBar,
  Stack,
  Waiting,
} from "@/components/pk";
import { TxReceipt } from "@/components/wallet/tx-receipt";
import { getPublicEnv } from "@/config/env";
import { DAILY_GOAL_REWARD_XP } from "@/lib/game/constants";
import { SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { useCompanion } from "@/lib/companion/use-companion";
import { recordPlay, utcDay, type GuestPet } from "@/lib/guest/pet";
import { readGuestPetSnapshot, saveGuestPet } from "@/lib/guest/storage";
import { getFinishRoundInstruction } from "@/lib/solana/instructions";
import { usePawketSend, type PawketSender } from "@/lib/solana/use-send";
import { keepBest, readBest, type GameId } from "@/lib/play/best";
import { useSound } from "@/lib/play/sound";
import { CatchGame } from "./catch-game";
import { CopyGame } from "./copy-game";
import { HopGame } from "./hop-game";
import { Obstacle, RainCloud, Star, Treat } from "./game-art";

const GAMES: Array<{ id: GameId; name: string; line: string; unit: (score: number) => string }> = [
  { id: "catch", name: "Catch", line: "Treats fall. Move to catch them, and keep clear of the storm clouds.", unit: (n) => `${n} caught` },
  { id: "hop", name: "Hop", line: "Run the park path and jump what is in the way. It gets quicker.", unit: (n) => `${n} points` },
  { id: "copy", name: "Copy", line: "Your pet taps a pattern on a giant paw. Tap it back, one longer each time.", unit: (n) => `${n} copied` },
];

/** A finished round: the score, and — for a pet in this browser — what was saved. */
type Outcome = { game: GameId; score: number; best: boolean; xpGained: number; saved: boolean; onChain: boolean };

const noop = () => () => {};

/**
 * Three games, each one round. Finishing any of them is the day's round:
 * the first of a UTC day adds the daily XP, once. The score is the
 * player's; nothing about the pet changes it, and it changes nothing about
 * the pet. A pet in this browser keeps the round at once; a pet on Solana
 * keeps it when the player records it — a send is never made for them.
 */
export function PlaygroundScreen() {
  const { ready, pet, active, refresh } = useCompanion();
  const sender = usePawketSend();
  const [game, setGame] = useState<GameId | null>(null);
  const [round, setRound] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [outcome, setOutcome] = useState<Outcome>();
  const [sound, setSound] = useSound();
  const best = useSyncExternalStore(noop, () => JSON.stringify(readBest()), () => "{}");
  const bests = JSON.parse(best) as Partial<Record<GameId, number>>;

  function play(id: GameId) {
    sender.reset();
    setOutcome(undefined);
    setRound(Math.floor(Math.random() * 2 ** 31));
    setGame(id);
  }

  const finish = useCallback(
    (score: number) => {
      if (!game) return;
      const isBest = keepBest(game, score);
      if (active && pet) {
        // Kept on Solana only when the player records it; the bonus is the program's call.
        setOutcome({ game, score, best: isBest, xpGained: recordPlay(pet, new Date()).xpGained, saved: false, onChain: true });
        return;
      }
      const current = readGuestPetSnapshot();
      if (!current) {
        setOutcome({ game, score, best: isBest, xpGained: 0, saved: false, onChain: false });
        return;
      }
      const result = recordPlay(current, new Date());
      const saved = saveGuestPet(result.pet);
      setOutcome({ game, score, best: isBest, xpGained: result.xpGained, saved, onChain: false });
    },
    [game, active, pet],
  );

  async function recordRound() {
    if (!active || !pet) return;
    const result = await sender.send(`Finish a round with ${pet.name}`, ({ owner }) => [
      getFinishRoundInstruction({ owner, pet: active.pet.address, passport: active.passport.address }),
    ]);
    if (result) refresh();
  }

  const chosen = GAMES.find((g) => g.id === game);

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l">Playground</h1>
          <p className="caption pk-faint">Three games. Any one of them is today&apos;s round.</p>
        </div>
        <Row gap={2}>
          <Button
            label={sound ? "Sound on" : "Sound off"}
            icon="music"
            tone="ghost"
            size="sm"
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

      {ready && pet && !chosen ? <Picker pet={pet} bests={bests} onPlay={play} /> : null}

      {ready && pet && chosen ? (
        <Stack gap={4}>
          <div className="pk-spread">
            <div>
              <h2 className="display-m">{chosen.name}</h2>
              <p className="body-sm pk-muted">{chosen.line}</p>
            </div>
            <Button label="All games" tone="ghost" size="sm" icon="left" disabled={sender.busy} onClick={() => setGame(null)} />
          </div>
          <div className="pk-play">
            <div className="pk-play__field">
              <Field key={`${chosen.id}-${round}`} game={chosen.id} pet={pet} seed={round} onFinish={finish} />
            </div>
            {outcome ? (
              <Result
                pet={pet}
                outcome={outcome}
                unit={chosen.unit}
                bestScore={bests[chosen.id]}
                sender={sender}
                onRecord={() => void recordRound()}
                onAgain={() => play(chosen.id)}
                onOther={() => setGame(null)}
              />
            ) : (
              <Banner
                tone="info"
                title="Nothing here can be bought"
                body={`Finishing a round once a day adds ${DAILY_GOAL_REWARD_XP} XP. The score is yours: clothes, mood and vitals do not change it, and it does not change them.`}
              />
            )}
          </div>
        </Stack>
      ) : null}
    </Screen>
  );
}

function Field({ game, pet, seed, onFinish }: { game: GameId; pet: GuestPet; seed: number; onFinish: (score: number) => void }) {
  const { form, temper, wearing } = petLook(pet);
  if (game === "catch") return <CatchGame form={form} temper={temper} wearing={wearing} seed={seed} onFinish={onFinish} />;
  if (game === "hop") return <HopGame form={form} temper={temper} wearing={wearing} seed={seed} onFinish={onFinish} />;
  return <CopyGame form={form} temper={temper} wearing={wearing} sky={SPECIES_SKY[pet.species]} seed={seed} onFinish={onFinish} />;
}

/** The three games as cards, each drawn with the player's own pet in it. */
function Picker({ pet, bests, onPlay }: { pet: GuestPet; bests: Partial<Record<GameId, number>>; onPlay: (id: GameId) => void }) {
  const look = petLook(pet);
  const claimed = pet.lastDailyPlayDay === utcDay(new Date());
  return (
    <Stack gap={5}>
      <Banner
        tone={claimed ? "done" : "info"}
        title={claimed ? "Today's round is kept" : `Today's round is worth ${DAILY_GOAL_REWARD_XP} XP`}
        body={
          claimed
            ? `${pet.name} already has today's bonus. Play for the fun of it, or for your best.`
            : `Finish any game once today and ${pet.name} keeps the bonus. The score itself is only yours.`
        }
      />
      <div className="pk-games">
        {GAMES.map((game) => (
          <button key={game.id} type="button" className="pk-gamecard" onClick={() => onPlay(game.id)}>
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
              <span className="pk-gamecard__pet">
                <PetArt {...look} feeling={game.id === "hop" ? "radiant" : "happy"} pose="full" />
              </span>
            </span>
            <span className="pk-gamecard__words">
              <span className="pk-spread">
                <span className="display-s">{game.name}</span>
                {bests[game.id] ? <span className="amount-sm pk-faint">Best {bests[game.id]}</span> : null}
              </span>
              <span className="body-sm pk-muted">{game.line}</span>
            </span>
          </button>
        ))}
      </div>
    </Stack>
  );
}

function Result({
  pet,
  outcome,
  unit,
  bestScore,
  sender,
  onRecord,
  onAgain,
  onOther,
}: {
  pet: GuestPet;
  outcome: Outcome;
  unit: (score: number) => string;
  bestScore?: number;
  sender: PawketSender;
  onRecord: () => void;
  onAgain: () => void;
  onOther: () => void;
}) {
  const recorded = sender.tx.stage === "confirmed";
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
      : "Finished, but this browser did not store the bonus.";
  return (
    <Card>
      <Stack gap={4}>
        <div>
          <Row gap={2} wrap>
            <Chip label="Round finished" tone="pool" icon="check" />
            {outcome.best ? <Chip label="Your best" tone="sun" icon="star" /> : null}
          </Row>
          <p className="display-m" style={{ marginTop: "var(--space-3)" }} aria-live="polite">
            {unit(outcome.score)}
          </p>
          <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
            {line} {bestScore != null && !outcome.best ? `Your best here is ${bestScore}.` : ""}
          </p>
        </div>
        {outcome.onChain && !recorded ? (
          <div>
            <Button label="Record the round" icon="spark" tone="sun" disabled={sender.busy} onClick={onRecord} />
          </div>
        ) : null}
        {outcome.onChain ? <TxReceipt tx={sender.tx} cluster={getPublicEnv().solanaCluster} /> : null}
        <Row gap={2} wrap>
          <Button label="Play again" icon="ball" tone="pool" disabled={sender.busy} onClick={onAgain} />
          <Button label="Another game" tone="quiet" disabled={sender.busy} onClick={onOther} />
          <ButtonLink label={`Back to ${pet.name}`} href="/home" tone="ghost" icon="home" />
        </Row>
      </Stack>
    </Card>
  );
}
