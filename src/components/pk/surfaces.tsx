import { NavLink as Link } from "@/components/pk/nav-link";
import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "./icon";

/* -------------------------------------------------------------------- Card */

/**
 * A Playroom surface: `surface` fill, a 2px `edge` outline, `shadow-sticker`
 * and `radius-lg`. A card looks die-cut, like a sticker resting on the page.
 * Cards do not scroll, clip or manage their own height.
 *
 * With `href` the whole card is the link — one target, one focus ring that
 * follows its corners — and it lifts and presses like anything else in the
 * Playroom a player can press.
 */
export function Card({
  variant,
  href,
  id,
  className,
  style,
  children,
}: {
  /** `room` is a whole area, `ink` is the inverted panel, `flush` lets art bleed. */
  variant?: "room" | "ink" | "flush" | "quiet";
  href?: string;
  /** For a link that opens the page at this card. */
  id?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const classes = ["pk-card", variant && `pk-card--${variant}`, href && "pk-card--link", className]
    .filter(Boolean)
    .join(" ");
  if (href) {
    return (
      <Link href={href} className={classes} style={style} transitionTypes={["nav-forward"]}>
        {children}
      </Link>
    );
  }
  return (
    <div id={id} className={classes} style={style}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------- Paper */

/**
 * The Paper register: the surface every fact and every price appears on.
 * Everything here is a statement. Nothing on Paper persuades, celebrates, or
 * implies a direction of travel — and Paper does not compute or format, so
 * hand it values that have already been resolved.
 */
export function Paper({
  title,
  meta,
  foot,
  torn = false,
  className,
  style,
  children,
}: {
  title?: string;
  meta?: string;
  foot?: ReactNode;
  /** The zigzag edge that marks the end of a disclosure. */
  torn?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const sheet = (
    <section
      className={["pk-paper", torn && "pk-paper--torn", !torn && className].filter(Boolean).join(" ")}
      style={torn ? undefined : style}
    >
      {title ? (
        <header className="pk-paper__head">
          <span className="receipt-label">{title}</span>
          {meta ? <span className="receipt-label">{meta}</span> : null}
        </header>
      ) : null}
      <div className="pk-paper__body">{children}</div>
      {foot ? <footer className="pk-paper__foot">{foot}</footer> : null}
    </section>
  );
  if (!torn) return sheet;
  // The tear hangs below the sheet, outside its rule, in the colour the
  // sheet ends in.
  return (
    <div className={className} style={style}>
      {sheet}
      <div className={["pk-tear", foot && "pk-tear--sunk"].filter(Boolean).join(" ")} aria-hidden="true" />
    </div>
  );
}

/* ----------------------------------------------------------------- Receipt */

export interface ReceiptRow {
  k: string;
  v: string;
  /** `warn` marks the figure most likely to hurt someone; `ok` a confirmed fact. */
  tone?: "warn" | "ok";
}

/**
 * Key-value lines for a quote, an allocation, a treasury statement or a
 * failure report. Two value tones exist and no more, so a single coloured
 * figure cannot be lost in a page of colour.
 */
export function Receipt({
  rows,
  total,
  note,
  className,
}: {
  rows: ReceiptRow[];
  total?: { k: string; v: string };
  note?: string;
  className?: string;
}) {
  return (
    <div className={["pk-receipt", className].filter(Boolean).join(" ")}>
      {rows.map((row) => (
        <div className="pk-receipt__row" key={row.k}>
          <span className="pk-receipt__k">{row.k}</span>
          <span
            className={[
              "pk-receipt__v",
              row.tone === "warn" && "pk-receipt__warn",
              row.tone === "ok" && "pk-receipt__ok",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {row.v}
          </span>
        </div>
      ))}
      {total ? (
        <>
          <div className="pk-receipt__rule" />
          <div className="pk-receipt__total">
            <span className="pk-receipt__k">{total.k}</span>
            <span className="pk-receipt__v">{total.v}</span>
          </div>
        </>
      ) : null}
      {/* The one place on Paper where the text family appears, because a
          caveat has to be read as a sentence. */}
      {note ? (
        <p className="body-sm pk-muted" style={{ marginTop: "var(--space-3)" }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Banner */

export type BannerTone = "risk" | "wait" | "done" | "guild" | "info";

const BANNER_ICON: Record<BannerTone, IconName> = {
  risk: "alert",
  wait: "clock",
  done: "check",
  guild: "guild",
  info: "info",
};

/**
 * A stated condition. A banner says what is true and what is unchanged —
 * that pairing is the pattern, not decoration. `wait` carries no colour at
 * all: a player mid-migration should feel informed, not reassured and not
 * alarmed. Use `risk` only where something can actually be lost.
 */
export function Banner({
  tone = "info",
  title,
  body,
  icon,
  action,
  className,
  children,
}: {
  tone?: BannerTone;
  title: string;
  body?: string;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={["pk-banner", `pk-banner--${tone}`, className].filter(Boolean).join(" ")}
      role={tone === "risk" ? "alert" : "note"}
    >
      <span className="pk-banner__icon">
        <Icon name={icon ?? BANNER_ICON[tone]} size={18} />
      </span>
      <div className="pk-fill">
        <div className="pk-banner__title">{title}</div>
        {body ? <div className="pk-banner__body">{body}</div> : null}
        {children}
      </div>
      {action ? <div className="pk-banner__action">{action}</div> : null}
    </div>
  );
}

/**
 * A refusal or failure, said beside what it is about: the alarm's ink, and
 * announced at once. `small` sets it at caption size, under a small control.
 */
export function Problem({ children, small, id, style }: { children: ReactNode; small?: boolean; id?: string; style?: CSSProperties }) {
  return (
    <p id={id} role="alert" className={small ? "caption" : "body-sm"} style={{ color: "var(--alarm-text)", ...style }}>
      {children}
    </p>
  );
}
