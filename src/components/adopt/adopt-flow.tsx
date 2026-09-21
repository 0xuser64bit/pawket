"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
 * does not mention a chain, a token or a connect step — the account is
 * enough, and ownership is offered later as something you choose.
 *
 * This is the one product flow that is real: it writes a guest pet with the
 * same game math and the same name rule the on-chain adoption uses.
 */
export function AdoptFlow() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [species, setSpecies] = useState<PetSpecies>(PetSpecies.LunaCat);
  const [personality, setPersonality] = useState<PetPersonality>(PetPersonality.Curious);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  const form = SPECIES_ART[species];
  const sky = SPECIES_SKY[species];

  function commit() {
    try {
      saveGuestPet(createGuestPet({ name, species, personality }));
      setError(undefined);
      setStep(3);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That name did not work. Try another.");
    }
  }

  if (step === 1) {
    return (
      <Screen>
        <div style={{ padding: "var(--space-3) 0" }}>
          <Mark size={26} type={18} />
        </div>
        <Stack gap={5}>
          <div>
            <h1 className="display-l">Who is coming home with you?</h1>
            <p className="body pk-muted" style={{ marginTop: "var(--space-3)" }}>
              You can change everything else later. Not this.
            </p>
          </div>

          <div className="pk-pair">
            {SPECIES.map((option) => {
              const chosen = option === species;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSpecies(option)}
                  aria-pressed={chosen}
                  style={{
                    background: "none",
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    opacity: chosen ? 1 : 0.72,
                  }}
                >
                  <PetFrame
                    form={SPECIES_ART[option]}
                    sky={SPECIES_SKY[option]}
                    size="sm"
                    mood={SPECIES_LABEL[option]}
                    still={!chosen}
                  />
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
      <Screen>
        <div style={{ padding: "var(--space-3) 0" }}>
          <Button label="Back" tone="ghost" icon="left" onClick={() => setStep(1)} />
        </div>
        <Stack gap={5}>
          <div style={{ display: "grid", placeItems: "center" }}>
            <PetFrame form={form} sky={sky} size="lg" mood="New" />
          </div>

          <div>
            <h1 className="display-m">What do you want to call them?</h1>
            <div style={{ marginTop: "var(--space-4)" }}>
              <Field
                label="Pet name"
                name="pet-name"
                icon="paw"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Pepper"
                error={error}
                helper="Names are yours alone and can be changed once a season."
              />
            </div>
            <Row gap={2} wrap style={{ marginTop: "var(--space-3)" }}>
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setName(suggestion)}
                  style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
                >
                  <Chip label={suggestion} />
                </button>
              ))}
            </Row>
          </div>

          <div>
            <p className="label pk-faint" style={{ marginBottom: "var(--space-3)" }}>
              How would you describe them?
            </p>
            <Row gap={2} wrap>
              {PERSONALITIES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPersonality(option.value)}
                  aria-pressed={option.value === personality}
                  style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
                >
                  <Chip
                    label={option.label}
                    tone={option.value === personality ? "sprout" : undefined}
                  />
                </button>
              ))}
            </Row>
          </div>

          <Meter label="Step" value={2} max={3} tone="neutral" readout="2 of 3" />

          <Button label="That’s the one" size="lg" full onClick={commit} />
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack gap={5} style={{ paddingTop: "var(--space-7)" }}>
        <div style={{ display: "grid", placeItems: "center" }}>
          <PetFrame form={form} sky={sky} size="lg" name={name.trim()} level={1} rarity="cloth" mood="Curious" />
        </div>

        <div>
          <h1 className="display-m">{name.trim()} is yours.</h1>
          <p className="body pk-muted" style={{ marginTop: "var(--space-3)" }}>
            They live in your account from now on. If you ever want them recorded on-chain, that is
            one tap in Settings — and nothing about them changes when you do.
          </p>
        </div>

        <WalletState mode="guest" body="No wallet needed. Everything in Pawket works from here." />

        <Button label="Take them home" size="lg" full icon="home" onClick={() => router.push("/home")} />

        <p className="caption pk-faint" style={{ textAlign: "center" }}>
          You can set up on-chain ownership any time. It is never required.
        </p>
      </Stack>
    </Screen>
  );
}
