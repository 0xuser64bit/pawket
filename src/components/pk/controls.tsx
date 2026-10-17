import { NavLink as Link } from "@/components/pk/nav-link";
import { useId, type ComponentProps } from "react";
import { Icon, type IconName } from "./icon";

/* ------------------------------------------------------------------ Button */

/**
 * Tone picks the meaning, not the mood. `sun` is the only tone for the main
 * action on a screen, and there is at most one per screen region. `paper` is
 * the only variant allowed on a Paper surface — square, hairline, mono, no
 * shelf, and deliberately unsatisfying to press.
 */
type ButtonTone =
  | "sun"
  | "sprout"
  | "pool"
  | "bloom"
  | "alarm"
  | "quiet"
  | "ghost"
  | "paper";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonShape {
  label: string;
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

function buttonFace({ label, size = "md", icon, after }: ButtonShape) {
  const glyph = size === "sm" ? 14 : 16;
  return (
    <>
      {icon ? <Icon name={icon} size={glyph} /> : null}
      <span className="pk-btn__label">{label}</span>
      {after ? <Icon name={after} size={14} /> : null}
    </>
  );
}

/**
 * An unavailable button stays focusable: it is `aria-disabled` and ignores a
 * press, rather than `disabled`, because disabling the focused button — a
 * send that has started, a care cooling down — drops keyboard focus to the
 * page, and a screen reader loses its place.
 */
export function Button({
  label,
  tone,
  size,
  icon,
  after,
  full,
  className,
  busy = false,
  disabled = false,
  onClick,
  ...rest
}: ButtonShape & { busy?: boolean } & Omit<ComponentProps<"button">, "className" | "children">) {
  const off = busy || disabled;
  return (
    <button
      type="button"
      className={buttonClass({ label, tone, size, full, className })}
      {...rest}
      aria-disabled={off || undefined}
      aria-busy={busy || rest["aria-busy"]}
      onClick={(event) => {
        if (off) event.preventDefault();
        else onClick?.(event);
      }}
    >
      {busy ? <span className="pk-spinner" aria-hidden="true" /> : null}
      {buttonFace({ label, size, icon: busy ? undefined : icon, after })}
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

type ChipTone = "sun" | "sprout" | "pool" | "bloom" | "alarm" | "plain" | "paper";

interface ChipShape {
  label: string;
  tone?: ChipTone;
  icon?: IconName;
  className?: string;
}

function chipClass({ tone, className }: ChipShape) {
  return ["pk-chip", tone && `pk-chip--${tone}`, className].filter(Boolean).join(" ");
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
      <label htmlFor={inputId} className="label pk-faint pk-field__label">{label}</label>
      <div className={["pk-field", error && "pk-field--error"].filter(Boolean).join(" ")}>
        <Icon name={icon} size={17} />
        <input
          className={["pk-field__input", amount && "pk-field__input--amount"].filter(Boolean).join(" ")}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          {...rest}
          id={inputId}
        />
        {suffix ? <span className="amount-sm pk-faint">{suffix}</span> : null}
      </div>
      {error ? (
        <p id={describedBy} role="alert" className="body-sm" style={{ color: "var(--alarm-text)", marginTop: "var(--space-2)" }}>
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

export { Tabs } from "./tabs";
