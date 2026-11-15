"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banner, Button, Field, Problem, Screen, ScreenBar, Stack, Tabs, Waiting } from "@/components/pk";
import { Room, type RoomState } from "@/components/home/room";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { useCompanion } from "@/lib/companion/use-companion";
import { SPECIES_ART, SPECIES_LABEL, SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { badgesFor } from "@/lib/game/badges";
import { useSocialRecords } from "@/lib/companion/use-social";
import { calculateLevelFromXp } from "@/lib/game/math";
import { projectGuestPet } from "@/lib/guest/pet";
import { describeLook } from "@/lib/player/look";
import { MAX_PLAYER_NAME, saveProfile, usePlayerProfile } from "@/lib/player/profile";
import { usePlayerLook } from "@/lib/player/use-player-look";
import { usePawketSend } from "@/lib/solana/use-send";
import { formatLocalDate } from "@/lib/utils/format";
import { LookEditor } from "./look-editor";
import { EmptyShelf, PetsShelf } from "./pets-shelf";
import { PetCopy } from "./pet-copy";
import { Settings } from "./settings";
import { StickerBook } from "./sticker-book";
import { Wardrobe } from "./wardrobe";
import { useCoats } from "@/lib/player/use-coats";
import { useHere } from "@/lib/native/android";
import { shownDecor, useRoomDecor } from "@/lib/room/decor";
import { useCloset } from "@/lib/market/use-closet";

export type ProfileTab = "pets" | "wardrobe" | "stickers" | "settings";

const TABS: Array<{ key: ProfileTab; label: string; href: string }> = [
  { key: "pets", label: "Pets", href: "/profile#shelf" },
  { key: "wardrobe", label: "Wardrobe", href: "/profile?tab=wardrobe#shelf" },
  { key: "stickers", label: "Stickers", href: "/profile?tab=stickers#shelf" },
  { key: "settings", label: "Settings", href: "/profile?tab=settings#shelf" },
];

export function ProfileScreen() {
  const coatOf = useCoats();
  const queryTab = useSearchParams().get("tab");
  const tab = TABS.find((item) => item.key === queryTab)?.key ?? "pets";
  const companion = useCompanion();
  const chosenDecor = useRoomDecor();
  const closet = useCloset(companion.owner);
  const decor = shownDecor(chosenDecor, new Set(closet.data?.items ?? []));
  const { ready, pet } = companion;
  const look = usePlayerLook();
  const profile = usePlayerProfile();
  const sender = usePawketSend();
  const [roomState, setRoomState] = useState<RoomState>("loading");
  const [connecting, setConnecting] = useState(false);
  const [nameNotice, setNameNotice] = useState<string>();
  const [reloading, setReloading] = useState(false);
  const { here, Here } = useHere();
  const router = useRouter();
  const social = useSocialRecords(companion.owned.map((entry) => entry.pet.address));

  async function reloadPets() {
    setReloading(true);
    try {
      await companion.refresh();
    } finally {
      setReloading(false);
    }
  }

  useEffect(() => {
    if (!ready || !window.location.hash) return;
    const target = document.getElementById(window.location.hash.slice(1));
    const fold = window.location.hash === "#look" ? target?.querySelector("details") : null;
    if (fold) fold.open = true;
    target?.scrollIntoView();
  }, [ready, router.bfcacheId]);

  if (!ready) {
    return (
      <Screen>
        <ScreenBar>
          <h1 className="display-l">You</h1>
        </ScreenBar>
        <Waiting label="Opening your profile" />
      </Screen>
    );
  }

  const pets = companion.all;
  const onChain = new Set<string>(companion.owned.map((entry) => entry.pet.address));
  const inGuild = new Set<string>(companion.owned.filter((entry) => entry.member).map((entry) => entry.pet.address));
  const topLevel = Math.max(0, ...pets.map((p) => calculateLevelFromXp(p.xp)));
  const bestRun = Math.max(0, ...pets.map((p) => p.streak.best));
  const rounds = pets.reduce((sum, p) => sum + p.plays, 0);
  const stickers = new Set(
    pets.flatMap((p) =>
      badgesFor(p, { onChain: onChain.has(p.id), guild: inGuild.has(p.id), waves: social.data?.get(p.id)?.waves, gatherings: social.data?.get(p.id)?.gatherings }),
    ),
  ).size;
  const since = pets.map((p) => p.createdAt).sort()[0];
  const projected = pet ? projectGuestPet(pet) : null;
  const name = profile.name.trim();
  const partialStickers = Boolean(companion.chainError) || companion.owned.some((entry) => !social.data?.has(entry.pet.address));
  const unreadPets = Boolean(companion.owner) && (companion.reading || Boolean(companion.chainError)) && companion.owned.length === 0;
  const emptyShelf = unreadPets ? <p className="body-sm pk-muted">Your Solana pets have not been read yet.</p> : <EmptyShelf />;

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l" style={{ overflowWrap: "anywhere" }}>
            {name || "You"}
          </h1>
          <p className="caption pk-faint">
            {pets.length === 0
              ? unreadPets ? "Solana pets not read yet" : "No pets yet"
              : `Keeper of ${pets.length} ${pets.length === 1 ? "pet" : "pets"}${since ? ` since ${formatLocalDate(since)}` : ""}${companion.chainError ? " · Solana unavailable" : ""}`}
          </p>
        </div>
      </ScreenBar>

      <Stack gap={3}>
        {companion.reading ? <Waiting label="Reading your Solana pets" inline /> : null}
        {companion.chainError ? (
          <Banner
            tone="wait"
            title="Solana did not answer"
            body={`Your pets there are unchanged. ${companion.owned.length ? "Their last read is shown and may be behind." : "Only your local pets are shown."} Your pets in ${here} still work.`}
            action={<Button label="Reload Solana pets" tone="quiet" size="sm" disabled={reloading || companion.reading} onClick={() => void reloadPets()} />}
          />
        ) : null}
        <Room
          pet={
            pet && projected
              ? { ...petLook(pet, projected.mood), species: pet.species, name: pet.name, mood: projected.mood, coat: coatOf(pet) }
              : null
          }
          look={look}
          decor={decor}
          sky={pet ? SPECIES_SKY[pet.species] : "warm"}
          cue={null}
          description={`${describeLook(look)}${pet ? `, and ${pet.name} the ${SPECIES_LABEL[pet.species].toLowerCase()}` : ""}, in your room.`}
          onState={setRoomState}
          stage
        />

        <section className="pk-plate" aria-label="Your name and record">
          <Field
            label="Your name"
            name="player-name"
            icon="person"
            autoComplete="nickname"
            maxLength={MAX_PLAYER_NAME}
            placeholder="What should we call you?"
            value={profile.name}
            onChange={(event) =>
              setNameNotice(saveProfile({ ...profile, name: event.target.value }) ? undefined : `${Here} did not store that.`)
            }
            error={nameNotice}
            className="pk-plate__name"
          />
          <dl className="pk-plate__stats">
            <Stat label={pets.length === 1 ? "Pet" : "Pets"} value={pets.length} unit={unreadPets ? "known" : undefined} />
            <Stat label="Top level" value={topLevel} />
            <Stat label="Best run" value={bestRun} unit={bestRun === 1 ? "day" : "days"} />
            <Stat label="Rounds" value={rounds} />
            <Stat label="Stickers" value={stickers} unit={partialStickers ? "known" : undefined} />
          </dl>
        </section>

        <section id="look" className="pk-anchor">
          <LookEditor
            look={look}
            shown={roomState === "live" || roomState === "loading"}
            twin={pet ? { name: pet.name, wearing: pet.wearing } : undefined}
          />
        </section>

        <section id="shelf" className="pk-anchor pk-stack" style={{ gap: "var(--space-4)", marginTop: "var(--space-5)" }}>
          <div className="pk-spread">
            <h2 className="display-s">What you keep</h2>
            <span className="caption pk-faint">
              {companion.owned.length > 0
                ? companion.guests.length > 0
                  ? `On Solana and in ${here}`
                  : "Kept on Solana"
                : `Saved in ${here}`}
            </span>
          </div>
          <Tabs label="What you keep" active={tab} items={TABS} />
          <div key={tab} id={`pk-panel-${tab}`} role="tabpanel" aria-labelledby={`pk-tab-${tab}`} tabIndex={0} className="pk-swap-in">
            {tab === "pets" ? (
              <Stack gap={4}>
                {pets.length > 0 ? <PetsShelf companion={companion} onConnect={() => setConnecting(true)} /> : emptyShelf}
                <PetCopy companion={companion} />
              </Stack>
            ) : null}
            {tab === "wardrobe" ? pet ? <Wardrobe companion={companion} sender={sender} /> : emptyShelf : null}
            {tab === "stickers" ? (
              <Stack gap={3}>
                {social.status === "fetching" ? <Waiting label="Reading social stickers" inline /> : null}
                {social.error ? (
                  <Problem small>
                    Social stickers are unavailable. Solana did not answer for waves and gatherings.{" "}
                    <button type="button" className="pk-linkish" disabled={social.status === "fetching"} onClick={() => social.refresh()}>
                      Reload social stickers
                    </button>
                  </Problem>
                ) : null}
                <StickerBook pets={pets} onChain={onChain} inGuild={inGuild} social={social.data} chainUnavailable={Boolean(companion.chainError)} />
              </Stack>
            ) : null}
            {tab === "settings" ? <Settings form={pet ? SPECIES_ART[pet.species] : undefined} /> : null}
          </div>
        </section>
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

function Stat({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="pk-stat">
      <dt className="label pk-faint">{label}</dt>
      <dd>
        <span className="amount">{value}</span>
        {unit ? <span className="caption pk-faint"> {unit}</span> : null}
      </dd>
    </div>
  );
}
