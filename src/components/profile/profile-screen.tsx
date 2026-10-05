"use client";

import { useEffect, useState } from "react";
import { Field, Screen, ScreenBar, Stack, Tabs, Waiting } from "@/components/pk";
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
import { formatUtcDate } from "@/lib/utils/format";
import { LookEditor } from "./look-editor";
import { EmptyShelf, PetsShelf } from "./pets-shelf";
import { Settings } from "./settings";
import { StickerBook } from "./sticker-book";
import { Wardrobe } from "./wardrobe";

export type ProfileTab = "pets" | "wardrobe" | "stickers" | "settings";

const TABS: Array<{ key: ProfileTab; label: string; href: string }> = [
  { key: "pets", label: "Pets", href: "/profile#shelf" },
  { key: "wardrobe", label: "Wardrobe", href: "/profile?tab=wardrobe#shelf" },
  { key: "stickers", label: "Stickers", href: "/profile?tab=stickers#shelf" },
  { key: "settings", label: "Settings", href: "/profile?tab=settings#shelf" },
];

/**
 * You. The room first — you and the pet at home, as Home draws it — with
 * your name and what you have done together on a plate at its foot. Then
 * everything about how you look, which the room shows as you change it.
 * Then everything you keep: your pets, the wardrobe, the stickers their
 * records have earned, and the rooms and settings of this device.
 */
export function ProfileScreen({ tab }: { tab: ProfileTab }) {
  const companion = useCompanion();
  const { ready, pet } = companion;
  const look = usePlayerLook();
  const profile = usePlayerProfile();
  const sender = usePawketSend();
  const [roomState, setRoomState] = useState<RoomState>("loading");
  const [connecting, setConnecting] = useState(false);
  const [nameNotice, setNameNotice] = useState<string>();
  // Came to change how you look (Home's Look, #look): the editor starts open.
  const [lookOpen] = useState(() => typeof window !== "undefined" && window.location.hash === "#look");
  // Hooks run before the early return below: what others did with these pets on Solana.
  const social = useSocialRecords(companion.owned.map((entry) => entry.pet.address));

  // The page is drawn once the pets are read, after the browser has looked for
  // #look or #shelf; land on it then.
  useEffect(() => {
    if (ready && window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, [ready]);

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

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l" style={{ overflowWrap: "anywhere" }}>
            {name || "You"}
          </h1>
          <p className="caption pk-faint">
            {pets.length === 0
              ? "No pets yet"
              : `Keeper of ${pets.length} ${pets.length === 1 ? "pet" : "pets"}${since ? ` since ${formatUtcDate(since)}` : ""}`}
          </p>
        </div>
      </ScreenBar>

      <Stack gap={3}>
        <Room
          pet={
            pet && projected
              ? { ...petLook(pet, projected.mood), species: pet.species, name: pet.name, mood: projected.mood }
              : null
          }
          look={look}
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
            placeholder="What should your pets call you?"
            value={profile.name}
            onChange={(event) =>
              setNameNotice(saveProfile({ ...profile, name: event.target.value }) ? undefined : "This browser did not store that.")
            }
            error={nameNotice}
            className="pk-plate__name"
          />
          <dl className="pk-plate__stats">
            <Stat label={pets.length === 1 ? "Pet" : "Pets"} value={pets.length} />
            <Stat label="Top level" value={topLevel} />
            <Stat label="Best run" value={bestRun} unit={bestRun === 1 ? "day" : "days"} />
            <Stat label="Rounds" value={rounds} />
            <Stat label="Stickers" value={stickers} />
          </dl>
        </section>

        <section id="look" className="pk-anchor">
          <LookEditor
            look={look}
            open={lookOpen}
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
                  ? "On Solana and in this browser"
                  : "Kept on Solana"
                : "Saved in this browser"}
            </span>
          </div>
          <Tabs label="What you keep" active={tab} items={TABS} />
          <div key={tab} className="pk-swap-in">
            {tab === "pets" ? pets.length > 0 ? <PetsShelf companion={companion} onConnect={() => setConnecting(true)} /> : <EmptyShelf /> : null}
            {tab === "wardrobe" ? pet ? <Wardrobe companion={companion} sender={sender} /> : <EmptyShelf /> : null}
            {tab === "stickers" ? <StickerBook pets={pets} onChain={onChain} inGuild={inGuild} social={social.data} /> : null}
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
        <span className="amount-sm">{value}</span>
        {unit ? <span className="caption pk-faint"> {unit}</span> : null}
      </dd>
    </div>
  );
}
