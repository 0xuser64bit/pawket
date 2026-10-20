import { ViewTransition, type CSSProperties, type ReactNode } from "react";
import { ButtonLink } from "./controls";

/**
 * How a screen arrives and leaves when the player goes somewhere: deeper in
 * (`nav-forward`) the new one comes in from the right as the old one steps
 * left; back (`nav-back`) the other way; to another place in the dock
 * (`nav-place`) the old one fades as the new one rises a few pixels into
 * place. Anything else that swaps a screen — the browser's own back, a
 * screen's content arriving after its placeholder — only crossfades, so
 * nothing rises twice. The shell and the dock never move. Nothing that
 * changes within a screen (its own state, a refresh) plays any of this.
 */
export const ARRIVE = { "nav-forward": "pk-in-forward", "nav-back": "pk-in-back", "nav-place": "pk-in", default: "pk-swap" };
export const LEAVE = { "nav-forward": "pk-out-forward", "nav-back": "pk-out-back", "nav-place": "pk-out", default: "pk-swap" };

/**
 * A screen has one primary action, and it is the only `sun` fill in view.
 * The order on every game screen is the same: the thing itself, then what
 * you can do to it, then anything that explains it — top to bottom on a
 * phone, left to right on a desktop (`Columns`).
 *
 * `narrow` is for a flow that asks for one decision — a quote, a
 * disclosure, a record — which keeps a reading measure on a desktop instead
 * of spreading to the width of a place.
 */
export function Screen({
  width = "wide",
  className,
  children,
}: {
  width?: "wide" | "narrow";
  className?: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition enter={ARRIVE} exit={LEAVE} default="none">
      <main
        id="main"
        className={["pk-screen", width === "narrow" && "pk-screen--narrow", className].filter(Boolean).join(" ")}
      >
        {children}
      </main>
    </ViewTransition>
  );
}

export function ScreenBar({ children }: { children: ReactNode }) {
  return <div className="pk-screen__bar">{children}</div>;
}

/**
 * The thing and what you can do to it, side by side on a desktop and in that
 * order, one above the other, anywhere narrower. `pin` keeps the thing in
 * view while a longer second column scrolls past it.
 */
export function Columns({
  first,
  second,
  split = "room",
  pin = false,
  className,
}: {
  first: ReactNode;
  second: ReactNode;
  /** `room` gives a scene the wider column; `portrait` gives it to the words beside a pocket. */
  split?: "room" | "portrait";
  pin?: boolean;
  className?: string;
}) {
  return (
    <div className={["pk-columns", split === "portrait" && "pk-columns--portrait", className].filter(Boolean).join(" ")}>
      <div className={["pk-columns__first", pin && "pk-columns__first--pin"].filter(Boolean).join(" ")}>
        {first}
      </div>
      <div className="pk-columns__second">{second}</div>
    </div>
  );
}

/**
 * Anything deeper than a Tab is a full screen with a back control naming
 * what you are returning to — "Guilds", "Pepper", "Clover Guild" — never a
 * bare arrow.
 */
export function BackLink({ label, href }: { label: string; href: string }) {
  return <ButtonLink label={label} href={href} tone="ghost" icon="left" className="pk-btn--flush" transitionTypes={["nav-back"]} />;
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

/** The `label` type style, used for a section heading above a list or grid. */
export function SectionLabel({
  children,
  count,
  tone,
  action,
}: {
  children: ReactNode;
  count?: string;
  tone?: "bloom";
  /** A small control at the row's end, after the count. */
  action?: ReactNode;
}) {
  return (
    <div className="pk-spread">
      <span className="label" style={tone === "bloom" ? { color: "var(--bloom-text)" } : { color: "var(--ink-faint)" }}>
        {children}
      </span>
      {count ? <span className="amount-sm pk-faint pk-section-count">{count}</span> : null}
      {action}
    </div>
  );
}
