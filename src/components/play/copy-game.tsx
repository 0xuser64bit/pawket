"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button, PetFrame, type Feeling, type PetForm, type Sky, type Temper } from "@/components/pk";
import { BEANS, checkCopy, copyPattern, showMs } from "@/lib/play/copy";
import { BEAN_NOTES, blip } from "@/lib/play/sound";

const BEAN_NAMES = ["Sun bean", "Pool bean", "Sprout bean", "Copper bean"];
/** Where each bean sits in the arch, and which way the pet looks at it. */
const BEAN_LOOK = [-1, -0.4, 0.4, 1];

type Phase = "ready" | "show" | "turn" | "wrong";

/**
 * Copy, drawn: one giant paw. The pet sits in its centre pad and taps the
 * four toe beans in a pattern; the player taps it back. Each pattern copied
 * grows by one; the first wrong bean ends the round. The beans are buttons,
 * so a keyboard (1–4, or Tab and Enter) plays it as well as a finger.
 */
export function CopyGame({
  form,
  temper,
  wearing,
  sky,
  seed,
  onFinish,
}: {
  form: PetForm;
  temper: Temper;
  wearing: string | null;
  sky: Sky;
  seed: number;
  onFinish: (score: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [length, setLength] = useState(1);
  const [lit, setLit] = useState<number | null>(null);
  const [taps, setTaps] = useState<number[]>([]);
  const [face, setFace] = useState<Feeling>("happy");
  const [said, setSaid] = useState("");
  const pattern = copyPattern(seed, length);
  const timers = useRef<number[]>([]);

  const later = (ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  };
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  // The pet shows the pattern, one bean at a time, then hands it over.
  useEffect(() => {
    if (phase !== "show") return;
    const on = showMs(length);
    const gap = Math.round(on * 0.45);
    pattern.forEach((bean, i) => {
      later(500 + i * (on + gap), () => {
        setLit(bean);
        blip(BEAN_NOTES[bean], on * 0.9, "sine", 0.06);
      });
      later(500 + i * (on + gap) + on, () => setLit(null));
    });
    later(500 + pattern.length * (on + gap), () => {
      setPhase("turn");
      setTaps([]);
      setSaid("Your turn.");
    });
    // The pattern is a function of seed and length.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, length, seed]);

  function tap(bean: number) {
    if (phase !== "turn") return;
    const next = [...taps, bean];
    setTaps(next);
    setLit(bean);
    later(180, () => setLit(null));
    const answer = checkCopy(pattern, next);
    if (answer === "wrong") {
      blip(150, 320, "square", 0.04);
      setFace("lonely");
      setPhase("wrong");
      setSaid(`Not that one. You copied ${length - 1}.`);
      later(1100, () => onFinish(length - 1));
      return;
    }
    blip(BEAN_NOTES[bean], 160, "sine", 0.06);
    if (answer === "done") {
      setFace("radiant");
      setSaid(`${length} copied.`);
      later(700, () => {
        setFace("happy");
        setLength(length + 1);
        setPhase("show");
      });
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const bean = Number(event.key) - 1;
      if (bean >= 0 && bean < BEANS) tap(bean);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const look = lit !== null ? BEAN_LOOK[lit] : 0;
  return (
    <div className="pk-paws" data-phase={phase}>
      <div className="pk-paws__paw">
        {Array.from({ length: BEANS }, (_, bean) => (
          <button
            key={bean}
            type="button"
            className={["pk-paws__bean", `pk-paws__bean--${bean}`, lit === bean && "pk-paws__bean--lit"].filter(Boolean).join(" ")}
            aria-label={`${BEAN_NAMES[bean]} (${bean + 1})`}
            disabled={phase !== "turn"}
            onClick={() => tap(bean)}
          />
        ))}
        <div className="pk-paws__pad" style={{ "--pk-look-x": look, "--pk-look-y": lit !== null ? -0.8 : 0 } as CSSProperties}>
          <PetFrame form={form} temper={temper} feeling={face} wearing={wearing} sky={sky} size="fluid" />
        </div>
      </div>

      <div className="pk-paws__foot">
        <p className="title" aria-live="polite">
          {phase === "ready" ? "Watch, then copy" : phase === "show" ? `Watch. ${length} ${length === 1 ? "bean" : "beans"}.` : said}
        </p>
        <p className="caption pk-faint">
          {phase === "ready"
            ? "The pattern grows by one each time you copy it. One wrong bean ends the round."
            : `Pattern ${length} · ${phase === "turn" ? `${taps.length} of ${length}` : "watching"}`}
        </p>
        {phase === "ready" ? (
          <Button label="Start copying" tone="pool" icon="paw" onClick={() => setPhase("show")} />
        ) : null}
      </div>
    </div>
  );
}
