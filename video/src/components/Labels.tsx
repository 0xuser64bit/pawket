import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { Icon, type IconName } from "@app/components/pk/icon";
import { C, DISPLAY, F, sticker } from "../brand";
import { FPS } from "../timeline";
import { life, pop } from "./motion";
import { PawGlyph } from "@app/components/pk/art";

type Tone = "sun" | "sprout" | "pool" | "bloom" | "ink";
const TONE: Record<Tone, { soft: string; edge: string }> = {
  sun: { soft: C.sunSoft, edge: C.sunEdge },
  sprout: { soft: C.sproutSoft, edge: C.sproutEdge },
  pool: { soft: C.poolSoft, edge: C.poolEdge },
  bloom: { soft: C.bloomSoft, edge: C.bloomEdge },
  ink: { soft: C.surface, edge: C.ink },
};

/** Appears with the design system's spring at `at`, leaves at `to` (seconds). */
export function Appear({ at, to, children, style, rise = 18 }: { at: number; to: number; children: ReactNode; style?: CSSProperties; rise?: number }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (t < at - 0.05 || t > to + 0.05) return null;
  const p = pop(frame, at);
  const out = life(t, at, to, 0.3);
  return (
    <div style={{ position: "absolute", ...style, opacity: Math.min(1, p * 1.4) * out, transform: `translateY(${(1 - p) * rise}px) scale(${0.96 + 0.04 * p})`, transformOrigin: "left center" }}>
      {children}
    </div>
  );
}

/** The part of the story we are in: a small Playroom pill with the paw. */
export function Kicker({ children, tone = "sun" }: { children: ReactNode; tone?: Tone }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 20px 8px 12px",
        borderRadius: 999,
        background: C.surface,
        ...sticker(4),
        fontFamily: F.text,
        fontWeight: 800,
        fontSize: 22,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: TONE[tone].edge,
        whiteSpace: "nowrap",
      }}
    >
      <PawGlyph size={30} />
      {children}
    </div>
  );
}

export function Headline({ children, size = 84, color = C.ink, style }: { children: ReactNode; size?: number; color?: string; style?: CSSProperties }) {
  return <div style={{ ...DISPLAY, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.01em", color, ...style }}>{children}</div>;
}

export function Body({ children, size = 34, style }: { children: ReactNode; size?: number; style?: CSSProperties }) {
  return <div style={{ fontFamily: F.text, fontWeight: 500, fontSize: size, lineHeight: 1.3, color: C.inkSoft, ...style }}>{children}</div>;
}

/** A Playroom chip: an icon beside a word, always together. */
export function Chip({ icon, children, tone = "ink", size = 30 }: { icon?: IconName; children: ReactNode; tone?: Tone; size?: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: `${size * 0.36}px ${size * 0.8}px`,
        borderRadius: 999,
        background: TONE[tone].soft,
        ...sticker(4),
        fontFamily: F.text,
        fontWeight: 700,
        fontSize: size,
        color: C.ink,
        whiteSpace: "nowrap",
      }}
    >
      {icon ? (
        <span style={{ color: TONE[tone].edge, display: "inline-flex" }}>
          <Icon name={icon} size={size * 1.1} />
        </span>
      ) : null}
      {children}
    </div>
  );
}

/** The Paper register: anything that states a fact or costs money. Square, hairline, mono, no colour. */
export function PaperCard({ title, meta, rows, width = 620 }: { title: string; meta?: string; rows: Array<[string, string]>; width?: number }) {
  return (
    <div style={{ width, background: C.paper, border: `2px solid ${C.rule}`, borderRadius: 4, fontFamily: F.mono, color: C.ink }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "18px 24px", fontSize: 21, letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkSoft, borderBottom: `2px dashed ${C.rule}` }}>
        <span>{title}</span>
        {meta ? <span>{meta}</span> : null}
      </div>
      <div style={{ padding: "14px 24px 18px" }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 24, padding: "9px 0", fontSize: 25 }}>
            <span style={{ textTransform: "uppercase", letterSpacing: "0.06em", color: C.inkSoft, fontSize: 21, paddingTop: 3 }}>{k}</span>
            <span style={{ textAlign: "right" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A one-line Paper fact: a mono label and its value. */
export function PaperTag({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "inline-flex", gap: 16, alignItems: "baseline", background: C.paper, border: `2px solid ${C.rule}`, borderRadius: 4, padding: "10px 18px", fontFamily: F.mono, color: C.ink, fontSize: 24, whiteSpace: "nowrap" }}>
      <span style={{ textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkSoft, fontSize: 19 }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}
