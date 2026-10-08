import { C } from "../brand";
import { ramp } from "../components/motion";
import { SOLANA } from "./Solana";

/**
 * The ground the story stands on. Playroom cream for play; for keeping the story on Solana it turns
 * to Paper with hairline rules, as the app does when a screen states a fact or costs money.
 */
export function Backdrop({ t }: { t: number }) {
  const paper = Math.min(ramp(t, SOLANA.start - 0.4, SOLANA.start + 0.4), 1 - ramp(t, SOLANA.end - 0.4, SOLANA.end + 0.4));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: C.ground }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: paper,
          background: C.paper,
          backgroundImage: `linear-gradient(${C.paperSunk} 2px, transparent 2px), linear-gradient(90deg, ${C.paperSunk} 2px, transparent 2px)`,
          backgroundSize: "96px 96px",
          backgroundPosition: "-2px -2px",
        }}
      />
    </>
  );
}
