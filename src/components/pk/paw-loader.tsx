import { PawArt, type PawPrint } from "./art";

/** Four prints, so the left–right rhythm comes back to where it started. */
const PRINTS: PawPrint[] = ["cat", "dog", "bun", "heart"];

/** Hold 860ms, slide 340ms — 1.2s per paw, 4.8s for the set. */
const STEP_SECONDS = 1.2;

/**
 * One square, one paw at a time. Each new paw slides in from the side while
 * the one before it slides out the other way, alternating left and right
 * like a pet padding along, and the fourth hands back to the first so it
 * never visibly restarts.
 *
 * Pure CSS, so it renders before hydration — the point of a loader is to be
 * there while the JavaScript is not. Under `prefers-reduced-motion` one paw
 * sits still.
 *
 * Playroom only. Never on a Paper surface, and never as a route-change
 * skeleton: see `docs/DESIGN.md`.
 */
export function PawLoader({
  size = "md",
  label = "Loading",
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  return (
    <div className={["pk-paw-loader", size !== "md" && `pk-paw-loader--${size}`].filter(Boolean).join(" ")} role="status">
      <div className="pk-paw-loader__view" aria-hidden="true">
        {PRINTS.map((print, index) => (
          <div
            key={print}
            className={[
              "pk-paw-loader__paw",
              // Even paws come in from the left and go back out that way; odd
              // ones use the right. Each hand-off is one push in one direction.
              index % 2 === 0 ? "pk-paw-loader__paw--left" : "pk-paw-loader__paw--right",
              index === 0 && "pk-paw-loader__paw--first",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ animationDelay: `${(index * STEP_SECONDS).toFixed(2)}s` }}
          >
            <PawArt form={print} />
          </div>
        ))}
      </div>
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
