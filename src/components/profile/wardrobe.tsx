"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, Columns, ItemTile, PetFrame, SectionLabel, Stack, WearableArt } from "@/components/pk";
import { PetSwitcher } from "@/components/home/pet-switcher";
import { TxReceipt } from "@/components/wallet/tx-receipt";
import { getPublicEnv } from "@/config/env";
import { MARKET_WEARABLES, WEARABLES, findWearable, isUnlocked, wearableItem } from "@/lib/closet/catalog";
import { BADGES, badgesFor } from "@/lib/game/badges";
import type { CompanionState } from "@/lib/companion/use-companion";
import { SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { projectGuestPet, setWearing } from "@/lib/guest/pet";
import { readPet, savePet } from "@/lib/guest/storage";
import { wearableSlot } from "@/lib/solana/accounts";
import { useCloset } from "@/lib/market/use-closet";
import {
  getDressByDeviceInstruction,
  getDressInstruction,
  getDressOwnedByDeviceInstruction,
  getDressOwnedInstruction,
} from "@/lib/solana/instructions";
import { deriveClosetPda } from "@/lib/solana/pda";
import { WEARABLE_COUNT } from "@/lib/solana/program";
import { formatUnits } from "@/lib/utils/format";
import type { PawketSender } from "@/lib/solana/use-send";
import { useEyesFollow } from "@/lib/utils/use-eyes-follow";

/**
 * The dressing room: any of your pets in the mirror, trying on whatever the
 * pointer or focus rests on before a tap wears it. Clothes change nothing
 * but looks; on Solana, putting one on is a signed record. The eighteen are
 * free; the Market's four are worn by a pet on Solana once its owner's
 * closet holds them — the program checks the closet, not this screen.
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
  const closet = useCloset(companion.owner);
  const bought = new Set(closet.data?.items ?? []);
  useEyesFollow(room);
  if (!pet) return null;
  const shown = trying !== undefined ? trying : pet.wearing;
  const stickers = badgesFor(pet, { onChain: chain !== null, guild: Boolean(chain?.member) });
  const free = WEARABLES.filter((item) => !item.price);
  const open = free.filter((item) => isUnlocked(item, stickers)).length;

  async function wear(id: string) {
    if (!pet) return;
    if (chain) {
      const next = setWearing(pet, id).wearing;
      const item = findWearable(next ?? id);
      const slot = wearableSlot(next);
      // A Market piece goes on with `dress_owned`, which reads the owner's closet; the eighteen with `dress`.
      const closetAddress = slot > WEARABLE_COUNT ? (await deriveClosetPda(chain.pet.owner)).address : null;
      const result = await sender.act(
        next ? `Put the ${item?.name.toLowerCase()} on ${pet.name}` : `Take the ${item?.name.toLowerCase()} off ${pet.name}`,
        {
          byOwner: ({ owner }) => [
            closetAddress
              ? getDressOwnedInstruction({ owner, pet: chain.pet.address, closet: closetAddress, wearing: slot })
              : getDressInstruction({ owner, pet: chain.pet.address, wearing: slot }),
          ],
          byDevice: ({ device, wallet }) => [
            closetAddress
              ? getDressOwnedByDeviceInstruction({ device, wallet, pet: chain.pet.address, closet: closetAddress, wearing: slot })
              : getDressByDeviceInstruction({ device, wallet, pet: chain.pet.address, wearing: slot }),
          ],
        },
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
              <SectionLabel count={`${open} / ${free.length}`}>Free to wear</SectionLabel>
              <p className="body-sm pk-muted">
                One at a time. Point at a piece to try it on; tap it to wear it. It changes how {pet.name} looks,
                never a vital, a cooldown or a score. A few are earned by {pet.name}&apos;s stickers, never bought.
                {chain ? " On Solana, changing it is a signed record." : ""}
              </p>
              <div className="pk-tiles" onPointerLeave={() => setTrying(undefined)}>
                {free.map((item) => {
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
              <SectionLabel count={`${MARKET_WEARABLES.filter((item) => bought.has(wearableItem(item.id))).length} / ${MARKET_WEARABLES.length}`}>
                From the Market
              </SectionLabel>
              <p className="body-sm pk-muted">
                Bought once with SOL, worn by any of your pets on Solana. Looks only, like the rest.
              </p>
              <div className="pk-tiles" onPointerLeave={() => setTrying(undefined)}>
                {MARKET_WEARABLES.map((item) => {
                  const on = pet.wearing === item.id;
                  const owned = bought.has(wearableItem(item.id));
                  const tile = (kind: string, price?: string) => (
                    <ItemTile
                      name={item.name}
                      kind={kind}
                      rarity="foil"
                      price={price}
                      art={<WearableArt id={item.id} className="pk-tile__piece" />}
                      equipped={on}
                    />
                  );
                  if (owned && chain) {
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
                        {tile(on ? "Wearing" : "Yours")}
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={item.id}
                      href="/market"
                      className="pk-tile-hit"
                      onPointerEnter={() => setTrying(item.id)}
                      onFocus={() => setTrying(item.id)}
                      onBlur={() => setTrying(undefined)}
                    >
                      {owned ? tile(`Keep ${pet.name} on Solana to wear it`) : tile("In the Market", `${formatUnits(item.price!, 9)} SOL`)}
                    </Link>
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
