import { PawArt, type PetForm } from "./art";

/** The four species, in the order the onboarding offers them. */
const FORMS: PetForm[] = ["cat", "dog", "bird", "bun"];

/** Hold 900ms, hand over in 220ms — 1.12s per paw, 4.48s for the set. */
const STEP_SECONDS = 1.12;

/**
 * A paw in a pocket, which is the mark assembling itself. Species take the
 * frame in turn while something with no known end is happening.
 *
 * Pure CSS, so it renders before hydration — the point of a loader is to be
 * there while the JavaScript is not. Under `prefers-reduced-motion` one paw
 * sits still in the pocket.
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
    <div
      className={["pk-pet", size !== "md" && `pk-pet--${size}`].filter(Boolean).join(" ")}
      role="status"
    >
      <div className="pk-pet__frame">
        <div className="pk-pet__sky pk-sky--warm" />
        <div className="pk-paw-loader__stack" aria-hidden="true">
          {FORMS.map((form, index) => (
            <div
              key={form}
              className={["pk-paw-loader__paw", index === 0 && "pk-paw-loader__paw--first"]
                .filter(Boolean)
                .join(" ")}
              style={{ animationDelay: `${(index * STEP_SECONDS).toFixed(2)}s` }}
            >
              <PawArt form={form} />
            </div>
          ))}
        </div>
        {/* The rim the paws rest on, drawn last so it tucks their base in. */}
        <svg
          className="pk-paw-loader__rim"
          viewBox="0 0 120 120"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M-10 130V94Q60 77 130 94v36z" fill="var(--surface)" />
          <path d="M-10 94Q60 77 130 94" fill="none" stroke="var(--edge)" strokeWidth="3" />
        </svg>
      </div>
      <span className="pk-sr">{label}</span>
    </div>
  );
}
