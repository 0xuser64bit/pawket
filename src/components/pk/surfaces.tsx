import { NavLink as Link } from "@/components/pk/nav-link";
import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "./icon";

export function Card({
  variant,
  href,
  id,
  className,
  style,
  children,
}: {
  variant?: "room" | "ink" | "flush" | "quiet";
  href?: string;
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
  return (
    <div className={className} style={style}>
      {sheet}
      <div className={["pk-tear", foot && "pk-tear--sunk"].filter(Boolean).join(" ")} aria-hidden="true" />
    </div>
  );
}

export interface ReceiptRow {
  k: string;
  v: string;
  tone?: "warn" | "ok";
}

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
      {note ? (
        <p className="body-sm pk-muted" style={{ marginTop: "var(--space-3)" }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

export type BannerTone = "risk" | "wait" | "done" | "guild" | "info";

const BANNER_ICON: Record<BannerTone, IconName> = {
  risk: "alert",
  wait: "clock",
  done: "check",
  guild: "guild",
  info: "info",
};

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

export function Problem({ children, small, id, style }: { children: ReactNode; small?: boolean; id?: string; style?: CSSProperties }) {
  return (
    <p id={id} role="alert" className={small ? "caption" : "body-sm"} style={{ color: "var(--alarm-text)", ...style }}>
      {children}
    </p>
  );
}
