"use client";

import { useRouter } from "next/navigation";
import { addTransitionType, startTransition, useEffect, useRef, useState, ViewTransition, type CSSProperties, type ReactNode, type Ref } from "react";
import {
  ARRIVE,
  Banner,
  Button,
  Field,
  Icon,
  LEAVE,
  Mark,
  Paper,
  PetFrame,
  Receipt,
  Stack,
} from "@/components/pk";
import {
  PERSONALITY_LABEL,
  PERSONALITY_TEMPER,
  SPECIES_ART,
  SPECIES_LABEL,
  SPECIES_SKY,
} from "@/lib/game/appearance";
import type { Address } from "@solana/kit";
import { KeepSheet } from "@/components/home/keep-sheet";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { choosePet } from "@/lib/companion/use-companion";
import { createGuestPet, nameTaken, projectGuestPet, type GuestPet } from "@/lib/guest/pet";
import { removePet, savePet } from "@/lib/guest/storage";
import { usePets } from "@/lib/guest/use-pets";
import { useConnected } from "@/lib/solana/browser-client";
import { usePawketSend } from "@/lib/solana/use-send";
import { formatUtcDate } from "@/lib/utils/format";
import { useEyesFollow } from "@/lib/utils/use-eyes-follow";
import { useBackCloses, useHere } from "@/lib/native/android";

const SPECIES = [PetSpecies.LunaCat, PetSpecies.MossPup, PetSpecies.CloudBun];

/** One line each, about the animal — what it is like to live with, not what it is worth. */
const SPECIES_LINE: Record<PetSpecies, string> = {
  [PetSpecies.LunaCat]: "Naps in sunbeams and follows you from room to room.",
  [PetSpecies.MossPup]: "Meets you at the door like you were gone a year.",
  [PetSpecies.CloudBun]: "Soft, quiet, and braver than they look.",
};

const PERSONALITIES: Array<{ value: PetPersonality; line: string }> = [
  { value: PetPersonality.Curious, line: "Wants to see everything first." },
  { value: PetPersonality.Cozy, line: "Happiest in a warm lap." },
  { value: PetPersonality.Brave, line: "First out the door, every time." },
  { value: PetPersonality.Mischief, line: "Up to something. Probably your socks." },
];

const NAMES: Record<PetSpecies, string[]> = {
  [PetSpecies.LunaCat]: ["Pepper", "Miso", "Marmalade", "Saffron", "Nib"],
  [PetSpecies.MossPup]: ["Biscuit", "Noodle", "Juniper", "Waffles", "Pickle"],
  [PetSpecies.CloudBun]: ["Tuesday", "Mochi", "Clover", "Dumpling", "Puff"],
};

