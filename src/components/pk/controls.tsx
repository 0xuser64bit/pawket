import { NavLink as Link } from "@/components/pk/nav-link";
import { Problem } from "./surfaces";
import { useId, type ComponentProps } from "react";
import { Icon, type IconName } from "./icon";

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

export function Chip({ label, tone, icon, className }: ChipShape) {
  return (
    <span className={chipClass({ label, tone, className })}>
      {icon ? <Icon name={icon} size={13} /> : null}
      <span>{label}</span>
    </span>
  );
}

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
        <Problem id={describedBy} style={{ marginTop: "var(--space-2)" }}>
          {error}
        </Problem>
      ) : helper ? (
        <p id={describedBy} className="body-sm pk-faint" style={{ marginTop: "var(--space-2)" }}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export { Tabs } from "./tabs";
