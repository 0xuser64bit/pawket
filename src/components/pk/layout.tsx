import type { CSSProperties, ReactNode } from "react";
import { ButtonLink } from "./controls";

/**
 * Pawket is a phone product — the name is the brief. A screen has one
 * primary action, and it is the only `sun` fill in view. The vertical order
 * on every game screen is the same: the thing itself, then what you can do
 * to it, then anything that explains it.
 */
export function Screen({
  wide = false,
  className,
  children,
}: {
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <main className={["pk-screen", wide && "pk-screen--wide", className].filter(Boolean).join(" ")}>
      {children}
    </main>
  );
}

export function ScreenBar({ children }: { children: ReactNode }) {
  return <div className="pk-screen__bar">{children}</div>;
}

/**
 * Anything deeper than a Tab is a full screen with a back control naming
 * what you are returning to — "Guilds", "Pepper", "Clover Guild" — never a
 * bare arrow.
 */
export function BackLink({ label, href }: { label: string; href: string }) {
  return <ButtonLink label={label} href={href} tone="ghost" icon="left" />;
}

/* ------------------------------------------------ spacing, as components */

type Space = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export function Stack({
  gap = 4,
  className,
  style,
  children,
}: {
  gap?: Space;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={["pk-stack", className].filter(Boolean).join(" ")} style={{ gap: `var(--space-${gap})`, ...style }}>
      {children}
    </div>
  );
}

export function Row({
  gap = 4,
  wrap = false,
  className,
  style,
  children,
}: {
  gap?: Space;
  wrap?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={["pk-row", className].filter(Boolean).join(" ")}
      style={{ gap: `var(--space-${gap})`, flexWrap: wrap ? "wrap" : undefined, ...style }}
    >
      {children}
    </div>
  );
}

export function Grid({
  cols = 2,
  gap = 3,
  className,
  style,
  children,
}: {
  cols?: number | string;
  gap?: Space;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={["pk-grid", className].filter(Boolean).join(" ")}
      style={{
        gridTemplateColumns: typeof cols === "string" ? cols : `repeat(${cols}, minmax(0,1fr))`,
        gap: `var(--space-${gap})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** The `label` type style, used for a section heading above a list or grid. */
export function SectionLabel({
  children,
  count,
  tone,
}: {
  children: ReactNode;
  count?: string;
  tone?: "bloom";
}) {
  return (
    <div className="pk-spread">
      <span className="label" style={tone === "bloom" ? { color: "var(--bloom-text)" } : { color: "var(--ink-faint)" }}>
        {children}
      </span>
      {count ? <span className="amount-sm pk-faint">{count}</span> : null}
    </div>
  );
}
