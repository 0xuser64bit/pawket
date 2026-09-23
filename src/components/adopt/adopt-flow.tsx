"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Banner,
  Button,
  ButtonLink,
  Chip,
  Field,
  Mark,
  Meter,
  PetFrame,
  Row,
  Screen,
  Stack,
  WalletState,
  Well,
} from "@/components/pk";
import {
  MOOD_LABEL,
  PERSONALITY_LABEL,
  SPECIES_ART,
  SPECIES_LABEL,
  SPECIES_SKY,
} from "@/lib/game/appearance";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { createGuestPet, projectGuestPet, type GuestPet } from "@/lib/guest/pet";
import { clearGuestPet, saveGuestPet } from "@/lib/guest/storage";
import { useGuestPet } from "@/lib/guest/use-guest-pet";

const SPECIES = [PetSpecies.LunaCat, PetSpecies.MossPup, PetSpecies.CloudBun];

const PERSONALITIES: Array<{ value: PetPersonality; label: string }> = [
  { value: PetPersonality.Curious, label: "Curious" },
  { value: PetPersonality.Cozy, label: "Cozy" },
  { value: PetPersonality.Brave, label: "Brave" },
  { value: PetPersonality.Mischief, label: "Mischief" },
];

const SUGGESTIONS = ["Pepper", "Marmalade", "Tuesday", "Nib"];

/**
 * Three taps to a pet. This browser keeps one companion. If one already
 * lives here, starting over is a separate, explicit choice — adopting does
 * not overwrite them on the way through.
 *
 * Each step replaces the last in place, so focus and scroll move to the new
 * step's heading — otherwise a keyboard or screen reader is left on a button
 * that no longer exists.
 */
