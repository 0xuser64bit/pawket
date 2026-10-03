"use client";

import Link from "next/link";
import { Icon, PetArt } from "@/components/pk";
import { SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { projectGuestPet, type GuestPet } from "@/lib/guest/pet";

const SKY_CLASS = { warm: "pk-sky--warm", cool: "pk-sky", plain: "pk-sky--plain" } as const;

/**
 * Every pet the player keeps, as a face in a circle; the chosen one is
 * ringed and any other is a tap away. On Home it says who is home (and the
 * last circle adopts another); in the wardrobe, who is being dressed.
 */
export function PetSwitcher({
  pets,
  home,
  onChoose,
  label = "Who is home",
  chooseLabel = (pet) => `Bring ${pet.name} home`,
  chosenLabel = (pet) => `${pet.name}, at home`,
  adopt = true,
}: {
  pets: GuestPet[];
  home: string;
  onChoose: (id: string) => void;
  label?: string;
  chooseLabel?: (pet: GuestPet) => string;
  chosenLabel?: (pet: GuestPet) => string;
  /** End with a circle that adopts another. */
  adopt?: boolean;
}) {
  return (
    <div className="pk-switch" role="group" aria-label={label}>
      {pets.map((pet) => {
        const on = pet.id === home;
        return (
          <button
            key={pet.id}
            type="button"
            className={["pk-switch__pet", SKY_CLASS[SPECIES_SKY[pet.species]], on && "pk-switch__pet--on"].filter(Boolean).join(" ")}
            aria-pressed={on}
            aria-label={on ? chosenLabel(pet) : chooseLabel(pet)}
            title={pet.name}
            onClick={() => onChoose(pet.id)}
          >
            <PetArt {...petLook(pet, projectGuestPet(pet).mood)} still />
          </button>
        );
      })}
      {adopt ? (
        <Link href="/adopt" className="pk-switch__pet pk-switch__pet--add" aria-label="Adopt another pet" title="Adopt another">
          <Icon name="plus" size={18} />
        </Link>
      ) : null}
    </div>
  );
}
