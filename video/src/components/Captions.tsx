import { useCurrentFrame } from "remotion";
import { C, F } from "../brand";
import { captionCues } from "../cues";
import { FPS, NARRATION } from "../timeline";
import { clamp } from "./motion";
import { interpolate } from "remotion";

export const CUES = captionCues(NARRATION.map((n) => n.words));

/** Burned-in captions: one line at a time, on the room's surface with an ink edge, under the phone. */
export function Captions() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cue = CUES.find((c) => t >= c.start - 0.05 && t <= c.end);
  if (!cue) return null;
  const o = Math.min(interpolate(t, [cue.start - 0.05, cue.start + 0.08], [0, 1], clamp), interpolate(t, [cue.end - 0.12, cue.end], [1, 0], clamp));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center", opacity: o }}>
      <div
        style={{
          maxWidth: 1240,
          padding: "10px 28px 12px",
          borderRadius: 18,
          background: "rgba(42,30,20,0.86)",
          color: C.surface,
          fontFamily: F.text,
          fontWeight: 600,
          fontSize: 38,
          lineHeight: 1.25,
          textAlign: "center",
          letterSpacing: "0.005em",
        }}
      >
        {cue.text}
      </div>
    </div>
  );
}
