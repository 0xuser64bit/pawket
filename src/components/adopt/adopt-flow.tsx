"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Button,
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
import { SPECIES_ART, SPECIES_LABEL, SPECIES_SKY } from "@/lib/game/appearance";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { createGuestPet } from "@/lib/guest/pet";
import { saveGuestPet } from "@/lib/guest/storage";

const SPECIES = [PetSpecies.LunaCat, PetSpecies.MossPup, PetSpecies.CloudBun];

const PERSONALITIES: Array<{ value: PetPersonality; label: string }> = [
  { value: PetPersonality.Curious, label: "Curious" },
  { value: PetPersonality.Cozy, label: "Cozy" },
  { value: PetPersonality.Brave, label: "Brave" },
  { value: PetPersonality.Mischief, label: "Mischief" },
];

const SUGGESTIONS = ["Pepper", "Marmalade", "Tuesday", "Nib"];

/**
 * Three taps to a pet, and the wallet question is never asked. Onboarding
 * does not mention a chain, a token or a connect step — the pet is enough,
 * and ownership is offered later as something you choose.
 *
 * This is the one product flow that is real: it writes a guest pet with the
 * same game math and the same name rule the on-chain adoption uses.
 *
 * Each step replaces the last in place, so focus and scroll move to the new
 * step's heading — otherwise a keyboard or screen reader is left on a button
 * that no longer exists.
 */
export function AdoptFlow() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [species, setSpecies] = useState<PetSpecies>(PetSpecies.LunaCat);
  const [personality, setPersonality] = useState<PetPersonality>(PetPersonality.Curious);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const heading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const shown = useRef(step);

  useEffect(() => {
    // Only when the step changes: on arrival the page starts at the top.
    if (shown.current === step) return;
    shown.current = step;
    window.scrollTo({ top: 0 });
    heading.current?.focus();
  }, [step]);

  const form = SPECIES_ART[species];
  const sky = SPECIES_SKY[species];
  const personalityLabel = PERSONALITIES.find((option) => option.value === personality)?.label;

  function commit() {
    try {
      saveGuestPet(createGuestPet({ name, species, personality }));
      setError(undefined);
      setStep(3);
    } catch {
      // The rule comes from the on-chain name seed (2–24 UTF-8 bytes); the
      // sentence a player reads should not.
      setError("A name needs at least two characters, and no more than 24.");
      nameInput.current?.focus();
    }
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
              You can change everything else later. Not this.
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
              Every pet starts at Cloth. Coats, traits and rarity come from how you raise it and
              what you put on it — never from what you paid.
            </p>
          </Well>

          {/* A step count, not a progress bar: neutral, because the moment
              carries no feeling a hue should imply. */}
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
        {/* A form, so Enter in the name field does what the button does. */}
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
                    {/* Chosen is the act hue, as it is for the species. */}
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

  return (
    <Screen width="narrow">
      <Stack gap={5} style={{ paddingTop: "var(--space-7)" }}>
        <div className="pk-portrait">
          <PetFrame
            form={form}
            sky={sky}
            size="lg"
            name={name.trim()}
            level={1}
            rarity="cloth"
            mood={personalityLabel}
          />
        </div>

        <div>
          <h1 ref={heading} tabIndex={-1} className="display-m">
            {name.trim()} is yours.
          </h1>
          <p className="body pk-muted" style={{ marginTop: "var(--space-3)" }}>
            They live in this browser from now on. Recording them on-chain will always be your
            choice — and nothing about them changes if you do.
          </p>
        </div>

        <WalletState mode="guest" body="No wallet needed. Everything in Pawket works from here." />

        <Button label="Take them home" size="lg" full icon="home" onClick={() => router.push("/home")} />
      </Stack>
    </Screen>
  );
}
