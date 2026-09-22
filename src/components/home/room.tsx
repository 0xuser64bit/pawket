import { PetArt, PlayerArt, type PetForm } from "@/components/pk";
import { PLAYER } from "@/lib/demo";

/**
 * The room is a place, not a dashboard. Pet and player share one scene in a
 * `radius-room` panel, and nothing floats over the animal: chips and cards
 * live below it. It is drawn once at 390px proportions and scales as one
 * picture, so a desktop gets a bigger room rather than a stretched one.
 */
export function Room({ form, description }: { form: PetForm; description: string }) {
  return (
    <div className="pk-room pk-sky--warm">
      <div className="pk-room__win" />
      <div className="pk-room__floor" />
      <div className="pk-room__who">
        <PlayerArt color={PLAYER.color} hat={PLAYER.hat} />
      </div>
      <div className="pk-room__pet">
        <PetArt form={form} />
      </div>
      <span className="pk-sr">{description}</span>
    </div>
  );
}
