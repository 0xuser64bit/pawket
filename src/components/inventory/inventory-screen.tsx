"use client";

import { useState } from "react";
import {
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  ItemTile,
  PetFrame,
  Screen,
  ScreenBar,
  SectionLabel,
  Stack,
  Tabs,
} from "@/components/pk";
import { WEARABLES, findWearable } from "@/lib/closet/catalog";
import { SPECIES_ART, SPECIES_LABEL, SPECIES_SKY } from "@/lib/game/appearance";
import { projectGuestPet, setWearing } from "@/lib/guest/pet";
import { useGuestPet } from "@/lib/guest/use-guest-pet";
import { readGuestPetSnapshot, saveGuestPet } from "@/lib/guest/storage";

const TABS = [
  { key: "pet", label: "Pet", href: "/inventory" },
  { key: "wardrobe", label: "Wardrobe", href: "/inventory?tab=wardrobe" },
];

/**
 * The one pet in this browser, and the clothes they can wear. Clothes are
 * free and have no effect on vitals.
 */
export function InventoryScreen({ tab }: { tab: "pet" | "wardrobe" }) {
  const { ready, pet } = useGuestPet();
  const worn = findWearable(pet?.wearing);
  const level = pet ? projectGuestPet(pet).level : null;
  const [notice, setNotice] = useState<string>();

  function wear(id: string) {
    const current = readGuestPetSnapshot();
    if (!current) return;
    if (!saveGuestPet(setWearing(current, id))) {
      setNotice("This browser did not store that.");
      return;
    }
    setNotice(undefined);
  }

  return (
    <Screen>
      <ScreenBar>
        <h1 className="display-l">Inventory</h1>
        {pet && tab === "wardrobe" ? (
          <Chip label={worn ? `On ${pet.name}` : pet.name} tone="sun" icon="paw" />
        ) : (
          <span className="caption pk-faint">Saved in this browser</span>
        )}
      </ScreenBar>

      <Stack gap={4}>
        <Tabs label="What you keep" active={tab} items={TABS} />

        {!ready ? <p className="body-sm pk-faint">Opening the shelf.</p> : null}

        {ready && tab === "pet" ? (
          pet ? (
            <Stack gap={3}>
              <SectionLabel count="1">Your pet</SectionLabel>
              <div className="pk-cards">
                <Card href={`/pet/${pet.id}`} variant="flush">
                  <div className="pk-card__art">
                    <PetFrame
                      form={SPECIES_ART[pet.species]}
                      sky={SPECIES_SKY[pet.species]}
                      level={level ?? 1}
                      size="fluid"
                      still
                    />
                  </div>
                  <div className="pk-card__body">
                    <h2 className="title">{pet.name}</h2>
                    <p className="caption pk-faint">
                      Level {level} · {SPECIES_LABEL[pet.species]}
                    </p>
                  </div>
                </Card>
              </div>
            </Stack>
          ) : (
            <EmptyState
              icon="paw"
              title="The shelf is empty"
              body="Adopting takes three taps. This browser keeps one pet, and only that pet."
              action={<ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />}
            />
          )
        ) : null}

        {ready && tab === "wardrobe" ? (
          <Stack gap={3}>
            <SectionLabel count={`${WEARABLES.length}`}>Free to wear</SectionLabel>
            <p className="body-sm pk-muted">
              One at a time. A look is a description beside your pet. It does not change a vital, a
              cooldown, or a score.
            </p>
            <div className="pk-tiles">
              {WEARABLES.map((item) => {
                const on = pet?.wearing === item.id;
                const tile = (
                  <ItemTile name={item.name} kind={item.kind} icon={item.icon} equipped={on} />
                );
                if (!pet) return <div key={item.id}>{tile}</div>;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="pk-tile-hit"
                    aria-pressed={on}
                    onClick={() => wear(item.id)}
                  >
                    {tile}
                  </button>
                );
              })}
            </div>
            {pet ? null : (
              <ButtonLink label="Adopt a pet to wear one" href="/adopt" icon="paw" />
            )}
            <p role="status" className="body-sm" style={{ color: "var(--alarm-text)" }}>
              {notice}
            </p>
          </Stack>
        ) : null}
      </Stack>
    </Screen>
  );
}
