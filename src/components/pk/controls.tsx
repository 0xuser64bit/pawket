import Link from "next/link";
import { useId, type ComponentProps } from "react";
import { Icon, type IconName } from "./icon";

/* ------------------------------------------------------------------ Button */

/**
 * Tone picks the meaning, not the mood. `sun` is the only tone for the main
 * action on a screen, and there is at most one per screen region. `paper` is
 * the only variant allowed on a Paper surface — square, hairline, mono, no
 * shelf, and deliberately unsatisfying to press.
 */
export type ButtonTone =
  | "sun"
  | "sprout"
  | "pool"
  | "bloom"
  | "alarm"
  | "quiet"
  | "ghost"
  | "paper";

export type ButtonSize = "sm" | "md" | "lg";

interface ButtonShape {
  label: string;
  /** A figure beside the label — a countdown — set in mono. */
  meta?: string;
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: IconName;
  after?: IconName;
  full?: boolean;
  className?: string;
}

function buttonClass({ tone = "sun", size = "md", full, className }: ButtonShape) {
  return [
    "pk-btn",
    tone !== "sun" && `pk-btn--${tone}`,
    size !== "md" && `pk-btn--${size}`,
    full && "pk-btn--full",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

function buttonFace({ label, meta, size = "md", icon, after }: ButtonShape) {
  const glyph = size === "sm" ? 14 : 16;
  return (
    <>
      {icon ? <Icon name={icon} size={glyph} /> : null}
      <span>{label}</span>
      {meta ? <span className="pk-btn__meta">{meta}</span> : null}
      {after ? <Icon name={after} size={14} /> : null}
    </>
  );
}

export function Button({
  label,
  meta,
  tone,
  size,
  icon,
  after,
  full,
  className,
  ...rest
}: ButtonShape & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button type="button" className={buttonClass({ label, tone, size, full, className })} {...rest}>
      {buttonFace({ label, meta, size, icon, after })}
    </button>
  );
}

/** The same face, when the control navigates rather than asks. */
export function ButtonLink({
  label,
  tone,
  size,
  icon,
  after,
  full,
  className,
  href,
  ...rest
}: ButtonShape & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link href={href} className={buttonClass({ label, tone, size, full, className })} {...rest}>
      {buttonFace({ label, size, icon, after })}
    </Link>
  );
}

/* -------------------------------------------------------------------- Chip */

export type ChipTone = "sun" | "sprout" | "pool" | "bloom" | "alarm" | "plain" | "paper";

interface ChipShape {
  label: string;
  tone?: ChipTone;
  icon?: IconName;
  className?: string;
}

function chipClass({ tone, className }: ChipShape, extra?: string) {
  return ["pk-chip", tone && `pk-chip--${tone}`, extra, className].filter(Boolean).join(" ");
}

/**
 * A small, non-interactive label for a trait, a rarity, a status or a filter.
 * Status chips always carry a word — `pool` and `alarm` are the opposing
 * pair, and colour is never the only signal.
 */
export function Chip({ label, tone, icon, className }: ChipShape) {
  return (
    <span className={chipClass({ label, tone, className })}>
      {icon ? <Icon name={icon} size={13} /> : null}
      <span>{label}</span>
    </span>
  );
}

/** A filter chip that navigates. The only pressable chip in the system. */
export function ChipLink({
  label,
  tone,
  icon,
  className,
  href,
  selected,
}: ChipShape & { href: string; selected?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={chipClass({ label, tone: selected ? "sun" : tone, className }, "pk-chip--press")}
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      <span>{label}</span>
    </Link>
  );
}

/* ------------------------------------------------------------------- Field */

/**
 * An input that looks carved into the surface rather than floating on it.
 * A trailing suffix — a currency, a unit — stays faint, so a number is never
 * glued to a word. An error takes a word, never a red border alone.
 */
export function Field({
  label,
  icon = "search",
  suffix,
  amount = false,
  error,
  helper,
  className,
  ...rest
}: {
  label: string;
  icon?: IconName;
  suffix?: string;
  /** Amounts inside a field are mono, like every other figure in Pawket. */
  amount?: boolean;
  error?: string;
  helper?: string;
  className?: string;
} & Omit<ComponentProps<"input">, "className">) {
  const generatedId = useId();
  const inputId = rest.id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : helper ? `${inputId}-help` : undefined;
  return (
    <div className={className}>
      <label className={["pk-field", error && "pk-field--error"].filter(Boolean).join(" ")}>
        <Icon name={icon} size={17} />
        <span className="pk-sr">{label}</span>
        <input
          className={["pk-field__input", amount && "pk-field__input--amount"].filter(Boolean).join(" ")}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          {...rest}
          id={inputId}
        />
        {suffix ? <span className="amount-sm pk-faint">{suffix}</span> : null}
      </label>
      {error ? (
        <p id={describedBy} className="body-sm" style={{ color: "var(--alarm-text)", marginTop: "var(--space-2)" }}>
          {error}
        </p>
      ) : helper ? (
        <p id={describedBy} className="body-sm pk-faint" style={{ marginTop: "var(--space-2)" }}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- Tabs */

/**
 * Segmented switching within a single view, four options at most. It changes
 * elevation, not colour, so tabs never compete with the `sun` action on the
 * same screen. Moving between places uses the Dock instead.
 */
export function Tabs({
  items,
  active,
  label,
  className,
}: {
  items: Array<{ key: string; label: string; href: string }>;
  active: string;
  label: string;
  className?: string;
}) {
  return (
    <nav className={["pk-tabs", className].filter(Boolean).join(" ")} aria-label={label}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === active ? "page" : undefined}
          className={["pk-tabs__t", item.key === active && "pk-tabs__t--on"].filter(Boolean).join(" ")}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
