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
import { DAILY_GOAL_REWARD_XP } from "@/lib/game/constants";
import { SPECIES_ART } from "@/lib/game/appearance";
import { findWearable } from "@/lib/closet/catalog";
import { recordPlay, utcDay, type GuestPet } from "@/lib/guest/pet";
import { useGuestPet } from "@/lib/guest/use-guest-pet";
import { readGuestPetSnapshot, saveGuestPet } from "@/lib/guest/storage";
import { GATE_COUNT, gatePattern, scoreGates, type Gate } from "@/lib/play/gates";

type Phase = "ready" | "look" | "run" | "done";

/**
 * One solo round. The player watches five gates, then runs them back.
 * Finishing grants the daily XP bonus once. The score changes nothing else.
 */
export function PlaygroundScreen() {
  const { ready, pet } = useGuestPet();
  const [seed, setSeed] = useState(() => Math.random().toString(36).slice(2));
  const [phase, setPhase] = useState<Phase>("ready");
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<Gate[]>([]);
  const [outcome, setOutcome] = useState<{ score: number; xpGained: number; saved: boolean }>();
  const pattern = useMemo(() => gatePattern(seed), [seed]);

  function begin() {
    setCursor(0);
    setAnswers([]);
    setOutcome(undefined);
    setPhase("look");
  }

  function again() {
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
    const current = readGuestPetSnapshot();
    if (!current) {
      setOutcome({ score: scoreGates(pattern, next), xpGained: 0, saved: false });
      setPhase("done");
      return;
    }
    const result = recordPlay(current, new Date());
    const saved = saveGuestPet(result.pet);
    setOutcome({ score: scoreGates(pattern, next), xpGained: result.xpGained, saved });
    setPhase("done");
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
}: {
  pet: GuestPet;
  phase: Phase;
  pattern: Gate[];
  cursor: number;
  answers: Gate[];
  outcome?: { score: number; xpGained: number; saved: boolean };
  onBegin: () => void;
  onAdvance: () => void;
  onReplayLook: () => void;
  onAnswer: (gate: Gate) => void;
  onAgain: () => void;
}) {
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
          <PetArt form={SPECIES_ART[pet.species]} />
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

      {phase === "done" ? (
        <Row gap={2} wrap>
          <Button label="Run them again" icon="ball" tone="pool" onClick={onAgain} />
          <ButtonLink label="Back to the room" href="/home" tone="quiet" icon="home" />
        </Row>
      ) : null}
    </Stack>
  );
}