export function AdoptFlow() {
  const router = useRouter();
  const { ready, pet: resident } = useGuestPet();
  const [replacing, setReplacing] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [species, setSpecies] = useState<PetSpecies>(PetSpecies.LunaCat);
  const [personality, setPersonality] = useState<PetPersonality>(PetPersonality.Curious);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [adopted, setAdopted] = useState<GuestPet>();
  const [stored, setStored] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const shown = useRef(step);

  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    window.scrollTo({ top: 0 });
    heading.current?.focus();
  }, [step]);

  const form = SPECIES_ART[species];
  const sky = SPECIES_SKY[species];

  function commit() {
    try {
      const created = createGuestPet({ name, species, personality });
      const saved = saveGuestPet(created);
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
    setStored(saveGuestPet(adopted));
  }

  if (!ready) {
    return (
      <Screen width="narrow">
        <div className="pk-screen__bar">
          <Mark href="/" size={26} type={18} />
        </div>
        <p className="body-sm pk-faint">Opening adoption.</p>
      </Screen>
    );
  }

  // Saving the new pet updates the store immediately. That pet is this
  // adoption, not a resident we are about to overwrite.
  const justAdopted = adopted != null && resident?.id === adopted.id;
  if (resident && !replacing && !justAdopted) {
    return (
      <Screen width="narrow">
        <div className="pk-screen__bar">
          <Mark href="/" size={26} type={18} />
        </div>
        <Stack gap={5}>
          <div>
            <h1 ref={heading} tabIndex={-1} className="display-m">
              {resident.name} already lives here.
            </h1>
            <p className="body pk-muted" style={{ marginTop: "var(--space-3)" }}>
              This browser keeps one pet. Starting over removes {resident.name}, their care and
              their clothes from this browser. It cannot be undone.
            </p>
          </div>
          <ButtonLink label={`Keep ${resident.name}`} href="/home" size="lg" full icon="home" />
          <Button
            tone="alarm"
            size="lg"
            full
            label="Remove them and start over"
            onClick={() => {
              clearGuestPet();
              setReplacing(true);
            }}
          />
        </Stack>
      </Screen>
    );
  }

  if (step === 1) {
    return (
      <Screen width="narrow">
        <div className="pk-screen__bar">
          <Mark href="/" size={26} type={18} />
        </div>
        <Stack gap={5}>
          <div>
            <h1 ref={heading} tabIndex={-1} className="display-l">
              Who is coming home with you?
            </h1>
            <p className="body pk-muted" style={{ marginTop: "var(--space-3)" }}>
              Species, name and temperament all stay. What you put on them can change.
            </p>
          </div>

          <div className="pk-picks">
            {SPECIES.map((option) => {
              const chosen = option === species;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSpecies(option)}
                  aria-pressed={chosen}
                  className="pk-pick"
                >
                  <PetFrame form={SPECIES_ART[option]} sky={SPECIES_SKY[option]} size="fluid" still={!chosen} />
                  <span className="label pk-pick__label">{SPECIES_LABEL[option]}</span>
                </button>
              );
            })}
          </div>

          <Well>
            <p className="body-sm pk-muted">
              Every pet is Cloth. Coats and clothes are what you put on them — never something you
              pay for.
            </p>
          </Well>

          <Meter label="Step" value={1} max={3} tone="neutral" readout="1 of 3" />

          <Button
            label={`Choose the ${SPECIES_LABEL[species].toLowerCase()}`}
            size="lg"
            full
            onClick={() => setStep(2)}
          />
        </Stack>
      </Screen>
    );
  }

  if (step === 2) {
    return (
      <Screen width="narrow">
        <div className="pk-screen__bar">
          <Button label="Back" tone="ghost" icon="left" onClick={() => setStep(1)} />
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            commit();
          }}
        >
          <Stack gap={5}>
            <div className="pk-portrait">
              <PetFrame form={form} sky={sky} size="lg" mood="New" />
            </div>

            <div>
              <h1 ref={heading} tabIndex={-1} className="display-m">
                What do you want to call them?
              </h1>
              <div style={{ marginTop: "var(--space-4)" }}>
                <Field
                  ref={nameInput}
                  label="Pet name"
                  name="pet-name"
                  icon="paw"
                  autoComplete="off"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Pepper"
                  error={error}
                  helper="Two to 24 characters. Yours alone."
                />
              </div>
              <Row gap={2} wrap style={{ marginTop: "var(--space-3)" }}>
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setName(suggestion)}
                    className="pk-pick pk-pick--flat"
                  >
                    <Chip label={suggestion} />
                  </button>
                ))}
              </Row>
            </div>

            <fieldset>
              <legend className="label pk-faint" style={{ marginBottom: "var(--space-3)" }}>
                How would you describe them?
              </legend>
              <Row gap={2} wrap>
                {PERSONALITIES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPersonality(option.value)}
                    aria-pressed={option.value === personality}
                    className="pk-pick pk-pick--flat"
                  >
                    <Chip label={option.label} tone={option.value === personality ? "sun" : undefined} />
                  </button>
                ))}
              </Row>
            </fieldset>

            <Meter label="Step" value={2} max={3} tone="neutral" readout="2 of 3" />

            <Button type="submit" label="That’s the one" size="lg" full />
          </Stack>
        </form>
      </Screen>
    );
  }

  const kept = adopted?.name ?? name.trim();
  const mood = adopted ? MOOD_LABEL[projectGuestPet(adopted).mood] : "Happy";

  return (
    <Screen width="narrow">
      <Stack gap={5} style={{ paddingTop: "var(--space-7)" }}>
        <div className="pk-portrait">
          <PetFrame form={form} sky={sky} size="lg" name={kept} level={1} rarity="cloth" mood={mood} />
        </div>

        <div>
          <h1 ref={heading} tabIndex={-1} className="display-m">
            {kept} is yours.
          </h1>
          <p className="body pk-muted" style={{ marginTop: "var(--space-3)" }}>
            {PERSONALITY_LABEL[personality]}. They live in this browser. Clearing this browser&apos;s
            data is how you would lose them.
          </p>
        </div>

        {stored ? (
          <>
            <WalletState
              mode="guest"
              title="Saved in this browser"
              body="Care, the wardrobe and the playground all work from here."
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
    </Screen>
  );
}
