"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink, Columns, ItemTile, PetFrame, SectionLabel, Stack, WearableArt } from "@/components/pk";
import { PetSwitcher } from "@/components/home/pet-switcher";
import { MARKET_WEARABLES, WEARABLES, findWearable, wearableItem } from "@/lib/closet/catalog";
import type { CompanionState } from "@/lib/companion/use-companion";
import { SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { projectGuestPet, setWearing } from "@/lib/guest/pet";
import { readPet, savePet } from "@/lib/guest/storage";
import { wearableSlot } from "@/lib/solana/accounts";
import { useCloset } from "@/lib/market/use-closet";
import {
  getDressInstruction,
  getDressOwnedInstruction,
} from "@/lib/solana/instructions";
import { deriveClosetPda } from "@/lib/solana/pda";
import { WEARABLE_COUNT } from "@/lib/solana/program";
import type { PawketSender } from "@/lib/solana/use-send";
import { useEyesFollow } from "@/lib/utils/use-eyes-follow";
import { useHere } from "@/lib/native/android";

/**
 * The dressing room: any of your pets in the mirror, trying on whatever the
 * pointer or focus rests on before a tap wears it. Clothes change nothing
 * but looks; on Solana, putting one on is a signed record. Three are
 * free; the Market's nineteen are worn by a pet on Solana once its owner's
 * closet holds them — the program checks the closet, not this screen.
 */
export function Wardrobe({ companion, sender }: { companion: CompanionState; sender: PawketSender }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const pet = companion.all.find((p) => p.id === chosen) ?? companion.pet;
  const chain = companion.owned.find((entry) => entry.pet.address === pet?.id) ?? null;
  const worn = findWearable(pet?.wearing);
  const [notice, setNotice] = useState<string>();
  const { Here } = useHere();
  /** A piece being tried on in the mirror (null: nothing on), before it is worn. */
  const [trying, setTrying] = useState<string | null | undefined>(undefined);
  const room = useRef<HTMLDivElement>(null);
  const closet = useCloset(companion.owner);
  const bought = new Set(closet.data?.items ?? []);
  useEyesFollow(room);
  if (!pet) return null;
  const shown = trying !== undefined ? trying : pet.wearing;
  const free = WEARABLES.filter((item) => !item.price);
  const collected = MARKET_WEARABLES.filter((item) => bought.has(wearableItem(item.id)));

  async function wear(id: string) {
    if (!pet) return;
    if (chain) {
      const next = setWearing(pet, id).wearing;
      const item = findWearable(next ?? id);
      const slot = wearableSlot(next);
      // A Market piece goes on with `dress_owned`, which reads the owner's closet; the starters with `dress`.
      const closetAddress = slot > WEARABLE_COUNT ? (await deriveClosetPda(chain.pet.owner)).address : null;
      const result = await sender.act(
        next ? `Put the ${item?.name.toLowerCase()} on ${pet.name}` : `Take the ${item?.name.toLowerCase()} off ${pet.name}`,
        ({ owner }) => [
          closetAddress
            ? getDressOwnedInstruction({ owner, pet: chain.pet.address, closet: closetAddress, wearing: slot })
            : getDressInstruction({ owner, pet: chain.pet.address, wearing: slot }),
        ],
      );
      if (result) companion.refresh();
      return;
    }
    const current = readPet(pet.id);
    if (!current) return;
    setNotice(savePet(setWearing(current, id)) ? undefined : `${Here} did not store that.`);
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
              <SectionLabel count={`${free.length}`}>Free to wear</SectionLabel>
              <p className="body-sm pk-muted">
                One at a time.{" "}
                <span className="pk-if-hover">Point at a piece to try it on; click it to wear it.</span>
                <span className="pk-if-touch">Tap a piece and {pet.name} wears it.</span> It changes how {pet.name} looks,
                never a vital, a cooldown or a score. Find more looks in the Market.
                {chain ? " On Solana, changing it is a signed record." : ""}
              </p>
              <div className="pk-tiles" onPointerLeave={() => setTrying(undefined)}>
                {free.map((item) => {
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
              <SectionLabel count={`${collected.length}`}>
                From the Market
              </SectionLabel>
              <p className="body-sm pk-muted">
                Bought once with SOL, worn by any of your pets on Solana. Looks only, like the rest.
              </p>
              <div className="pk-tiles" onPointerLeave={() => setTrying(undefined)}>
                {collected.map((item) => {
                  const on = pet.wearing === item.id;
                  const tile = (kind: string) => (
                    <ItemTile
                      name={item.name}
                      kind={kind}
                      rarity="foil"
                      art={<WearableArt id={item.id} className="pk-tile__piece" />}
                      equipped={on}
                    />
                  );
                  if (chain) {
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
                      href="/home"
                      className="pk-tile-hit"
                      onPointerEnter={() => setTrying(item.id)}
                      onFocus={() => setTrying(item.id)}
                      onBlur={() => setTrying(undefined)}
                    >
                      {tile(`Keep ${pet.name} on Solana to wear it`)}
                    </Link>
                  );
                })}
              </div>
              <ButtonLink label="Explore the Market" tone="quiet" size="sm" href="/market" />
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
