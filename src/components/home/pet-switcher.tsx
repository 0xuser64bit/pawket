"use client";

import { NavLink as Link } from "@/components/pk/nav-link";
import { Icon, PetArt } from "@/components/pk";
import { SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { projectGuestPet, type GuestPet } from "@/lib/guest/pet";
import { useCoats } from "@/lib/player/use-coats";

const SKY_CLASS = { warm: "pk-sky--warm", cool: "pk-sky", plain: "pk-sky--plain" } as const;
const NONE: ReadonlySet<string> = new Set();

export function PetSwitcher({
  pets,
  home,
  onChoose,
  label = "Who is home",
  chooseLabel = (pet) => `Bring ${pet.name} home`,
  chosenLabel = (pet) => `${pet.name}, at home`,
  adopt = true,
  kept = NONE,
}: {
  pets: GuestPet[];
  home: string;
  onChoose: (id: string) => void;
  label?: string;
  chooseLabel?: (pet: GuestPet) => string;
  chosenLabel?: (pet: GuestPet) => string;
  adopt?: boolean;
  kept?: ReadonlySet<string>;
}) {
  const coatOf = useCoats();
  return (
    <div className="pk-switch" role="group" aria-label={label}>
      {pets.map((pet) => {
        const on = pet.id === home;
        const onChain = kept.has(pet.id);
        return (
          <span key={pet.id} className="pk-switch__slot">
            <button
              type="button"
              className={["pk-switch__pet", SKY_CLASS[SPECIES_SKY[pet.species]], on && "pk-switch__pet--on"].filter(Boolean).join(" ")}
              aria-pressed={on}
              aria-label={on ? chosenLabel(pet) : chooseLabel(pet)}
              title={pet.name}
              onClick={() => onChoose(pet.id)}
            >
              <PetArt {...petLook(pet, projectGuestPet(pet).mood)} coat={coatOf(pet).coat} patch={coatOf(pet).patch} still />
            </button>
            {onChain ? (
              <span className="pk-switch__badge pk-switch__badge--kept" aria-hidden="true" title="On Solana">
                <Icon name="check" size={10} weight={3} />
              </span>
            ) : null}
          </span>
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
