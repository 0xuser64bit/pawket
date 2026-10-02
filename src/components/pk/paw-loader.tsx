import { PawGlyph } from "./art";

/**
 * The mark, alive, for a wait with no known end.
 *
 * It draws itself first: the toe beans pop out one by one, left to right,
 * and the heart lands last. Then the toes tap the same way, each pressed
 * into its shelf like a button, and the heart answers — lub, dub — and the
 * paw rests before it goes again: a pet padding its toes while it waits
 * with you. The first 250ms are held back, so a wait that ends sooner never
 * flashes a loader at all.
 *
 * Pure CSS, so it plays before hydration — the point of a loader is to be
 * there while the JavaScript is not. Under `prefers-reduced-motion` the paw
 * simply sits there, whole.
 *
 * Playroom only. Never on a Paper surface, and never as a route-change
 * skeleton: see `docs/DESIGN.md`.
 */
export function PawLoader({ size = "md", label = "Loading" }: { size?: "sm" | "md"; label?: string }) {
  return (
    <div className="pk-paw-loader" role="status">
      <PawGlyph size={size === "sm" ? 40 : 88} moving />
      <span className="pk-sr">{label}</span>
    </div>
  );
}

/**
 * A screen waiting on this browser or a wallet before it can draw: the
 * loader, small, with the wait said in words beside it.
 */
export function Waiting({ label }: { label: string }) {
  return (
    <div className="pk-waiting">
      <PawLoader size="sm" label={label} />
      <p className="body-sm pk-faint" aria-hidden="true">
        {label}
      </p>
    </div>
  );
}
