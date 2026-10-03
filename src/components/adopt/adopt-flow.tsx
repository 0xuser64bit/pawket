"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Banner,
  Button,
  Field,
  Icon,
  Mark,
  Paper,
  PetFrame,
  Receipt,
  Stack,
  WalletState,
  Waiting,
} from "@/components/pk";
import {
  PERSONALITY_LABEL,
  PERSONALITY_TEMPER,
  SPECIES_ART,
  SPECIES_LABEL,
  SPECIES_SKY,
} from "@/lib/game/appearance";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { choosePet } from "@/lib/companion/use-companion";
import { createGuestPet, nameTaken, projectGuestPet, type GuestPet } from "@/lib/guest/pet";
import { savePet } from "@/lib/guest/storage";
import { usePets } from "@/lib/guest/use-pets";
import { formatUtcDate } from "@/lib/utils/format";
import { useEyesFollow } from "@/lib/utils/use-eyes-follow";

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
        <li key={n} className={n < step ? "pk-steps__done" : n === step ? "pk-steps__now" : undefined}>
          <Icon name="paw" size={18} />
        </li>
      ))}
    </ol>
  );
}

function Bar({ step, onBack }: { step: 1 | 2 | 3; onBack?: () => void }) {
  return (
    <div className="pk-screen__bar pk-adopt__bar">
      {onBack ? <Button label="Back" tone="ghost" icon="left" onClick={onBack} /> : <Mark href="/" size={26} type={18} />}
      <Steps step={step} />
    </div>
  );
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
  const heading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const shown = useRef(step);
  useEyesFollow(scope);

  // On a phone the three are a row you swipe: the one you land on is the one
  // chosen, so the button under them never names a pet you swiped past.
  useEffect(() => {
    const row = stage.current;
    if (step !== 1 || !row) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (row.scrollWidth <= row.clientWidth) return;
        for (const entry of entries) {
          const option = (entry.target as HTMLElement).dataset.species as PetSpecies | undefined;
          if (entry.isIntersecting && option) setSpecies(option);
        }
      },
      { root: row, threshold: 0.8 },
    );
    for (const pick of row.querySelectorAll("[data-species]")) io.observe(pick);
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
    target.closest("[data-species]")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
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
      setStep(3);
    } catch {
      // The rule comes from the on-chain name seed (2–24 UTF-8 bytes); the
      // sentence a player reads should not.
      setError("A name needs at least two characters, and no more than 24.");
      nameInput.current?.focus();
    }
  }

  function retrySave() {
    if (!adopted) return;
    const saved = savePet(adopted);
    if (saved) choosePet(adopted.id);
    setStored(saved);
  }

  if (!ready) {
    return (
      <main id="main" className="pk-adopt">
        <Bar step={1} />
        <Waiting label="Opening adoption" />
      </main>
    );
  }

  if (step === 1) {
    return (
      <main id="main" className="pk-adopt" ref={scope}>
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

        <div className="pk-adopt__go">
          <Button label={`Choose the ${SPECIES_LABEL[species].toLowerCase()}`} size="lg" full icon="paw" onClick={() => setStep(2)} />
          <p className="caption pk-faint">Free, and it starts in this browser. Clothes come later, and they change only how they look.</p>
        </div>
      </main>
    );
  }

  if (step === 2) {
    return (
      <main id="main" className="pk-adopt" ref={scope}>
        <Bar step={2} onBack={() => setStep(1)} />
        <form
          className="pk-adopt__name-step"
          onSubmit={(event) => {
            event.preventDefault();
            commit();
          }}
        >
          <div className="pk-adopt__portrait" data-eyes>
            <PetFrame form={form} temper={temper} sky={sky} size="lg" seed={species} />
            <span className={["pk-adopt__tag", typed ? "" : "pk-adopt__tag--empty"].join(" ")} aria-hidden="true">
              {typed || "Your pet"}
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
                  onChange={(event) => setName(event.target.value)}
                  placeholder={NAMES[species][0]}
                  error={error}
                  helper="Two to 24 characters. It is theirs for good."
                />
              </div>
              <div className="pk-adopt__names" role="group" aria-label="Names to try">
                {NAMES[species].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setName(suggestion)}
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

            <Button type="submit" label={typed.length >= 2 ? `That’s the one: ${typed}` : "That’s the one"} size="lg" full icon="heart" />
          </Stack>
        </form>
      </main>
    );
  }

  const kept = adopted?.name ?? typed;
  const projected = adopted ? projectGuestPet(adopted) : null;

  return (
    <main id="main" className="pk-adopt pk-adopt--narrow" ref={scope}>
      <Bar step={3} />
      <Stack gap={5}>
        <div className="pk-adopt__portrait pk-adopt__welcome" data-eyes>
          <span className="pk-adopt__pet pk-adopt__pet--hop">
            <PetFrame
              form={form}
              temper={temper}
              feeling="radiant"
              sky={sky}
              size="lg"
              level={projected?.level ?? 1}
              seed={kept}
            />
          </span>
          <span className="pk-adopt__tag">{kept}</span>
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
                  { k: "Kept", v: "In this browser" },
                ]}
              />
            </Paper>
            <WalletState
              mode="guest"
              title="Saved in this browser"
              body="Care, the wardrobe and the playground all work from here. Clearing this browser's data is how you would lose them."
            />
            <Button label="Take them home" size="lg" full icon="home" onClick={() => router.push("/home")} />
          </>
        ) : (
          <>
            <Banner
              tone="risk"
              title="Not stored"
              body="This browser refused to keep them. Retry, or they disappear when you leave this tab."
            />
            <Button label="Try saving again" size="lg" full onClick={retrySave} />
          </>
        )}
      </Stack>
    </main>
  );
}
