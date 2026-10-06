"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { PetArt, type PetForm, type Temper } from "@/components/pk";
import { HOP, hopScore, metres, startHop, stepHop, type HopState } from "@/lib/play/hop";
import { blip } from "@/lib/play/sound";
import { Heart, Obstacle } from "./game-art";
import { useFrame } from "./use-frame";

/** Where the path is, from the top of the field. */
const GROUND = 0.8;

/**
 * Hop, drawn: the park path running right to left under the pet, hills and
 * clouds slower behind it. A tap, a click, Space or the up arrow is a jump.
 */
export function HopGame({
  form,
  temper,
  wearing,
  seed,
  paused = false,
  onFinish,
}: {
  form: PetForm;
  temper: Temper;
  wearing: string | null;
  seed: number;
  paused?: boolean;
  onFinish: (score: number) => void;
}) {
  const [state, setState] = useState<HopState>(() => startHop(seed));
  const [running, setRunning] = useState(false);
  const live = useRef(state);
  const wantsJump = useRef(false);
  const finished = useRef(false);

  useFrame(running && !paused, (dt) => {
    const next = stepHop(live.current, dt, wantsJump.current);
    wantsJump.current = false;
    live.current = next;
    for (const event of next.events) {
      if (event === "jump") blip(520, 80);
      else if (event === "heart") blip(880, 90);
      else blip(160, 220, "square", 0.04);
    }
    setState(next);
  });

  useEffect(() => {
    if (state.over && !finished.current) {
      finished.current = true;
      setRunning(false);
      onFinish(hopScore(state));
    }
  }, [state, onFinish]);

  function jump() {
    if (state.over || paused) return;
    if (!running) setRunning(true);
    wantsJump.current = true;
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === " " || event.key === "ArrowUp" || event.key === "Enter") {
      event.preventDefault();
      jump();
    }
  }

  const airborne = state.y > 0;
  const face = state.over ? "lonely" : airborne ? "radiant" : "happy";

  return (
    <div
      className="pk-game pk-game--hop"
      tabIndex={0}
      role="application"
      aria-label={`Hop. Tap, Space or the up arrow jumps. ${metres(state.run)} metres so far.`}
      onPointerDown={jump}
      onKeyDown={onKey}
    >
      <div className="pk-game__sky" />
      <div className="pk-game__hills" style={{ "--pk-hills": `${-state.run * 18}%` } as CSSProperties} />
      <div className="pk-game__cloud" style={{ left: `${110 - ((state.run * 9) % 140)}%`, top: "14%" }} />
      <div className="pk-game__cloud pk-game__cloud--far" style={{ left: `${120 - ((state.run * 5 + 60) % 150)}%`, top: "26%" }} />
      <div className="pk-game__path" style={{ backgroundPositionX: `${-state.run * 100}cqw` }} />

      {state.obstacles.map((o) => (
        <div
          key={o.id}
          className="pk-game__thing"
          style={{ left: `${o.x * 100}%`, width: `${o.w * 100}%`, height: `${o.h * 100}%`, bottom: `${(1 - GROUND) * 100 - (o.kind === "puddle" ? 1 : 0)}%` }}
        >
          <Obstacle kind={o.kind} />
        </div>
      ))}
      {state.hearts.map((h) => (
        <div key={h.id} className="pk-game__heart" style={{ left: `${h.x * 100}%`, bottom: `${((1 - GROUND) + h.y) * 100}%` }}>
          <Heart />
        </div>
      ))}

      <div
        className={["pk-game__runner", airborne ? "pk-game__runner--air" : running ? "pk-game__runner--run" : ""].join(" ")}
        style={{ left: `${HOP.petX * 100}%`, bottom: `${((1 - GROUND) + state.y) * 100 - 1.5}%` }}
      >
        <PetArt form={form} temper={temper} feeling={face} wearing={wearing} pose="full" still />
      </div>

      <div className="pk-game__hud" aria-hidden="true">
        <span className="pk-game__score">{metres(state.run)} m</span>
        <span className="pk-game__lives">
          <span>
            <Heart />
          </span>
          <span className="amount-sm">{state.collected}</span>
        </span>
        <span className="pk-game__time">{(state.speed / HOP.startSpeed).toFixed(1)}×</span>
      </div>

      {!running && !state.over ? (
        <div className="pk-game__start">
          <p className="title">Jump the path</p>
          <p className="body-sm pk-muted">Tap, click, Space or the up arrow to hop. It gets quicker the further you go. Hearts are five metres each.</p>
          <span className="pk-pill">Tap to start</span>
        </div>
      ) : null}
    </div>
  );
}
