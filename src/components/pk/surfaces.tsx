import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "./icon";

/* -------------------------------------------------------------------- Card */

/**
 * A Playroom surface: `surface` fill, a 2px `edge` outline, `shadow-sticker`
 * and `radius-lg`. A card looks die-cut, like a sticker resting on the page.
 * Cards do not scroll, clip or manage their own height.
 */
export function Card({
  title,
  variant,
  className,
  style,
  children,
}: {
  title?: string;
  /** `room` is a whole area, `ink` is the inverted panel, `flush` lets art bleed. */
  variant?: "room" | "ink" | "flush" | "quiet";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={["pk-card", variant && `pk-card--${variant}`, className].filter(Boolean).join(" ")}
      style={style}
    >
      {title ? (
        <div className="display-s" style={{ marginBottom: "var(--space-4)" }}>
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** The inverse of a Card: for things that look carved in. */
export function Well({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={["pk-well", className].filter(Boolean).join(" ")} style={style}>
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
  return (
    <section className={["pk-paper", className].filter(Boolean).join(" ")} style={style}>
      {title ? (
        <header className="pk-paper__head">
          <span className="receipt-label">{title}</span>
          {meta ? <span className="receipt-label">{meta}</span> : null}
        </header>
      ) : null}
      <div className="pk-paper__body">{children}</div>
      {foot ? <footer className="pk-paper__foot">{foot}</footer> : null}
      {torn ? <div className="pk-tear" /> : null}
    </section>
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
      {action}
    </div>
  );
}

/**
 * Guest is the default, is never styled as an error or an incomplete step,
 * and has no visual difference in rank anywhere in the product.
 */
export function WalletState({
  mode,
  title,
  body,
  action,
}: {
  mode: "guest" | "connected";
  title?: string;
  body?: string;
  action?: ReactNode;
}) {
  const connected = mode === "connected";
  return (
    <Banner
      tone={connected ? "done" : "wait"}
      icon={connected ? "wallet" : "paw"}
      title={title ?? (connected ? "Wallet connected" : "Playing as a guest")}
      body={body ?? (connected ? undefined : "No wallet needed. Everything below works as it is.")}
      action={action}
    />
  );
}

/* ------------------------------------------------------------------- Sheet */

/**
 * A decision that costs money arrives as a Paper sheet over a dimmed
 * Playroom, anchored to the bottom, with its controls in the `paper-sunk`
 * foot. The corner radius falling from 20px to 4px is the warning; the copy
 * only confirms it.
 */
export function Sheet({
  title,
  meta,
  foot,
  children,
}: {
  title: string;
  meta?: string;
  foot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="pk-scrim">
      <section className="pk-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header className="pk-paper__head">
          <span className="receipt-label">{title}</span>
          {meta ? <span className="receipt-label">{meta}</span> : null}
        </header>
        <div className="pk-paper__body">{children}</div>
        {foot ? <footer className="pk-paper__foot">{foot}</footer> : null}
      </section>
    </div>
  );
}
