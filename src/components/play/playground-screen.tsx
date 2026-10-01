"use client";

import { useMemo, useState } from "react";
import {
  Banner,
  Button,
  ButtonLink,
  Chip,
  Columns,
  EmptyState,
  PetArt,
  Row,
  Screen,
  ScreenBar,
  Stack,
} from "@/components/pk";
import { TxReceipt } from "@/components/wallet/tx-receipt";
import { getPublicEnv } from "@/config/env";
import { DAILY_GOAL_REWARD_XP } from "@/lib/game/constants";
import { petLook } from "@/lib/game/appearance";
import { findWearable } from "@/lib/closet/catalog";
import { useCompanion } from "@/lib/companion/use-companion";
import { recordPlay, utcDay, type GuestPet } from "@/lib/guest/pet";
import { readGuestPetSnapshot, saveGuestPet } from "@/lib/guest/storage";
import { getFinishRoundInstruction } from "@/lib/solana/instructions";
import { usePawketSend, type PawketSender } from "@/lib/solana/use-send";
import { GATE_COUNT, gatePattern, scoreGates, type Gate } from "@/lib/play/gates";

type Phase = "ready" | "look" | "run" | "done";

/** A finished round: the score, and — for a pet in this browser — what was saved. */
type Outcome = { score: number; xpGained: number; saved: boolean; onChain: boolean };

/**
 * One solo round. The player watches five gates, then runs them back.
 * Finishing grants the daily XP bonus once. The score changes nothing else.
 * A pet in this browser keeps the round at once; a pet on Solana keeps it
 * when the player records it — a send is never made for them.
 */
export function PlaygroundScreen() {
  const { ready, pet, active, refresh } = useCompanion();
  const sender = usePawketSend();
  const [seed, setSeed] = useState(() => Math.random().toString(36).slice(2));
  const [phase, setPhase] = useState<Phase>("ready");
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<Gate[]>([]);
  const [outcome, setOutcome] = useState<Outcome>();
  const pattern = useMemo(() => gatePattern(seed), [seed]);

  function begin() {
    setCursor(0);
    setAnswers([]);
    setOutcome(undefined);
    setPhase("look");
  }

  function again() {
    sender.reset();
    setSeed(Math.random().toString(36).slice(2));
    setCursor(0);
    setAnswers([]);
    setOutcome(undefined);
    setPhase("look");
  }

  function answer(gate: Gate) {
    const next = [...answers, gate];
    setAnswers(next);
    if (next.length < pattern.length) return;
    const score = scoreGates(pattern, next);
    if (active && pet) {
      // Kept on Solana only when the player records it; the bonus is the program's call.
      setOutcome({ score, xpGained: recordPlay(pet, new Date()).xpGained, saved: false, onChain: true });
      setPhase("done");
      return;
    }
    const current = readGuestPetSnapshot();
    if (!current) {
      setOutcome({ score, xpGained: 0, saved: false, onChain: false });
      setPhase("done");
      return;
    }
    const result = recordPlay(current, new Date());
    const saved = saveGuestPet(result.pet);
    setOutcome({ score, xpGained: result.xpGained, saved, onChain: false });
    setPhase("done");
  }

  async function recordRound() {
    if (!active || !pet) return;
    const result = await sender.send(`Finish a round with ${pet.name}`, ({ owner }) => [
      getFinishRoundInstruction({ owner, pet: active.pet.address, passport: active.passport.address }),
    ]);
    if (result) refresh();
  }

  return (
    <Screen>
      <ScreenBar>
        <h1 className="display-l">Playground</h1>
        {pet ? <Chip label={pet.name} tone="pool" icon="paw" /> : null}
      </ScreenBar>

      {!ready ? <p className="body-sm pk-faint">Opening the playground.</p> : null}

      {ready && !pet ? (
        <EmptyState
          icon="ball"
          title="The gates are quiet"
          body="A round needs a pet. Adopting takes three taps, and the daily bonus is kept with them."
          action={<ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />}
        />
      ) : null}

      {ready && pet ? (
        <Columns
          first={
            <Round
              pet={pet}
              phase={phase}
              pattern={pattern}
              cursor={cursor}
              answers={answers}
              outcome={outcome}
              onBegin={begin}
              onAdvance={() => {
                if (cursor >= pattern.length - 1) {
                  setPhase("run");
                  return;
                }
                setCursor(cursor + 1);
              }}
              onReplayLook={() => setCursor(0)}
              onAnswer={answer}
              onAgain={again}
              sender={sender}
              onRecord={() => void recordRound()}
            />
          }
          second={
            <Banner
              tone="info"
              title="Nothing here can be bought"
              body={`Finishing a round once a day adds ${DAILY_GOAL_REWARD_XP} XP. The score is yours. Clothes, mood and vitals do not change it, and it does not change them.`}
            />
          }
        />
      ) : null}
    </Screen>
  );
}

