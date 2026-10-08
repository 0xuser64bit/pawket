import { useCurrentFrame } from "remotion";
import { Icon, type IconName } from "@app/components/pk/icon";
import { C, F, sticker } from "../brand";
import { FPS } from "../timeline";
import { keys } from "./motion";

const DOCK: Array<{ label: string; icon: IconName }> = [
  { label: "Home", icon: "home" },
  { label: "Park", icon: "users" },
  { label: "Play", icon: "ball" },
  { label: "Market", icon: "market" },
  { label: "Guilds", icon: "guild" },
  { label: "Profile", icon: "person" },
];
export const SLOT = { home: 0, park: 1, play: 2, market: 3, guilds: 4, profile: 5 } as const;

/**
 * The app's dock, drawn large: its lit pill slides from place to place on the spring as the film
 * moves, taking bloom at Guilds, as the real dock does. `stops` are [seconds, slot] keyframes.
 */
export function MiniDock({ stops }: { stops: Array<[number, number]> }) {
  const t = useCurrentFrame() / FPS;
  const slot = keys(t, stops);
  const W = 136;
  const bloom = Math.max(0, 1 - Math.abs(slot - SLOT.guilds) * 2);
  const active = Math.round(slot);
  return (
    <div style={{ position: "relative", width: W * 6 + 24, height: 112, borderRadius: 999, background: C.surface, ...sticker(5) }}>
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 12 + slot * W,
          width: W,
          height: 86,
          borderRadius: 999,
          background: bloom > 0.5 ? C.bloomSoft : C.sunSoft,
          border: `3px solid ${bloom > 0.5 ? C.bloom : C.sunEdge}`,
        }}
      />
      <div style={{ position: "absolute", inset: "10px 12px", display: "flex" }}>
        {DOCK.map((d, i) => (
          <div key={d.label} style={{ width: W, height: 86, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: i === active ? (active === SLOT.guilds ? C.bloomEdge : C.sunEdge) : C.ink }}>
            <Icon name={d.icon} size={34} />
            <span style={{ fontFamily: F.text, fontWeight: 700, fontSize: 21 }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
