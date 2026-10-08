import { useCurrentFrame } from "remotion";
import { PAW } from "@app/components/pk/art";
import { C } from "../brand";
import { FPS } from "../timeline";
import { pop, ramp } from "./motion";

const SHAPES = [...PAW.beans, PAW.heart];

/**
 * The paw loader, played by frame: the toe beans pop out left to right 70ms apart and the heart lands
 * last; then the toes tap into their shelf one after another and the heart answers, lub, dub
 * (docs/DESIGN.md, "The paw loader"). Drawn as PawGlyph draws the mark at size: keyline, shelf, face, shine.
 */
export function PawDraw({ size, at, taps = true }: { size: number; at: number; taps?: boolean }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const unit = 64 / size;
  const keyline = Math.max(1, size * 0.022) * unit;
  const shelf = Math.max(2, size * 0.03) * unit;
  const grow = (i: number) => pop(frame, at + (i < 4 ? i * 0.07 : 0.4), 11, 190);
  // From a second in, each toe presses into its shelf 110ms after the one before; the heart beats twice.
  const pressOf = (i: number) => {
    if (!taps) return 0;
    const start = at + 1.0 + (i < 4 ? i * 0.11 : 0.53);
    const one = (s: number, depth: number) => Math.sin(Math.PI * ramp(t, s, s + 0.18)) * depth;
    return i < 4 ? one(start, 1) : one(start, 1) + one(start + 0.26, 0.5);
  };
  const shape = (d: string, i: number, layer: "key" | "shelf" | "face") => {
    const [cx, cy] = PAW.centres[i];
    const s = grow(i);
    const dy = layer === "shelf" ? shelf : pressOf(i) * shelf * 0.8;
    return (
      <g key={`${layer}-${i}`} transform={`translate(${cx} ${cy + dy}) scale(${s}) translate(${-cx} ${-cy})`}>
        <path d={d} />
        {layer === "face" && size >= 56 ? (
          <path d={PAW.shine[i]} fill="none" stroke="#ffffff" strokeWidth={1.5} strokeLinecap="round" opacity={0.9} />
        ) : null}
      </g>
    );
  };
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ overflow: "visible" }}>
      <g transform={`translate(0 ${-shelf / 2})`}>
        <g fill={C.ink} stroke={C.ink} strokeWidth={keyline * 2} strokeLinejoin="round">
          {SHAPES.map((d, i) => shape(d, i, "shelf"))}
          {SHAPES.map((d, i) => shape(d, i, "key"))}
        </g>
        <g fill={C.sunEdge}>{SHAPES.map((d, i) => shape(d, i, "shelf"))}</g>
        <g fill={C.sun}>{SHAPES.map((d, i) => shape(d, i, "face"))}</g>
      </g>
    </svg>
  );
}
