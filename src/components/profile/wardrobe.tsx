"use client";

import { useRef, useState } from "react";
import { Button, Columns, ItemTile, PetFrame, SectionLabel, Stack, WearableArt } from "@/components/pk";
import { PetSwitcher } from "@/components/home/pet-switcher";
import { TxReceipt } from "@/components/wallet/tx-receipt";
import { getPublicEnv } from "@/config/env";
import { WEARABLES, findWearable, isUnlocked } from "@/lib/closet/catalog";
import { BADGES, badgesFor } from "@/lib/game/badges";
import type { CompanionState } from "@/lib/companion/use-companion";
import { SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { projectGuestPet, setWearing } from "@/lib/guest/pet";
import { readPet, savePet } from "@/lib/guest/storage";
import { wearableSlot } from "@/lib/solana/accounts";
import { getDressInstruction } from "@/lib/solana/instructions";
import type { PawketSender } from "@/lib/solana/use-send";
import { useEyesFollow } from "@/lib/utils/use-eyes-follow";

/**
 * The dressing room: any of your pets in the mirror, trying on whatever the
 * pointer or focus rests on before a tap wears it. Clothes are free and
 * change nothing but looks; on Solana, putting one on is a signed record.
 */
export function Wardrobe({ companion, sender }: { companion: CompanionState; sender: PawketSender }) {
  const cluster = getPublicEnv().solanaCluster;
  const [chosen, setChosen] = useState<string | null>(null);
  const pet = companion.all.find((p) => p.id === chosen) ?? companion.pet;
  const chain = companion.owned.find((entry) => entry.pet.address === pet?.id) ?? null;
  const worn = findWearable(pet?.wearing);
  const [notice, setNotice] = useState<string>();
  /** A piece being tried on in the mirror (null: nothing on), before it is worn. */
  const [trying, setTrying] = useState<string | null | undefined>(undefined);
  const room = useRef<HTMLDivElement>(null);
  useEyesFollow(room);
  if (!pet) return null;
  const shown = trying !== undefined ? trying : pet.wearing;
  const stickers = badgesFor(pet, { onChain: chain !== null, guild: Boolean(chain?.member) });
  const open = WEARABLES.filter((item) => isUnlocked(item, stickers)).length;

  async function wear(id: string) {
    if (!pet) return;
    if (chain) {
      const next = setWearing(pet, id).wearing;
      const item = findWearable(next ?? id);
      const result = await sender.send(
        next ? `Put the ${item?.name.toLowerCase()} on ${pet.name}` : `Take the ${item?.name.toLowerCase()} off ${pet.name}`,
        ({ owner }) => [getDressInstruction({ owner, pet: chain.pet.address, wearing: wearableSlot(next) })],
      );
      if (result) companion.refresh();
      return;
    }
    const current = readPet(pet.id);
    if (!current) return;
    setNotice(savePet(setWearing(current, id)) ? undefined : "This browser did not store that.");
  }

  return (
    <div ref={room}>
      <Stack gap={4}>
        {companion.all.length > 1 ? (
          <div className="pk-spread">
            <span className="label pk-faint">Dressing</span>
            <PetSwitcher
              pets={companion.all}
              home={pet.id}
              onChoose={(id) => {
                setTrying(undefined);
                setChosen(id);
              }}
              label="Who is being dressed"
              chooseLabel={(p) => `Dress ${p.name}`}
              chosenLabel={(p) => `${p.name}, in the mirror`}
              adopt={false}
            />
          </div>
        ) : null}
        <Columns
          pin
          split="portrait"
          first={
            <div className="pk-mirror">
              <div className="pk-mirror__glass" data-eyes>
                {/* A piece going on (or off) is seen going on: the pet pops into it. */}
                <div key={`${pet.id}:${shown ?? "none"}`} className="pk-pop-in">
                  <PetFrame {...petLook({ ...pet, wearing: shown }, projectGuestPet(pet).mood)} sky={SPECIES_SKY[pet.species]} size="lg" />
                </div>
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
              <SectionLabel count={`${open} / ${WEARABLES.length}`}>Free to wear</SectionLabel>
              <p className="body-sm pk-muted">
                One at a time. Point at a piece to try it on; tap it to wear it. It changes how {pet.name} looks,
                never a vital, a cooldown or a score. A few are earned by {pet.name}&apos;s stickers, never bought.
                {chain ? " On Solana, changing it is a signed record." : ""}
              </p>
              <div className="pk-tiles" onPointerLeave={() => setTrying(undefined)}>
                {WEARABLES.map((item) => {
                  const on = pet.wearing === item.id;
                  const earned = isUnlocked(item, stickers);
                  const badge = BADGES.find((b) => b.id === item.earnedBy);
                  if (!earned) {
                    return (
                      <div key={item.id} className="pk-tile-hit pk-tile-hit--locked" title={badge?.how}>
                        <ItemTile
                          name={item.name}
                          kind={`Earned by ${badge?.name ?? "a sticker"}`}
                          art={<WearableArt id={item.id} className="pk-tile__piece" />}
                        />
                        <span className="pk-sr">Not earned yet. {badge?.how}</span>
                      </div>
                    );
                  }
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
              {chain ? <TxReceipt tx={sender.tx} cluster={cluster} /> : null}
              <p role="status" className="body-sm" style={{ color: "var(--alarm-text)" }}>
                {notice}
              </p>
            </Stack>
          }
        />
      </Stack>
    </div>
  );
}
