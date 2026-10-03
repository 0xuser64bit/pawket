"use client";

import Link from "next/link";
import { Icon, PetArt } from "@/components/pk";
import { SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { projectGuestPet, type GuestPet } from "@/lib/guest/pet";

const SKY_CLASS = { warm: "pk-sky--warm", cool: "pk-sky", plain: "pk-sky--plain" } as const;

/**
 * Who is home. Every pet the player keeps, as a face in a circle; the one at
 * home is ringed, and any other comes home with a tap. The last circle
 * adopts another.
 */
export function PetSwitcher({
  pets,
  home,
  onChoose,
}: {
  pets: GuestPet[];
  home: string;
  onChoose: (id: string) => void;
}) {
  return (
    <div className="pk-switch" role="group" aria-label="Who is home">
      {pets.map((pet) => {
        const on = pet.id === home;
        return (
          <button
            key={pet.id}
            type="button"
            className={["pk-avatar", SKY_CLASS[SPECIES_SKY[pet.species]], on && "pk-avatar--on"].filter(Boolean).join(" ")}
            aria-pressed={on}
            aria-label={on ? `${pet.name}, at home` : `Bring ${pet.name} home`}
            title={pet.name}
            onClick={() => onChoose(pet.id)}
          >
            <PetArt {...petLook(pet, projectGuestPet(pet).mood)} still />
          </button>
        );
      })}
      <Link href="/adopt" className="pk-avatar pk-avatar--add" aria-label="Adopt another pet" title="Adopt another">
        <Icon name="plus" size={18} />
      </Link>
    </div>
  );
}
