import type { ReactNode } from "react";
import { PetArt, type PetForm } from "./art";
import { Chip } from "./controls";
import { Icon, type IconName } from "./icon";

/** Rarity is a material — Cloth, Copper, Glass, Foil — never a glow. */
export type Rarity = "cloth" | "copper" | "glass" | "foil";

export const RARITY_LABEL: Record<Rarity, string> = {
  cloth: "Cloth",
  copper: "Copper",
  glass: "Glass",
  foil: "Foil",
};

/** Room and frame backdrops use these three only — bloom never sits behind a pet. */
export type Sky = "warm" | "cool" | "plain";

const SKY_CLASS: Record<Sky, string> = {
  warm: "pk-sky--warm",
  cool: "pk-sky",
  plain: "pk-sky--plain",
};

/* ---------------------------------------------------------------- PetFrame */

/**
 * The pocket a pet lives in, and the only frame a pet is ever shown in. The
 * rim is drawn inside the artwork rather than over it, so the pet and the
 * pocket always line up at any size. Rarity is a band across the top *and*
 * the word printed beside the name.
 */
export function PetFrame({
  form,
  name,
  level,
  rarity = "cloth",
  mood,
  sky = "cool",
  size = "md",
  coat,
  patch,
  still = false,
  className,
}: {
  form: PetForm;
  name?: string;
  level?: number;
  rarity?: Rarity;
  /** A one-word mood. */
  mood?: string;
  sky?: Sky;
  size?: "sm" | "md" | "lg" | "fluid";
  coat?: string;
  patch?: string;
  still?: boolean;
  className?: string;
}) {
  return (
    <div
      className={["pk-pet", size !== "md" && `pk-pet--${size}`, `pk-pet--${rarity}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="pk-pet__frame">
        <div className={`pk-pet__sky ${SKY_CLASS[sky]}`} />
        <div className="pk-pet__art">
          <PetArt form={form} coat={coat} patch={patch} rim still={still} />
        </div>
        <div className="pk-pet__trim" />
        {level != null ? (
          <span className="pk-pet__level">
            <span className="pk-sr">Level </span>
            {level}
          </span>
        ) : null}
        {mood ? <span className="pk-pet__mood">{mood}</span> : null}
      </div>
      {name ? (
        <div className="pk-row" style={{ gap: "var(--space-2)", justifyContent: "space-between" }}>
          <span className="pk-pet__name">{name}</span>
          <span className="caption pk-faint">{RARITY_LABEL[rarity]}</span>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------- Meter */

/**
 * Countable progress: discrete segments, gaps you can see, and the numbers
 * printed beside them. Never a percentage, never a smooth bar, never more
 * than ten segments — pick a count a person can count at a glance.
 */
export function Meter({
  value,
  max,
  label,
  readout,
  tone = "sprout",
  slim = false,
  className,
}: {
  value: number;
  max: number;
  label?: string;
  /** Use when the raw counts are not the real number — "740 / 1000 XP". */
  readout?: string;
  tone?: "sprout" | "sun" | "pool" | "bloom" | "neutral";
  slim?: boolean;
  className?: string;
}) {
  const filled = Math.max(0, Math.min(max, Math.round(value)));
  return (
    <div
      className={[
        "pk-meter",
        tone !== "sprout" && `pk-meter--${tone}`,
        slim && "pk-meter--slim",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label ? (
        <div className="pk-meter__head">
          <span className="pk-meter__name">{label}</span>
          <span className="pk-meter__count">{readout ?? `${filled} / ${max}`}</span>
        </div>
      ) : null}
      <div className="pk-meter__track" role="img" aria-label={`${label ?? "Progress"}: ${readout ?? `${filled} of ${max}`}`}>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={i < filled ? "pk-meter__seg pk-meter__seg--on" : "pk-meter__seg"} />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- ItemTile */

/**
 * A cosmetic, accessory or guild badge, in the one shape the whole
 * collection uses. A tile with no price is already owned. Guild-linked items
 * name the guild where every other tile names a slot, so a player never
 * finds out after the fact that an item was conditional.
 */
export function ItemTile({
  name,
  kind,
  rarity = "cloth",
  price,
  equipped = false,
  icon = "spark",
}: {
  name: string;
  kind: string;
  rarity?: Rarity;
  /** Already formatted in SOL. The tile does no maths. */
  price?: string;
  equipped?: boolean;
  icon?: IconName;
}) {
  return (
    <div className={["pk-tile", `pk-tile--${rarity}`].join(" ")}>
      {equipped ? (
        <span className="pk-tile__on">
          <Chip label="On" tone="sprout" />
        </span>
      ) : null}
      <div className="pk-tile__art">
        <Icon name={icon} size={34} />
      </div>
      <div className="pk-tile__trim" />
      <div className="pk-tile__name pk-truncate" title={name}>
        {name}
      </div>
      <div className="pk-row" style={{ justifyContent: "space-between", gap: "var(--space-2)" }}>
        <span className="caption pk-faint">{kind}</span>
        {price ? <span className="amount-sm">{price}</span> : null}
      </div>
      <span className="pk-sr">{RARITY_LABEL[rarity]}</span>
    </div>
  );
}

/* -------------------------------------------------------------- EmptyState */

/**
 * An empty shelf that still feels like Pawket. Empty states explain the
 * thing, not the absence — and carry one action, never two.
 */
export function EmptyState({
  title,
  body,
  icon = "pocket",
  action,
}: {
  title: string;
  body?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="pk-empty">
      <span className="pk-empty__art">
        <Icon name={icon} size={30} />
      </span>
      <div>
        <div className="display-m">{title}</div>
        {body ? (
          <p className="body pk-muted" style={{ marginTop: "var(--space-2)", maxWidth: "34ch" }}>
            {body}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- Presence */

/**
 * Who is around, in the hue Pawket reserves for being with people. Away
 * differs in fill and weight, not in hue alone.
 */
export function Presence({ name, note, away = false }: { name: string; note?: string; away?: boolean }) {
  return (
    <span className="pk-presence">
      <span className={away ? "pk-presence__dot pk-presence__dot--away" : "pk-presence__dot"} />
      <span className="body-sm">{name}</span>
      {note ? <span className="caption pk-faint">{note}</span> : null}
      {away && !note ? <span className="pk-sr">away</span> : null}
    </span>
  );
}
