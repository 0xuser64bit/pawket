"use client";

import { useCallback, useState } from "react";
import type { Address } from "@solana/kit";
import { BackLink, Screen, Stack } from "@/components/pk";
import { EmoteRow } from "@/components/home/emote-row";
import { Room } from "@/components/home/room";
import type { DirectorStatus } from "@/components/room3d/director";
import { findWearable } from "@/lib/closet/catalog";
import { SPECIES_LABEL, SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { projectGuestPet, type GuestPet } from "@/lib/guest/pet";
import { describeLook } from "@/lib/player/look";
import { usePlayerLook } from "@/lib/player/use-player-look";
import type { RoomCue } from "@/lib/room/moments";
import { Guestbook } from "./guestbook";
import { nameHeadingClass } from "@/lib/utils/format";

export function VisitRoom({
  record,
  address,
  owner,
  waves,
  recent,
  today,
}: {
  record: GuestPet;
  address: Address;
  owner: Address;
  waves: number;
  recent: Array<{ visitor: Address; at: number }>;
  today: number;
}) {
  const look = usePlayerLook();
  const [moment] = useState(() => new Date());
  const [cue, setCue] = useState<RoomCue | null>(null);
  const [status, setStatus] = useState<DirectorStatus>({ moment: null, sentence: "" });
  const onStatus = useCallback((next: DirectorStatus) => setStatus(next), []);
  const projected = projectGuestPet(record, moment);
  const worn = findWearable(record.wearing);
  const play = (id: string) => setCue({ moment: id, nonce: Date.now() });

  return (
    <Screen>
      <BackLink label={record.name} href={`/pet/${address}`} />
      <Stack gap={4}>
        <div>
          <h1 className={nameHeadingClass(record.name)} style={{ overflowWrap: "anywhere" }}>
            Visiting {record.name}
          </h1>
          <p className="body-sm pk-muted" style={{ marginTop: "var(--space-1)" }}>
            {SPECIES_LABEL[record.species]} · level {projected.level} · kept on Solana. Wave, dance, say hello — only{" "}
            {record.name}&apos;s owner can care for them.
          </p>
        </div>
        <Room
          pet={{ ...petLook(record, projected.mood), species: record.species, name: record.name, mood: projected.mood }}
          look={look}
          sky={SPECIES_SKY[record.species]}
          cue={cue}
          description={`${describeLook(look)}, visiting ${record.name} the ${SPECIES_LABEL[record.species].toLowerCase()}${worn ? ` in the ${worn.name.toLowerCase()}` : ""}.`}
          onStatus={onStatus}
          stage
        />
        <p role="status" className="pk-sr">
          {status.sentence}
        </p>
        <div className="pk-guild-facts">
          <EmoteRow petName={record.name} playing={status.moment} onEmote={play} />
          <Guestbook pet={address} owner={owner} name={record.name} waves={waves} recent={recent} today={today} onWaved={() => play("wave")} />
        </div>
      </Stack>
    </Screen>
  );
}
