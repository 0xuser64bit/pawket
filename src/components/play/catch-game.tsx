"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { PetArt, type PetForm, type Temper } from "@/components/pk";
import { CATCH_LIVES, CATCH_SECONDS, startCatch, stepCatch, type CatchState } from "@/lib/play/catch";
import { blip } from "@/lib/play/sound";
import { Heart, RainCloud, Star, Treat } from "./game-art";
import { useFrame } from "./use-frame";

export function CatchGame({
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
  const [state, setState] = useState<CatchState>(() => startCatch(seed));
  const [running, setRunning] = useState(false);
  const [mood, setMood] = useState<{ face: "happy" | "lonely" | "radiant"; until: number }>({ face: "happy", until: 0 });
  const target = useRef(0.5);
  const keys = useRef({ left: false, right: false });
  const field = useRef<HTMLDivElement>(null);
  const finished = useRef(false);

  const live = useRef(state);

  useFrame(running && !paused, (dt) => {
    if (keys.current.left) target.current = Math.max(0, target.current - dt * 1.4);
    if (keys.current.right) target.current = Math.min(1, target.current + dt * 1.4);
    const next = stepCatch(live.current, dt, target.current);
    live.current = next;
    for (const event of next.events) {
      if (event.kind === "ouch") blip(180, 160, "square", 0.04);
      else blip(event.kind === "star" ? 990 : 720, 70);
    }
    const last = next.events.at(-1);
    if (last) setMood({ face: last.kind === "ouch" ? "lonely" : last.kind === "star" ? "radiant" : "happy", until: next.t + 0.7 });
    setState(next);
  });

  useEffect(() => {
    if (state.over && !finished.current) {
      finished.current = true;
      setRunning(false);
      onFinish(state.score);
    }
  }, [state, onFinish]);

  function aim(event: PointerEvent<HTMLDivElement>) {
    if (paused || state.over) return;
    const box = field.current?.getBoundingClientRect();
    if (!box) return;
    target.current = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>, down: boolean) {
    if (event.key === "ArrowLeft") keys.current.left = down;
    else if (event.key === "ArrowRight") keys.current.right = down;
    else if (down && (event.key === " " || event.key === "Enter") && !running && !state.over) setRunning(true);
    else return;
    event.preventDefault();
    if (down && !running && !state.over) setRunning(true);
  }

  const face = mood.until > state.t ? mood.face : "happy";
  const left = Math.max(0, Math.ceil(CATCH_SECONDS - state.t));

  return (
    <div
      ref={field}
      className="pk-game pk-game--catch"
      tabIndex={0}
      role="application"
      aria-label={`Catch. Move with the pointer or the arrow keys. ${state.score} caught, ${left} seconds left.`}
      onPointerMove={(event) => { if (running) aim(event); }}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); aim(event); if (!state.over) setRunning(true); }}
      onBlur={() => { keys.current = { left: false, right: false }; }}
      onKeyDown={(event) => onKey(event, true)}
      onKeyUp={(event) => onKey(event, false)}
    >
      <div className="pk-game__sky" />
      <div className="pk-game__cloud" style={{ left: "12%", top: "12%" }} />
      <div className="pk-game__cloud pk-game__cloud--far" style={{ left: "62%", top: "22%" }} />
      <div className="pk-game__grass" />

      {state.drops.map((drop) => (
        <div key={drop.id} className="pk-game__drop" style={{ left: `${drop.x * 100}%`, top: `${drop.y * 100}%` }}>
          {drop.kind === "treat" ? <Treat form={form} /> : drop.kind === "star" ? <Star /> : <RainCloud />}
        </div>
      ))}

      <div className="pk-game__catcher" style={{ left: `${state.x * 100}%` }}>
        <PetArt form={form} temper={temper} feeling={face} wearing={wearing} pose="full" />
      </div>

      <div className="pk-game__hud" aria-hidden="true">
        <span className="pk-game__score">{state.score}</span>
        <span className="pk-game__lives">
          {Array.from({ length: CATCH_LIVES }, (_, i) => (
            <span key={i} className={i < state.lives ? undefined : "pk-game__life--gone"}>
              <Heart />
            </span>
          ))}
        </span>
        <span className="pk-game__time">{left}s</span>
      </div>

      {!running && !state.over ? (
        <div className="pk-game__start">
          <p className="title">Move to catch</p>
          <p className="body-sm pk-muted">Point, drag or use the arrow keys. Treats are one, stars are three. Three storm clouds and the round is over.</p>
          <span className="pk-pill">Tap to start</span>
        </div>
      ) : null}
    </div>
  );
}
