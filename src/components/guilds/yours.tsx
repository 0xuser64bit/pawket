"use client";

import { Chip, PetArt } from "@/components/pk";
import { useCompanion } from "@/lib/companion/use-companion";
import { petLook } from "@/lib/game/appearance";
import { toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";

export interface YourPlace {
  founded: boolean;
  /** Your pets on Solana that are in it. */
  pets: PetOnChain[];
}

const NOWHERE: YourPlace = { founded: false, pets: [] };

/**
 * Your place in a guild, read from the connected wallet and nothing else:
 * whether you founded it, and which of your pets on Solana are in it. Said
 * only once the wallet's pets are read, so the server's page and the first
 * one drawn here agree, and a founder and their pets arrive together.
 */
export function yourPlace(
  { ready, owner, owned }: { ready: boolean; owner: string | null; owned: PetOnChain[] },
  guild: { address: string; founder: string },
): YourPlace {
  if (!ready || !owner) return NOWHERE;
  return { founded: owner === guild.founder, pets: owned.filter((entry) => entry.member?.guild === guild.address) };
}

/** On a guild's card: the faces of your pets in it, and your role, in a word. */
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

/** On a guild's own page: the same role, leading its facts. */
export function GuildRole({ guild }: { guild: { address: string; founder: string } }) {
  const { founded, pets } = yourPlace(useCompanion(), guild);
  if (!founded && pets.length === 0) return null;
  return <Chip label={founded ? "Your guild · founder" : "Your guild · member"} tone="bloom" icon={founded ? "crown" : "check"} className="pk-chip--yours" />;
}
