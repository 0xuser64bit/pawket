"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DecorArt } from "@/components/home/decor-art";
import { Icon, PawArt, PetArt, useTheme, type PetForm, type Temper } from "@/components/pk";
import { useEyesFollow } from "@/lib/utils/use-eyes-follow";

type Phase = "morning" | "day" | "evening" | "night";

const PETS: ReadonlyArray<{
  id: string;
  name: string;
  form: PetForm;
  temper: Temper;
  wearing?: string;
  line: string;
}> = [
  {
    id: "pepper",
    name: "Pepper",
    form: "cat",
    temper: "curious",
    line: "Pepper purrs. The window is warm.",
  },
  {
    id: "biscuit",
    name: "Biscuit",
    form: "dog",
    temper: "brave",
    wearing: "wool-scarf",
    line: "Biscuit's tail goes thump.",
  },
  {
    id: "mochi",
    name: "Mochi",
    form: "bun",
    temper: "cozy",
    wearing: "nap-ribbon",
    line: "Mochi does a little hop.",
  },
];

const GREETING: Record<Phase, string> = {
  morning: "Good morning",
  day: "Good afternoon",
  evening: "Good evening",
  night: "The window is still open",
};

function phaseAt(hour: number): Phase {
  if (hour < 5) return "night";
  if (hour < 11) return "morning";
  if (hour < 17) return "day";
  if (hour < 21) return "evening";
  return "night";
}

function subscribeToMinute(callback: () => void) {
  const id = setInterval(callback, 60_000);
  return () => clearInterval(id);
}

const serverPhase = () => "day" as Phase;
const readPhase = () => phaseAt(new Date().getHours());

export function HeroWindow() {
  const scope = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [booped, setBooped] = useState(false);
  const [boops, setBoops] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phase = useSyncExternalStore(subscribeToMinute, readPhase, serverPhase);
  const theme = useTheme();
  const scene: Phase = theme === "dark" ? "night" : phase;
  useEyesFollow(scope);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const pet = PETS[active];

  function boop() {
    if (timer.current) clearTimeout(timer.current);
    setBoops((count) => count + 1);
    setBooped(true);
    timer.current = setTimeout(() => setBooped(false), 2400);
  }

  function choose(index: number) {
    setActive(index);
    setBooped(false);
    if (timer.current) clearTimeout(timer.current);
  }

  return (
    <div className="pk-hero-window">
      <div className="pk-window" ref={scope} data-phase={scene}>
        <div className="pk-window__sky" aria-hidden="true">
          <span className="pk-window__orb" />
          <span className="pk-window__cloud pk-window__cloud--a" />
          <span className="pk-window__cloud pk-window__cloud--b" />
          {[1, 2, 3, 4, 5, 6, 7].map((star) => (
            <span key={star} className={`pk-window__star pk-window__star--${star}`} />
          ))}
          <span className="pk-window__hill pk-window__hill--back" />
          <span className="pk-window__hill pk-window__hill--front" />
        </div>

        <span className="pk-window__frame" aria-hidden="true" />
        <span className="pk-window__curtain pk-window__curtain--left" aria-hidden="true" />
        <span className="pk-window__curtain pk-window__curtain--right" aria-hidden="true" />

        <span className="pk-window__sill" aria-hidden="true" />
        <span className="pk-window__plant" aria-hidden="true">
          <DecorArt id="sunflower" />
        </span>
        <span className="pk-window__mug" aria-hidden="true" />
        <span className="pk-window__bowl" aria-hidden="true" />

        <span className="pk-window__greeting">
          <Icon name={scene === "night" ? "moon" : "spark"} size={13} />
          {GREETING[scene]}
        </span>

        <span className="pk-window__cushion" aria-hidden="true" />

        <div
          className={booped ? "pk-window__pet pk-window__pet--booped" : "pk-window__pet"}
          data-eyes
          key={`${pet.id}-${boops}`}
        >
          <PetArt
            form={pet.form}
            temper={pet.temper}
            feeling={booped ? "radiant" : "happy"}
            wearing={pet.wearing}
            pose="full"
            seed={pet.name}
          />
        </div>

        {booped ? (
          <span className="pk-window__hearts" aria-hidden="true">
            <PawArt form="heart" className="pk-window__heart pk-window__heart--1" />
            <PawArt form="heart" className="pk-window__heart pk-window__heart--2" />
            <PawArt form="heart" className="pk-window__heart pk-window__heart--3" />
          </span>
        ) : null}

        <button type="button" className="pk-window__boop" onClick={boop} aria-label={`Boop ${pet.name}`}>
          <span className="pk-window__boop-tag" aria-hidden="true">
            <Icon name="paw" size={14} />
            Boop
          </span>
        </button>

        <span className="pk-window__name">{pet.name}</span>

        {booped ? (
          <span className="pk-window__bubble" role="status">
            {pet.line}
          </span>
        ) : null}
      </div>

      <div className="pk-window__picks" role="group" aria-label="Choose who is waiting">
        {PETS.map((choice, index) => (
          <button
            key={choice.id}
            type="button"
            className={index === active ? "pk-window__pick pk-window__pick--on" : "pk-window__pick"}
            aria-pressed={index === active}
            onClick={() => choose(index)}
          >
            <span className="pk-window__pick-art" aria-hidden="true">
              <PetArt form={choice.form} temper={choice.temper} feeling="happy" pose="full" still seed={choice.name} />
            </span>
            <span>{choice.name}</span>
          </button>
        ))}
      </div>

      <p className="pk-window__hint">
        <Icon name="paw" size={14} />
        Boop the pet. They notice.
      </p>
    </div>
  );
}
