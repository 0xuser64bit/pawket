"use client";

import { Icon, PetArt, SectionLabel } from "@/components/pk";
import { BADGES, badgesFor } from "@/lib/game/badges";
import { petLook } from "@/lib/game/appearance";
import type { GuestPet } from "@/lib/guest/pet";
import type { SocialRecord } from "@/lib/companion/use-social";

export function StickerBook({
  pets,
  onChain,
  inGuild,
  social,
}: {
  pets: GuestPet[];
  onChain: Set<string>;
  inGuild: Set<string>;
  social?: Map<string, SocialRecord>;
}) {
  const earnedBy = new Map<string, GuestPet[]>();
  for (const pet of pets) {
    const others = social?.get(pet.id);
    for (const id of badgesFor(pet, { onChain: onChain.has(pet.id), guild: inGuild.has(pet.id), waves: others?.waves, gatherings: others?.gatherings })) {
      earnedBy.set(id, [...(earnedBy.get(id) ?? []), pet]);
    }
  }
  return (
    <div className="pk-stack" style={{ gap: "var(--space-4)" }}>
      <SectionLabel count={`${earnedBy.size} / ${BADGES.length}`}>Stickers</SectionLabel>
      <p className="body-sm pk-muted">
        Earned by care, by showing up, by playing and by being visited — read from each pet&apos;s record, so they
        cannot be bought and are never lost. They change nothing about a pet but its pride.
      </p>
      <ul className="pk-stickers">
        {BADGES.map((badge) => {
          const by = earnedBy.get(badge.id) ?? [];
          const earned = by.length > 0;
          return (
            <li key={badge.id} className={["pk-sticker", `pk-sticker--${badge.tone}`, earned ? "" : "pk-sticker--locked"].filter(Boolean).join(" ")}>
              <span className="pk-sticker__art" aria-hidden="true">
                <Icon name={badge.icon} size={26} />
              </span>
              <span className="pk-sticker__words">
                <span className="title">{badge.name}</span>
                <span className="caption pk-muted">
                  {earned ? `Earned by ${by.map((pet) => pet.name).join(", ")}` : badge.how}
                </span>
              </span>
              {earned ? (
                <span className="pk-sticker__by" aria-hidden="true">
                  {by.slice(0, 3).map((pet) => (
                    <span key={pet.id} className="pk-sticker__pet">
                      <PetArt {...petLook(pet)} still />
                    </span>
                  ))}
                </span>
              ) : (
                <span className="pk-sr">Not earned yet.</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
