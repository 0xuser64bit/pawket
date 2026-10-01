"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
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
  WearableArt,
} from "@/components/pk";
import { CarryCard } from "@/components/home/carry-card";
import { TxReceipt } from "@/components/wallet/tx-receipt";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { getPublicEnv } from "@/config/env";
import { WEARABLES, findWearable } from "@/lib/closet/catalog";
import { useCompanion } from "@/lib/companion/use-companion";
import { SPECIES_LABEL, SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { calculateLevelFromXp } from "@/lib/game/math";
import { projectGuestPet, setWearing, type GuestPet } from "@/lib/guest/pet";
import { readGuestPetSnapshot, saveGuestPet } from "@/lib/guest/storage";
import { toCompanionRecord, wearableSlot } from "@/lib/solana/accounts";
import { getDressInstruction } from "@/lib/solana/instructions";
import { usePawketSend } from "@/lib/solana/use-send";

const TABS = [
  { key: "pet", label: "Pets", href: "/inventory" },
  { key: "wardrobe", label: "Wardrobe", href: "/inventory?tab=wardrobe" },
];

/**
 * The pets you keep — on Solana, if a wallet is connected, and in this
 * browser — and the clothes the one in play can wear. Clothes are free and
 * have no effect on vitals; on Solana, putting one on is a signed record.
 */
export function InventoryScreen({ tab }: { tab: "pet" | "wardrobe" }) {
  const companion = useCompanion();
  const { ready, pet, active } = companion;
  const router = useRouter();
  const sender = usePawketSend();
  const cluster = getPublicEnv().solanaCluster;
  const worn = findWearable(pet?.wearing);
  const [notice, setNotice] = useState<string>();
  const [connecting, setConnecting] = useState(false);

  async function wear(id: string) {
    if (active && pet) {
      const next = setWearing(pet, id).wearing;
      const item = findWearable(next ?? id);
      const result = await sender.send(
        next ? `Put the ${item?.name.toLowerCase()} on ${pet.name}` : `Take the ${item?.name.toLowerCase()} off ${pet.name}`,
        ({ owner }) => [getDressInstruction({ owner, pet: active.pet.address, wearing: wearableSlot(next) })],
      );
      if (result) companion.refresh();
      return;
    }
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
          <span className="caption pk-faint">
            {companion.owned.length > 0
              ? companion.guest
                ? "On Solana and in this browser"
                : "Kept on Solana"
              : "Saved in this browser"}
          </span>
        )}
      </ScreenBar>

      <Stack gap={4}>
        <Tabs label="What you keep" active={tab} items={TABS} />

        {!ready ? <p className="body-sm pk-faint">Opening the shelf.</p> : null}

        {ready && tab === "pet" ? (
          <Stack gap={6}>
            {companion.owned.length > 0 ? (
              <Stack gap={3}>
                <SectionLabel count={`${companion.owned.length}`}>On Solana</SectionLabel>
                <div className="pk-cards">
                  {companion.owned.map((entry) => {
                    const inPlay = entry.pet.address === active?.pet.address;
                    return (
                      <Card key={entry.pet.address} variant="flush">
                        <Link href={`/pet/${entry.pet.address}`} className="pk-card__art" aria-label={`${entry.pet.name}'s record`}>
                          <PetFrame
                            {...petLook(toCompanionRecord(entry), projectGuestPet(toCompanionRecord(entry)).mood)}
                            sky={SPECIES_SKY[entry.pet.species]}
                            level={calculateLevelFromXp(entry.pet.xp)}
                            size="fluid"
                            still
                          />
                        </Link>
                        <div className="pk-card__body">
                          <h2 className="title">{entry.pet.name}</h2>
                          <p className="caption pk-faint">
                            Level {calculateLevelFromXp(entry.pet.xp)} · {SPECIES_LABEL[entry.pet.species]}
                          </p>
                          <div style={{ marginTop: "var(--space-3)" }}>
                            {inPlay ? (
                              <Chip label="At home" tone="pool" icon="home" />
                            ) : (
                              <Button
                                label="Bring home"
                                icon="home"
                                tone="quiet"
                                size="sm"
                                onClick={() => {
                                  companion.choose(entry.pet.address);
                                  router.push("/home");
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </Stack>
            ) : companion.owner ? null : (
              <Card variant="quiet">
                <h2 className="title">Pets on Solana</h2>
                <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
                  A pet kept on Solana belongs to a wallet. Connect it, and every pet it keeps shows here.
                </p>
                <div style={{ marginTop: "var(--space-4)" }}>
                  <Button label="Connect a wallet" icon="wallet" tone="quiet" size="sm" onClick={() => setConnecting(true)} />
                </div>
              </Card>
            )}

            {companion.guest ? (
              <Stack gap={3}>
                <SectionLabel count="1">In this browser</SectionLabel>
                <div className="pk-cards">
                  <BrowserPetCard pet={companion.guest} />
                </div>
                {active && companion.canSign ? (
                  <CarryCard
                    pet={companion.guest}
                    owner={companion.owner}
                    canSign={companion.canSign}
                    sender={sender}
                    onCarried={(address) => {
                      companion.choose(address);
                      companion.refresh();
                      router.push("/home");
                    }}
                  />
                ) : null}
              </Stack>
            ) : null}

            {!companion.guest && companion.owned.length === 0 ? (
              <EmptyState
                icon="paw"
                title="The shelf is empty"
                body="Adopting takes three taps. The pet starts out in this browser, and can move onto Solana when you like."
                action={<ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />}
              />
            ) : null}
          </Stack>
        ) : null}

        {ready && tab === "wardrobe" ? (
          <Stack gap={3}>
            <SectionLabel count={`${WEARABLES.length}`}>Free to wear</SectionLabel>
            <p className="body-sm pk-muted">
              One at a time. A look is a description beside your pet. It does not change a vital, a
              cooldown, or a score.{active ? " On Solana, changing it is a signed record; Pawket pays the fee." : ""}
            </p>
            <div className="pk-tiles">
              {WEARABLES.map((item) => {
                const on = pet?.wearing === item.id;
                const tile = (
                  <ItemTile name={item.name} kind={item.kind} art={<WearableArt id={item.id} className="pk-tile__piece" />} equipped={on} />
                );
                if (!pet) return <div key={item.id}>{tile}</div>;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="pk-tile-hit"
                    aria-pressed={on}
                    disabled={sender.busy}
                    onClick={() => void wear(item.id)}
                  >
                    {tile}
                  </button>
                );
              })}
            </div>
            {pet ? null : (
              <ButtonLink label="Adopt a pet to wear one" href="/adopt" icon="paw" />
            )}
            {active ? <TxReceipt tx={sender.tx} cluster={cluster} /> : null}
            <p role="status" className="body-sm" style={{ color: "var(--alarm-text)" }}>
              {notice}
            </p>
          </Stack>
        ) : null}
      </Stack>
      {connecting ? (
        <WalletSheet
          why="Connect the wallet that keeps your pets. Pawket reads them from Solana; nothing is signed by connecting."
          onDismiss={() => setConnecting(false)}
        />
      ) : null}
    </Screen>
  );
}

function BrowserPetCard({ pet }: { pet: GuestPet }) {
  const { level, mood } = projectGuestPet(pet);
  return (
    <Card href={`/pet/${pet.id}`} variant="flush">
      <div className="pk-card__art">
        <PetFrame {...petLook(pet, mood)} sky={SPECIES_SKY[pet.species]} level={level} size="fluid" still />
      </div>
      <div className="pk-card__body">
        <h2 className="title">{pet.name}</h2>
        <p className="caption pk-faint">
          Level {level} · {SPECIES_LABEL[pet.species]}
        </p>
      </div>
    </Card>
  );
}
