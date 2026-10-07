"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PawGlyph, PetArt, WearableArt, type Feeling, type PetForm, type Temper } from "@/components/pk";
import { WEARABLES } from "@/lib/closet/catalog";
import { PAIRS, dealPairs, flipCard, pairsScore, settle, type PairsState } from "@/lib/play/pairs";
import { nextRandom } from "@/lib/play/random";
import { blip } from "@/lib/play/sound";

/**
 * Six pieces of the wardrobe for this round's faces, picked by the seed —
 * one of each kind, so no two pairs look alike (a paper crown beside a gold
 * one, a red collar beside a bell collar) and a miss is never the art's fault.
 */
export function facesFor(seed: number): string[] {
  const items = [...WEARABLES];
  let state = seed ^ 0x5f3759df;
  for (let i = items.length - 1; i > 0; i--) {
    let r: number;
    [r, state] = nextRandom(state);
    const j = Math.floor(r * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  const kinds = new Set<string>();
  return items
    .filter((item) => !kinds.has(item.kind) && Boolean(kinds.add(item.kind)))
    .slice(0, PAIRS)
    .map((item) => item.id);
}

/**
 * Pairs, drawn: twelve cards on the table with the paw on their backs and
 * a piece of the wardrobe on their faces, and the pet beside them, who is
 * pleased by a pair and sorry about a miss. Cards are buttons, so a
 * keyboard plays it as well as a finger.
 */
export function PairsGame({
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
  const [state, setState] = useState<PairsState>(() => dealPairs(seed));
  const [face, setFace] = useState<Feeling>("happy");
  const faces = useMemo(() => facesFor(seed), [seed]);
  const finished = useRef(false);
  const found = state.found.filter(Boolean).length / 2;

  // A miss is shown for a moment, then turned back.
  useEffect(() => {
    if (state.open.length !== 2 || paused) return;
    const timer = window.setTimeout(() => {
      setState((current) => settle(current));
      setFace("happy");
    }, 760);
    return () => window.clearTimeout(timer);
  }, [state.open, paused]);

  useEffect(() => {
    if (state.over && !finished.current) {
      if (paused) return;
      const timer = window.setTimeout(() => { finished.current = true; onFinish(pairsScore(state)); }, 500);
      return () => window.clearTimeout(timer);
    }
  }, [state, onFinish, paused]);

  function flip(index: number) {
    if (paused) return;
    const next = flipCard(state, index);
    if (next === state) return;
    if (next.moves > state.moves) {
      const pair = next.misses === state.misses;
      blip(pair ? 880 : 200, pair ? 120 : 220, pair ? "triangle" : "square", pair ? 0.05 : 0.035);
      setFace(pair ? "radiant" : "lonely");
    } else blip(560, 60);
    setState(next);
  }

  return (
    <div className="pk-pairs">
      <div className="pk-pairs__board" role="group" aria-label={`Pairs. ${found} of ${PAIRS} found, ${state.misses} missed.`}>
        {state.cards.map((card, i) => {
          const up = state.found[i] || state.open.includes(i);
          const name = WEARABLES.find((item) => item.id === faces[card])?.name ?? "A piece";
          return (
            <button
              key={i}
              type="button"
              className={["pk-pair", up && "pk-pair--up", state.found[i] && "pk-pair--found"].filter(Boolean).join(" ")}
              aria-label={up ? name : `Card ${i + 1}, face down`}
              aria-pressed={up}
              disabled={state.found[i] || state.over}
              onClick={() => flip(i)}
            >
              <span className="pk-pair__inner" aria-hidden="true">
                <span className="pk-pair__back">
                  <PawGlyph size={28} />
                </span>
                <span className="pk-pair__face">
                  <WearableArt id={faces[card]} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="pk-pairs__side">
        <span className="pk-pairs__pet">
          <PetArt form={form} temper={temper} feeling={face} wearing={wearing} pose="full" />
        </span>
        <p className="title" aria-live="polite">
          {state.over ? "All six." : `${found} of ${PAIRS}`}
        </p>
        <p className="caption pk-faint">
          {state.misses === 0 ? "No misses yet." : `${state.misses} ${state.misses === 1 ? "miss" : "misses"}.`} A miss is two
          points; finding them all is at least six.
        </p>
      </div>
    </div>
  );
}
