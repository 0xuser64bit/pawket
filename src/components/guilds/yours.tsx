"use client";

import { Chip, PetArt } from "@/components/pk";
import { useCompanion } from "@/lib/companion/use-companion";
import { petLook } from "@/lib/game/appearance";
import { toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";

export interface YourPlace {
  founded: boolean;
  pets: PetOnChain[];
}

const NOWHERE: YourPlace = { founded: false, pets: [] };

export function yourPlace(
  { ready, owner, owned }: { ready: boolean; owner: string | null; owned: PetOnChain[] },
  guild: { address: string; founder: string },
): YourPlace {
  if (!ready || !owner) return NOWHERE;
  return { founded: owner === guild.founder, pets: owned.filter((entry) => entry.member?.guild === guild.address) };
}

export function YourBadge({ founded, pets }: YourPlace) {
  const names = pets.map((entry) => entry.pet.name);
  return (
    <span className="pk-guild__you">
      {pets.slice(0, 3).map((entry) => (
        <span key={entry.pet.address} className="pk-avatar" aria-hidden="true">
          <PetArt {...petLook(toCompanionRecord(entry))} still />
        </span>
      ))}
      <span>{founded ? "Founder" : "Member"}</span>
      {names.length ? <span className="pk-sr">, with {names.join(" and ")}</span> : null}
    </span>
  );
}

export function GuildRole({ guild }: { guild: { address: string; founder: string } }) {
  const { founded, pets } = yourPlace(useCompanion(), guild);
  if (!founded && pets.length === 0) return null;
  return <Chip label={founded ? "Your guild · founder" : "Your guild · member"} tone="bloom" icon={founded ? "crown" : "check"} className="pk-chip--yours" />;
}
