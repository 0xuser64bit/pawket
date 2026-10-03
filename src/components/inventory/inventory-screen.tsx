"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  Columns,
  EmptyState,
  ItemTile,
  PetFrame,
  Screen,
  ScreenBar,
  SectionLabel,
  Stack,
  Tabs,
  WearableArt,
  Waiting,
} from "@/components/pk";
import { TxReceipt } from "@/components/wallet/tx-receipt";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { getPublicEnv } from "@/config/env";
import { WEARABLES, findWearable } from "@/lib/closet/catalog";
import { useCompanion } from "@/lib/companion/use-companion";
import { SPECIES_LABEL, SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { calculateLevelFromXp } from "@/lib/game/math";
import { projectGuestPet, setWearing, type GuestPet } from "@/lib/guest/pet";
import { readPet, savePet } from "@/lib/guest/storage";
import { toCompanionRecord, wearableSlot } from "@/lib/solana/accounts";
import { getDressInstruction } from "@/lib/solana/instructions";
import { usePawketSend } from "@/lib/solana/use-send";
import { useEyesFollow } from "@/lib/utils/use-eyes-follow";

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
  /** A piece being tried on in the mirror (null: nothing on), before it is worn. */
  const [trying, setTrying] = useState<string | null | undefined>(undefined);
  const room = useRef<HTMLDivElement>(null);
  useEyesFollow(room);
  const shown = trying !== undefined ? trying : (pet?.wearing ?? null);

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
    const current = pet ? readPet(pet.id) : null;
    if (!current) return;
    if (!savePet(setWearing(current, id))) {
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
              ? companion.guests.length
                ? "On Solana and in this browser"
                : "Kept on Solana"
              : "Saved in this browser"}
          </span>
        )}
      </ScreenBar>

      <Stack gap={4}>
        <Tabs label="What you keep" active={tab} items={TABS} />

        {!ready ? <Waiting label="Opening the shelf" /> : null}

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

            {companion.guests.length > 0 ? (
              <Stack gap={3}>
                <SectionLabel count={`${companion.guests.length}`}>In this browser</SectionLabel>
                <div className="pk-cards">
                  {companion.guests.map((entry) => (
                    <BrowserPetCard
                      key={entry.id}
                      pet={entry}
                      home={entry.id === pet?.id}
                      onHome={() => {
                        companion.choose(entry.id);
                        router.push("/home");
                      }}
                    />
                  ))}
                </div>
              </Stack>
            ) : null}

            {companion.guests.length === 0 && companion.owned.length === 0 ? (
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
          pet ? (
            <div ref={room}>
              <Columns
                pin
                split="portrait"
                first={
                  <div className="pk-mirror">
                    <div className="pk-mirror__glass" data-eyes>
                      <PetFrame
                        {...petLook({ ...pet, wearing: shown }, projectGuestPet(pet).mood)}
                        sky={SPECIES_SKY[pet.species]}
                        size="lg"
                      />
                    </div>
                    <p className="body-sm pk-muted" aria-live="polite">
                      {trying !== undefined && trying !== pet.wearing
                        ? trying
                          ? `Trying on the ${findWearable(trying)?.name.toLowerCase()}. Tap it to keep it on.`
                          : `Trying ${pet.name} with nothing on.`
                        : worn
                          ? `${pet.name} is wearing the ${worn.name.toLowerCase()}.`
                          : `${pet.name} is wearing nothing yet.`}
                    </p>
                  </div>
                }
                second={
                  <Stack gap={3}>
                    <SectionLabel count={`${WEARABLES.length}`}>Free to wear</SectionLabel>
                    <p className="body-sm pk-muted">
                      One at a time. Point at a piece to try it on; tap it to wear it. It changes how{" "}
                      {pet.name} looks, never a vital, a cooldown or a score.
                      {active ? " On Solana, changing it is a signed record; Pawket pays the fee." : ""}
                    </p>
                    <div className="pk-tiles" onPointerLeave={() => setTrying(undefined)}>
                      {WEARABLES.map((item) => {
                        const on = pet.wearing === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="pk-tile-hit"
                            aria-pressed={on}
                            disabled={sender.busy}
                            onPointerEnter={() => setTrying(on ? undefined : item.id)}
                            onFocus={() => setTrying(on ? undefined : item.id)}
                            onBlur={() => setTrying(undefined)}
                            onClick={() => {
                              setTrying(undefined);
                              void wear(item.id);
                            }}
                          >
                            <ItemTile
                              name={item.name}
                              kind={on ? "Wearing" : item.kind}
                              art={<WearableArt id={item.id} className="pk-tile__piece" />}
                              equipped={on}
                            />
                          </button>
                        );
                      })}
                    </div>
                    {worn ? (
                      <div>
                        <Button
                          label={`Take off the ${worn.name.toLowerCase()}`}
                          tone="ghost"
                          size="sm"
                          disabled={sender.busy}
                          onClick={() => void wear(worn.id)}
                        />
                      </div>
                    ) : null}
                    {active ? <TxReceipt tx={sender.tx} cluster={cluster} /> : null}
                    <p role="status" className="body-sm" style={{ color: "var(--alarm-text)" }}>
                      {notice}
                    </p>
                  </Stack>
                }
              />
            </div>
          ) : (
            <Stack gap={3}>
              <SectionLabel count={`${WEARABLES.length}`}>Free to wear</SectionLabel>
              <div className="pk-tiles">
                {WEARABLES.map((item) => (
                  <ItemTile key={item.id} name={item.name} kind={item.kind} art={<WearableArt id={item.id} className="pk-tile__piece" />} />
                ))}
              </div>
              <ButtonLink label="Adopt a pet to wear one" href="/adopt" icon="paw" />
            </Stack>
          )
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

function BrowserPetCard({ pet, home, onHome }: { pet: GuestPet; home: boolean; onHome: () => void }) {
  const { level, mood } = projectGuestPet(pet);
  return (
    <Card variant="flush">
      <Link href={`/pet/${pet.id}`} className="pk-card__art" aria-label={`${pet.name}'s record`}>
        <PetFrame {...petLook(pet, mood)} sky={SPECIES_SKY[pet.species]} level={level} size="fluid" still />
      </Link>
      <div className="pk-card__body">
        <h2 className="title">{pet.name}</h2>
        <p className="caption pk-faint">
          Level {level} · {SPECIES_LABEL[pet.species]}
        </p>
        <div style={{ marginTop: "var(--space-3)" }}>
          {home ? (
            <Chip label="At home" tone="pool" icon="home" />
          ) : (
            <Button label="Bring home" icon="home" tone="quiet" size="sm" onClick={onHome} />
          )}
        </div>
      </div>
    </Card>
  );
}
