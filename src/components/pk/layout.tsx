import { ViewTransition, type CSSProperties, type ReactNode } from "react";
import { ButtonLink } from "./controls";

export const ARRIVE = { "nav-forward": "pk-in-forward", "nav-back": "pk-in-back", "nav-place": "pk-in", default: "pk-swap" };
export const LEAVE = { "nav-forward": "pk-out-forward", "nav-back": "pk-out-back", "nav-place": "pk-out", default: "pk-swap" };

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

export function Columns({
  first,
  second,
  split = "room",
  pin = false,
  className,
}: {
  first: ReactNode;
  second: ReactNode;
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

export function BackLink({ label, href }: { label: string; href: string }) {
  return <ButtonLink label={label} href={href} tone="ghost" icon="left" className="pk-btn--flush" transitionTypes={["nav-back"]} />;
}

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

export function SectionLabel({
  children,
  count,
  tone,
  action,
}: {
  children: ReactNode;
  count?: string;
  tone?: "bloom";
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
