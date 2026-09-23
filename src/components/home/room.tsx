import { PetArt, PlayerArt, type PetForm } from "@/components/pk";

/**
 * The room is a place, not a dashboard. Pet and player share one scene in a
 * `radius-room` panel, and nothing floats over the animal: chips and cards
 * live below it. It is drawn once at 390px proportions and scales as one
 * picture, so a desktop gets a bigger room rather than a stretched one.
 *
 * An empty room still has the player. It does not borrow a pet.
 */
export function Room({
  form = "cat",
  description,
  occupied = true,
}: {
  form?: PetForm;
  description: string;
  occupied?: boolean;
}) {
  return (
    <div className="pk-room pk-sky--warm">
      <div className="pk-room__win" />
      <div className="pk-room__floor" />
      <div className="pk-room__who">
        <PlayerArt color="var(--pool)" hat="beanie" />
      </div>
      {occupied ? (
        <div className="pk-room__pet">
          <PetArt form={form} />
        </div>
      ) : null}
      <span className="pk-sr">{description}</span>
    </div>
  );
}
