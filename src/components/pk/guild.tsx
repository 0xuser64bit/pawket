import { Icon, type IconName } from "./icon";
import { Meter } from "./game";

/* ------------------------------------------------------------------ Crest */

/**
 * A guild's mark: square-shouldered, flat-topped, and deliberately the
 * opposite of a pet's pocket. A guild never borrows a pet's frame, and a pet
 * never wears a crest as its portrait.
 */
export function Crest({
  name,
  letter,
  glyph,
  color,
  on,
  size,
}: {
  name?: string;
  letter?: string;
  /** The guild's own glyph, drawn instead of its initial. */
  glyph?: IconName;
  /** The crest's fill: bloom unless the guild chose another hue. */
  color?: string;
  /** Ink and outline on that fill. */
  on?: string;
  size?: "sm" | "lg";
}) {
  const initial = (letter ?? name ?? "G").slice(0, 1).toUpperCase();
  return (
    <span
      className={["pk-crest", size && `pk-crest--${size}`].filter(Boolean).join(" ")}
      style={color ? { background: color, color: on, borderColor: on } : undefined}
      aria-hidden="true"
    >
      {glyph ? <Icon name={glyph} size={size === "sm" ? 16 : size === "lg" ? 44 : 26} weight={2.2} /> : initial}
    </span>
  );
}

/* ----------------------------------------------------------- OfficialMark */

/**
 * Absence is the signal, not a colour. Pawket never marks an unverified link
 * in red, because a red badge invites a player to look for a green one and
 * trust it. Render this from the guild registry's approval state — never
 * from client data.
 */
export function OfficialMark({ official, label }: { official: boolean; label?: string }) {
  if (!official) {
    return (
      <span className="pk-unofficial">
        <Icon name="info" size={13} />
        {label ?? "Not checked by Pawket"}
      </span>
    );
  }
  return (
    <span className="pk-official">
      <Icon name="shield" size={13} />
      {label ?? "Official guild"}
    </span>
  );
}

/* ------------------------------------------------------------ LaunchStage */

/**
 * The single source of what the interface will do. Never derive the stage in
 * the client — pass what the server read from chain.
 */
export type Stage = "dbc" | "pending" | "damm" | "ended" | "suspended" | "none";

const STAGES: Record<Stage, { dot: string; label: string }> = {
  dbc: { dot: "live", label: "Launch open · bonding curve" },
  pending: { dot: "wait", label: "Migration pending" },
  damm: { dot: "active", label: "Active liquidity · DAMM v2" },
  ended: { dot: "stop", label: "Launch ended" },
  suspended: { dot: "stop", label: "Suspended under policy" },
  none: { dot: "wait", label: "No token · social guild" },
};

export function LaunchStage({ stage, label }: { stage: Stage; label?: string }) {
  const s = STAGES[stage];
  return (
    <span className="pk-launch__stage">
      <span className={`pk-launch__dot pk-launch__dot--${s.dot}`} />
      {label ?? s.label}
    </span>
  );
}

/* --------------------------------------------------------- LaunchProgress */

/**
 * Participation toward a published threshold, in countable `bloom` segments
 * — never a line, never a chart, never `sprout`. The disclaimer is part of
 * the component, and nothing here animates on load.
 */
export function LaunchProgress({
  value,
  max = 10,
  label = "Toward graduation",
  readout,
  note,
}: {
  value: number;
  max?: number;
  label?: string;
  readout?: string;
  note?: string;
}) {
  return (
    <div className="pk-launch">
      <Meter label={label} value={value} max={max} tone="bloom" readout={readout} />
      <p
        className="body-sm pk-muted"
        style={{ marginTop: "var(--space-3)", fontFamily: "var(--font-text)" }}
      >
        {note ??
          "Community participation so far. This is not a price, a forecast, or a promise of value."}
      </p>
    </div>
  );
}