function Round({
  pet,
  phase,
  pattern,
  cursor,
  answers,
  outcome,
  onBegin,
  onAdvance,
  onReplayLook,
  onAnswer,
  onAgain,
  sender,
  onRecord,
}: {
  pet: GuestPet;
  phase: Phase;
  pattern: Gate[];
  cursor: number;
  answers: Gate[];
  outcome?: Outcome;
  onBegin: () => void;
  onAdvance: () => void;
  onReplayLook: () => void;
  onAnswer: (gate: Gate) => void;
  onAgain: () => void;
  sender: PawketSender;
  onRecord: () => void;
}) {
  const recorded = sender.tx.stage === "confirmed";
  const worn = findWearable(pet.wearing);
  const claimed = pet.lastDailyPlayDay === utcDay(new Date());
  const gate = phase === "look" ? pattern[cursor] : undefined;
  const heading =
    phase === "ready"
      ? `${pet.name} is ready`
      : phase === "look"
        ? gate === "left"
          ? "Left"
          : "Right"
        : phase === "run"
          ? "Which way?"
          : `Matched ${outcome?.score ?? 0} of ${GATE_COUNT}`;

  return (
    <Stack gap={4}>
      <div className="pk-field-of-play">
        <div className="pk-field-of-play__ground" />
        <div className="pk-field-of-play__racer" style={{ left: "34%", width: "32cqh" }}>
          <PetArt {...petLook(pet)} />
        </div>
        <span className="pk-sr">
          {pet.name} waiting at the gates{worn ? `, wearing ${worn.name}` : ""}.
        </span>
      </div>

      <div>
        <h2 className="display-m" aria-live="polite" style={{ overflowWrap: "anywhere" }}>
          {heading}
        </h2>
        <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
          {phase === "ready"
            ? claimed
              ? "Today's bonus is already kept. You can still run the gates."
              : `Watch ${GATE_COUNT} gates, then run them back. Finishing keeps today's bonus.`
            : phase === "look"
              ? `Gate ${cursor + 1} of ${GATE_COUNT}. Remember it, then the next.`
              : phase === "run"
                ? `Gate ${answers.length + 1} of ${GATE_COUNT}.`
                : outcome?.onChain
                  ? recorded
                    ? outcome.xpGained > 0
                      ? `Recorded. +${outcome.xpGained} XP for playing today, kept on Solana.`
                      : "Recorded on Solana. Today's play bonus was already kept."
                    : outcome.xpGained > 0
                      ? `Finished. Record it on Solana to keep +${outcome.xpGained} XP for playing today.`
                      : "Finished. Today's bonus is already kept; recording counts the round."
                  : outcome?.saved
                    ? outcome.xpGained > 0
                      ? `Finished. +${outcome.xpGained} XP for playing today.`
                      : "Finished. You already earned today's play bonus."
                    : "Finished, but this browser did not store the bonus."}
        </p>
      </div>

      {phase === "ready" ? (
        <Button label="Start the round" icon="ball" tone="pool" onClick={onBegin} />
      ) : null}

      {phase === "look" ? (
        <Row gap={2} wrap>
          <Button
            label={cursor >= pattern.length - 1 ? "Run them" : "Next gate"}
            onClick={onAdvance}
          />
          {cursor > 0 ? (
            <Button label="See them again" tone="ghost" onClick={onReplayLook} />
          ) : null}
        </Row>
      ) : null}

      {phase === "run" ? (
        <Row gap={2} wrap>
          <Button label="Left" icon="left" tone="quiet" onClick={() => onAnswer("left")} />
          <Button label="Right" icon="right" tone="quiet" onClick={() => onAnswer("right")} />
        </Row>
      ) : null}

      {phase === "done" && outcome?.onChain && !recorded ? (
        <div>
          <Button
            label="Record the round"
            icon="spark"
            tone="sun"
            disabled={sender.busy}
            onClick={onRecord}
          />
        </div>
      ) : null}

      {phase === "done" && outcome?.onChain ? <TxReceipt tx={sender.tx} cluster={getPublicEnv().solanaCluster} /> : null}

      {phase === "done" ? (
        <Row gap={2} wrap>
          <Button label="Run them again" icon="ball" tone="pool" disabled={sender.busy} onClick={onAgain} />
          <ButtonLink label="Back to the room" href="/home" tone="quiet" icon="home" />
        </Row>
      ) : null}
    </Stack>
  );
}