/** "Pepper will have company." — the pets already here, named. */
function companyLine(names: string[]): string {
  if (names.length === 1) return `${names[0]} will have company.`;
  if (names.length === 2) return `${names[0]} and ${names[1]} will have company.`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more will have company.`;
}

/** Three paws, one per step: the ones behind you filled, the one you are on outlined in sun. */
function Steps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className="pk-steps" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((n) => (
        <li key={n} aria-current={n === step ? "step" : undefined} className={n < step ? "pk-steps__done" : n === step ? "pk-steps__now" : undefined}>
          <Icon name="paw" size={18} />
          <span className="pk-sr">{["Choose a pet", "Name your pet", "Welcome home"][n - 1]}{n < step ? ", complete" : ""}</span>
        </li>
      ))}
    </ol>
  );
}

function Bar({ step, onBack }: { step: 1 | 2 | 3; onBack?: () => void }) {
  return (
    <div className="pk-screen__bar pk-adopt__bar">
      {onBack ? <AdoptBack onBack={onBack} /> : <Mark href="/" size={26} type={18} />}
      <Steps step={step} />
    </div>
  );
}

/**
 * One step of the three. Going on, the next one comes in from the right as
 * this one steps left; Back runs the other way — the same motion as going
 * deeper into a place, and back out of it.
 */
function StepView({ narrow = false, scope, children }: { narrow?: boolean; scope?: Ref<HTMLElement>; children: ReactNode }) {
  return (
    <ViewTransition enter={ARRIVE} exit={LEAVE} default="none">
      <main id="main" className={narrow ? "pk-adopt pk-adopt--narrow" : "pk-adopt"} ref={scope}>
        {children}
      </main>
    </ViewTransition>
  );
}

/** The name stitched on the blanket, sized so a long one still fits across it. */
function Tag({ name, empty }: { name: string; empty?: boolean }) {
  return (
    <span
      className={["pk-adopt__tag", empty && "pk-adopt__tag--empty"].filter(Boolean).join(" ")}
      style={{ "--len": Math.max(name.length, 6) } as CSSProperties}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

function AdoptBack({ onBack }: { onBack: () => void }) {
  useBackCloses(onBack);
  return <Button label="Back" tone="ghost" icon="left" className="pk-btn--flush" onClick={onBack} />;
}

/**
 * Three taps to a pet. A player keeps as many as they adopt: a new one
 * joins the others in this browser and comes home, and nobody already here
 * is touched on the way through.
 *
 * The pets are the page: all three sit large and alive, their eyes follow
 * the pointer, choosing one makes it hop, and the temperament you pick is
 * the face it wears from then on. The name is stitched on its blanket as
 * you type it.
 *
 * Each step replaces the last in place, so focus and scroll move to the new
 * step's heading — otherwise a keyboard or screen reader is left on a button
 * that no longer exists.
 */
export function AdoptFlow() {
  const router = useRouter();
  const { ready, pets: residents } = usePets();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [species, setSpecies] = useState<PetSpecies>(PetSpecies.LunaCat);
  const [hop, setHop] = useState(0);
  const [personality, setPersonality] = useState<PetPersonality>(PetPersonality.Curious);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [adopted, setAdopted] = useState<GuestPet>();
  const [stored, setStored] = useState(true);
  const [keeping, setKeeping] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const shown = useRef(step);
  const sender = usePawketSend();
  const connected = useConnected();
  const { here, Here } = useHere();
  const owner = (connected?.account.address as Address | undefined) ?? null;
  useEyesFollow(scope);

  function go(next: 1 | 2 | 3) {
    startTransition(() => {
      addTransitionType(next > step ? "nav-forward" : "nav-back");
      setStep(next);
    });
  }

  // On a phone the three are a row you swipe: the one you land on is the one
  // chosen, so the button under them never names a pet you swiped past.
  useEffect(() => {
    const row = stage.current;
    if (step !== 1 || !row) return;
    const picks = Array.from(row.querySelectorAll<HTMLElement>("[data-species]"));
    const io = new IntersectionObserver(
      () => {
        if (row.scrollWidth <= row.clientWidth) return;
        // Observer entries can describe the previous viewport after a resize.
        // Read the current carousel so the CTA always names the visible pet.
        const center = row.getBoundingClientRect().left + row.clientWidth / 2;
        let closest: HTMLElement | undefined;
        let distance = Infinity;
        for (const pick of picks) {
          const box = pick.getBoundingClientRect();
          const next = Math.abs(box.left + box.width / 2 - center);
          if (next < distance) { closest = pick; distance = next; }
        }
        if (closest) setSpecies(closest.dataset.species as PetSpecies);
      },
      { root: row, threshold: 0.8 },
    );
    for (const pick of picks) io.observe(pick);
    return () => io.disconnect();
  }, [step, ready]);

  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    window.scrollTo({ top: 0 });
    heading.current?.focus();
  }, [step]);

  const form = SPECIES_ART[species];
  const sky = SPECIES_SKY[species];
  const temper = PERSONALITY_TEMPER[personality];
  const typed = name.trim();

  function choose(option: PetSpecies, target: HTMLElement) {
    setSpecies(option);
    setHop((n) => n + 1);
    target.closest("[data-species]")?.scrollIntoView({ inline: "center", block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  function commit() {
    if (nameTaken(residents, name)) {
      setError(`You already have a pet called ${typed}. Each of yours needs their own name.`);
      nameInput.current?.focus();
      return;
    }
    try {
      const created = createGuestPet({ name, species, personality });
      const saved = savePet(created);
      if (saved) choosePet(created.id);
      setAdopted(created);
      setStored(saved);
      setError(undefined);
      go(3);
    } catch {
      // The rule comes from the on-chain name seed (2–24 UTF-8 bytes); the
      // sentence a player reads should not.
      setError(typed.length < 2 ? "A name needs at least two plain letters, or a single emoji." : "That name is too long. Shorten it; accents and emoji use more room.");
      nameInput.current?.focus();
    }
  }

  function retrySave() {
    if (!adopted) return;
    const saved = savePet(adopted);
    if (saved) choosePet(adopted.id);
    setStored(saved);
  }

  // The first step draws before this browser's pets are read: only the line
  // about who will have company waits for them.
  if (step === 1) {
    return (
      <StepView key={1} scope={scope}>
        <Bar step={1} />
        <div className="pk-adopt__head">
          <h1 ref={heading} tabIndex={-1} className="display-l">
            Who is coming home with you?
          </h1>
          <p className="body-lg pk-muted">
            {residents.length
              ? `${companyLine(residents.map((r) => r.name))} Pick one more: their species and their temperament stay with them.`
              : "Pick one. Their species and their temperament stay with them."}
          </p>
        </div>

        <div className="pk-adopt__stage" ref={stage}>
          {SPECIES.map((option, index) => {
            const chosen = option === species;
            return (
              <div
                key={option}
                data-species={option}
                className={["pk-adopt__pick", chosen && "pk-adopt__pick--on"].filter(Boolean).join(" ")}
              >
                <button
                  type="button"
                  className="pk-adopt__hit"
                  onClick={(event) => choose(option, event.currentTarget)}
                  aria-pressed={chosen}
                  aria-describedby={`line-${option}`}
                >
                  <span
                    key={chosen ? hop : 0}
                    className={["pk-adopt__pet", chosen && hop ? "pk-adopt__pet--hop" : ""].join(" ")}
                    style={{ animationDelay: `${index * 90}ms` }}
                    data-eyes
                  >
                    <PetFrame
                      form={SPECIES_ART[option]}
                      temper={chosen ? "curious" : "cozy"}
                      feeling={chosen ? "radiant" : "happy"}
                      sky={SPECIES_SKY[option]}
                      size="fluid"
                      seed={option}
                    />
                  </span>
                  <span className="pk-adopt__name">{SPECIES_LABEL[option]}</span>
                </button>
                <p id={`line-${option}`} className="body-sm pk-muted pk-adopt__line">
                  {SPECIES_LINE[option]}
                </p>
              </div>
            );
          })}
        </div>

        <p className="caption pk-faint pk-adopt__note">Free, and it starts in {here}. Clothes come later, and they change only how they look.</p>
        <div className="pk-adopt__act">
          <Button label={`Choose the ${SPECIES_LABEL[species].toLowerCase()}`} size="lg" full icon="paw" onClick={() => go(2)} />
        </div>
      </StepView>
    );
  }

  if (step === 2) {
    return (
      <StepView key={2} scope={scope}>
        <Bar step={2} onBack={() => go(1)} />
        <form
          className="pk-adopt__name-step"
          onSubmit={(event) => {
            event.preventDefault();
            commit();
          }}
        >
          <div className="pk-adopt__portrait" data-eyes>
            <span className="pk-adopt__plate">
              <PetFrame form={form} temper={temper} sky={sky} size="lg" seed={species} />
              <Tag name={typed || "Your pet"} empty={!typed} />
            </span>
          </div>

          <Stack gap={5}>
            <div>
              <h1 ref={heading} tabIndex={-1} className="display-m">
                What will you call them?
              </h1>
              <div style={{ marginTop: "var(--space-4)" }}>
                <Field
                  ref={nameInput}
                  label="Pet name"
                  name="pet-name"
                  icon="paw"
                  autoComplete="off"
                  maxLength={24}
                  value={name}
                  onChange={(event) => { setName(event.target.value); setError(undefined); }}
                  placeholder={NAMES[species][0]}
                  error={error}
                  helper="Up to 24 plain letters; accents and emoji use more room. It is theirs for good."
                />
              </div>
              <div className="pk-adopt__names" role="group" aria-label="Names to try">
                {NAMES[species].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => { setName(suggestion); setError(undefined); }}
                    aria-pressed={typed === suggestion}
                    className="pk-pill pk-adopt__suggest"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <fieldset className="pk-adopt__tempers">
              <legend className="label pk-faint">How would you describe them?</legend>
              <div className="pk-tempers">
                {PERSONALITIES.map((option) => {
                  const on = option.value === personality;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPersonality(option.value)}
                      aria-pressed={on}
                      className="pk-temper"
                    >
                      <span className="pk-temper__face">
                        <PetFrame form={form} temper={PERSONALITY_TEMPER[option.value]} sky={sky} size="fluid" still />
                      </span>
                      <span className="pk-temper__words">
                        <span className="title">{PERSONALITY_LABEL[option.value]}</span>
                        <span className="caption pk-muted">{option.line}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="pk-adopt__act">
              <Button type="submit" label="That’s the one" size="lg" full icon="heart" />
            </div>
          </Stack>
        </form>
      </StepView>
    );
  }

  const kept = adopted?.name ?? typed;
  const projected = adopted ? projectGuestPet(adopted) : null;

  return (
    <StepView key={3} narrow scope={scope}>
      <Bar step={3} />
      <Stack gap={5}>
        <div className="pk-adopt__portrait pk-adopt__welcome" data-eyes>
          <span className="pk-adopt__plate pk-adopt__pet pk-adopt__pet--hop">
            <PetFrame
              form={form}
              temper={temper}
              feeling="radiant"
              sky={sky}
              size="lg"
              level={projected?.level ?? 1}
              seed={kept}
            />
            <Tag name={kept} />
          </span>
        </div>

        <div>
          <h1 ref={heading} tabIndex={-1} className="display-l">
            {kept} is yours.
          </h1>
          <p className="body-lg pk-muted" style={{ marginTop: "var(--space-3)" }}>
            {PERSONALITY_LABEL[personality]}, and new here. Feed them, play, and come back tomorrow — that is
            how they grow.
          </p>
        </div>

        {stored ? (
          <>
            <Paper title="Their first page" meta="Day one">
              <Receipt
                rows={[
                  { k: "Name", v: kept },
                  { k: "Species", v: SPECIES_LABEL[species] },
                  { k: "Temperament", v: PERSONALITY_LABEL[personality] },
                  { k: "Adopted", v: adopted ? formatUtcDate(adopted.createdAt) : "Today" },
                  { k: "Kept", v: `In ${here}` },
                ]}
              />
            </Paper>
            <div className="pk-adopt__act">
              <Button label="Take them home" size="lg" full icon="home" onClick={() => router.push("/home", { transitionTypes: ["nav-place"] })} />
            </div>
            {adopted ? (
              <div className="pk-adopt__keep">
                <p className="body-sm pk-muted">
                  {kept} lives in {here}. Today is the best day to keep them on Solana too: they are brand new, so
                  nothing starts over.
                </p>
                <Button label="Keep on Solana" aria-label={`Keep ${kept} on Solana`} icon="keep" tone="quiet" size="sm" onClick={() => setKeeping(true)} />
              </div>
            ) : null}
            {adopted && keeping ? (
              <KeepSheet
                pet={adopted}
                owner={owner}
                canSign={Boolean(connected?.signer)}
                sender={sender}
                onDismiss={() => setKeeping(false)}
                onCarried={(address) => {
                  removePet(adopted.id);
                  choosePet(address);
                  router.push("/home", { transitionTypes: ["nav-place"] });
                }}
              />
            ) : null}
          </>
        ) : (
          <>
            <Banner
              tone="risk"
              title="Not stored"
              body={`${Here} refused to keep them. Retry, or they disappear when you leave ${here === "this app" ? "Pawket" : "this tab"}.`}
            />
            <Button label="Try saving again" size="lg" full onClick={retrySave} />
          </>
        )}
      </Stack>
    </StepView>
  );
}
