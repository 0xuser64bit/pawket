import { useCurrentFrame } from "remotion";
import { Icon, type IconName } from "@app/components/pk/icon";
import { PetArt, type Feeling } from "@app/components/pk/pet-art";
import { C, F, sticker } from "../brand";
import { FPS, cue } from "../timeline";
import { Appear, Body, Chip, Headline, Kicker } from "../components/Labels";
import { Float, Lift } from "../components/Loupe";
import { keys, pop, ramp } from "../components/motion";
import type { Shot } from "../components/Phone";
import { EL, FLOAT } from "../elements";

const RIGHT = 900;
/** The companion part ends here; the playground follows. */
export const COMPANION_END = 52.4;

// Where the room sits in each recording (device px): Home unscrolled, and Home scrolled to the room.
const HOME_ROOM: [number, number] = [540, 1020];
const TOP_ROOM: [number, number] = [540, 410];
const roomLook = (t: number, [x, y]: [number, number], z = 1.9) => [t, z, x, y] as [number, number, number, number];

const feed = cue("s2b-room", "feed");
const play = cue("s2b-room", "play");
const brush = cue("s2b-room", "brush");
const rest = cue("s2b-room", "rest");
const say = cue("s2c-today", "say");
const dance = cue("s2c-today", "dance");
const snap = cue("s2c-today", "snap");

export const COMPANION_SHOTS: Shot[] = [
  // adoption: three taps, no wallet
  { clip: "a-adopt", at: 12.0, to: 14.6, src: 3.2 },
  { clip: "a-adopt", at: 14.6, to: 16.0, src: 11.6, rate: 1.5 },
  { clip: "a-adopt", at: 16.0, to: 17.4, src: 13.7, rate: 1.6 },
  { clip: "a-adopt", at: 17.4, to: 18.8, src: 15.9, rate: 1.4 },
  { clip: "a-adopt", at: 18.8, to: 22.4, src: 18.2 },
  // home, together, in 3D
  { clip: "a-adopt", at: 22.4, to: feed, src: 23.0, look: [[22.4, 1, 540, 1200], [24.2, 1, 540, 1200], [25.6, 1.9, ...HOME_ROOM]] },
  // the four cares, each a moment in the room
  { clip: "b-care", at: feed, to: play, src: 5.2, look: [roomLook(0, HOME_ROOM)] },
  { clip: "b-care", at: play, to: brush, src: 13.0, look: [roomLook(0, HOME_ROOM), roomLook(brush - 0.5, HOME_ROOM), [brush + 0.2, 1, 540, 1200]] },
  { clip: "b-care", at: brush, to: rest, src: 17.0 },
  { clip: "b-care", at: rest, to: 34.4, src: 27.3, look: [[rest, 1, 540, 1200], roomLook(rest + 0.7, HOME_ROOM)] },
  { clip: "b-care", at: 34.4, to: 37.6, src: 8.6, look: [[0, 1.55, 540, 1640]] },
  { clip: "b-care", at: 37.6, to: 44.3, src: 29.4, look: [[37.6, 1, 540, 1200], [40.6, 1, 540, 1200], [41.6, 1.45, 540, 1560]] },
  // say hello, share a dance
  { clip: "c-say", at: 44.3, to: dance, src: 0.7, look: [roomLook(0, TOP_ROOM)] },
  { clip: "c-say", at: dance, to: snap, src: 4.7, look: [roomLook(0, TOP_ROOM)] },
  // a photo of the room, out through the phone's share sheet
  { clip: "d-photo", at: snap, to: snap + 2.2, src: 3.5 },
  { clip: "d-photo", at: snap + 2.2, to: snap + 5.0, src: 8.1 },
  { clip: "d-photo", at: snap + 5.0, to: COMPANION_END, src: 12.4 },
];

// The first page held still long enough to read beside the phone.
const FIRST_PAGE: Shot = { clip: "a-adopt", at: 19.4, to: 25.4, src: 20.0, rate: 0.25 };
// Today's round with four cares done, held still while it is read.
const TODAY: Shot = { clip: "b-care", at: 41.3, to: 44.4, src: 34.5, rate: 0.05 };

const CARES: Array<{ label: string; icon: IconName; at: number }> = [
  { label: "Feed", icon: "bowl", at: feed },
  { label: "Play", icon: "ball", at: play },
  { label: "Brush", icon: "heart", at: brush },
  { label: "Rest", icon: "moon", at: rest },
];

const NEEDS: Array<{ label: string; feeling: Feeling; at: number }> = [
  { label: "Fullness", feeling: "hungry", at: 34.3 },
  { label: "Energy", feeling: "tired", at: 34.8 },
  { label: "Coat", feeling: "scruffy", at: 35.3 },
  { label: "Happiness", feeling: "lonely", at: 35.8 },
];

/** One of the deck's round care buttons, as the app draws it: a shelf, an edge, the wanted one in sun. */
function CareButton({ label, icon, at, wanted }: { label: string; icon: IconName; at: number; wanted?: boolean }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const p = pop(frame, at, 11, 200);
  const gain = ramp(t, at + 0.1, at + 0.9);
  return (
    <div style={{ width: 170, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: Math.min(1, p * 1.5), transform: `scale(${0.6 + 0.4 * p})` }}>
      <div style={{ position: "relative" }}>
        <div style={{ width: 118, height: 118, borderRadius: 999, background: wanted ? C.sun : C.surface, border: `3px solid ${C.ink}`, boxShadow: `0 7px 0 ${wanted ? C.sunEdge : C.surfaceSunk}, 0 7px 0 3px ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink }}>
          <Icon name={icon} size={52} />
        </div>
        <div style={{ position: "absolute", left: "50%", top: -18 - 46 * gain, transform: "translateX(-50%)", opacity: gain > 0 ? 1 - Math.max(0, (gain - 0.7) / 0.3) : 0, background: C.sproutSoft, border: `3px solid ${C.ink}`, borderRadius: 999, padding: "4px 14px", fontFamily: F.mono, fontSize: 24, color: C.sproutEdge, whiteSpace: "nowrap" }}>+10 XP</div>
      </div>
      <div style={{ fontFamily: F.text, fontWeight: 800, fontSize: 26, letterSpacing: "0.12em", textTransform: "uppercase", color: C.ink }}>{label}</div>
    </div>
  );
}

/** A need, shown the way the app shows it: on the pet's face, and as five segments that run down. */
function Need({ label, feeling, at }: { label: string; feeling: Feeling; at: number }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const p = pop(frame, at, 12, 180);
  const left = Math.round(keys(t, [[at + 0.2, 4], [37.4, 1]]));
  const showing = t > 36.3 ? feeling : "happy";
  return (
    <div style={{ width: 210, opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 30}px)` }}>
      <div style={{ width: 210, height: 210, borderRadius: 28, background: C.sunSoft, ...sticker(5), overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{ width: 190, height: 190 }}>
          <PetArt form="cat" temper="curious" feeling={showing} still />
        </div>
      </div>
      <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", fontFamily: F.text, fontWeight: 700, fontSize: 25, color: C.ink }}>
        <span>{label}</span>
        <span style={{ fontFamily: F.mono, fontWeight: 400, color: left <= 1 ? C.sunEdge : C.inkSoft }}>{left * 20}</span>
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 12, borderRadius: 4, background: i < left ? C.sprout : C.surfaceSunk, border: `2px solid ${i < left ? C.sproutEdge : C.surfaceSunk}` }} />
        ))}
      </div>
    </div>
  );
}

/** Three taps to adopt: each fills as it happens on the phone. */
function TapCount() {
  const frame = useCurrentFrame();
  const steps: Array<[string, number]> = [
    ["Choose", 16.0],
    ["Name", 18.5],
    ["Home", 22.1],
  ];
  return (
    <div style={{ display: "flex", gap: 34, alignItems: "center" }}>
      {steps.map(([label, at], i) => {
        const p = pop(frame, at, 10, 220);
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 66, height: 66, borderRadius: 999, border: `3px solid ${C.ink}`, background: p > 0.02 ? C.sun : C.surface, transform: `scale(${1 + 0.18 * Math.sin(Math.PI * Math.min(1, p))})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: 30, color: C.ink, boxShadow: `4px 4px 0 ${C.ink}` }}>{i + 1}</div>
            <div style={{ fontFamily: F.text, fontWeight: 700, fontSize: 30, color: C.ink }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

/** 12–52.4 s: adoption with no wallet, the two of them at home, the cares, today, Say and Photo. */
export function Companion() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (t < 12.0 || t > COMPANION_END + 0.2) return null;
  return (
    <>

      <Appear at={12.1} to={COMPANION_END - 0.2} style={{ left: RIGHT, top: 72 }}>
        <Kicker>Your companion</Kicker>
      </Appear>

      {/* adoption */}
      <Appear at={12.6} to={25.4} style={{ left: RIGHT, top: 170 }}>
        <Headline>Adopt in three taps</Headline>
      </Appear>
      <Appear at={13.2} to={25.4} style={{ left: RIGHT, top: 300 }}>
        <TapCount />
      </Appear>
      <Appear at={cue("s2a-adopt", "no")} to={25.4} style={{ left: RIGHT, top: 410 }}>
        <div style={{ display: "flex", gap: 18 }}>
          <Chip icon="wallet" tone="pool">No wallet</Chip>
          <Chip icon="person" tone="pool">No sign-up</Chip>
        </div>
      </Appear>
      <Lift shot={FIRST_PAGE} el={EL.firstPage} x={RIGHT} y={520} w={820} at={19.4} to={25.2} caption="Their first page: kept in this app, from day one." />

      {/* home, together */}
      <Appear at={25.9} to={34.0} style={{ left: RIGHT, top: 170 }}>
        <Headline>The two of you, at home</Headline>
      </Appear>
      <Appear at={26.6} to={feed - 0.1} style={{ left: RIGHT, top: 300 }}>
        <Body style={{ maxWidth: 820 }}>One room for the two of you, drawn in 3D. Your pet breathes, wanders and naps there.</Body>
      </Appear>
      <Appear at={feed - 0.25} to={34.0} style={{ left: RIGHT, top: 330 }} rise={0}>
        <div style={{ display: "flex", gap: 34, paddingTop: 70 }}>
          {CARES.map((c, i) => (
            <CareButton key={c.label} {...c} wanted={i === 0} />
          ))}
        </div>
      </Appear>

      {/* needs */}
      <Appear at={34.1} to={40.1} style={{ left: RIGHT, top: 170 }}>
        <Headline>Needs show on their face</Headline>
      </Appear>
      <Appear at={34.1} to={40.1} style={{ left: RIGHT, top: 330 }} rise={0}>
        <div style={{ display: "flex", gap: 28 }}>
          {NEEDS.map((n) => (
            <Need key={n.label} {...n} />
          ))}
        </div>
      </Appear>
      <Appear at={37.2} to={40.1} style={{ left: RIGHT, top: 720 }}>
        <Body size={30}>Hungry, tired, scruffy, lonely: each face until the need is met.</Body>
      </Appear>

      {/* today */}
      <Appear at={40.3} to={say - 0.1} style={{ left: RIGHT, top: 170 }}>
        <Headline>Every care counts</Headline>
      </Appear>
      <Appear at={40.9} to={say - 0.1} style={{ left: RIGHT, top: 300 }}>
        <div style={{ display: "flex", gap: 18 }}>
          <Chip icon="spark" tone="sprout">+10 XP a care</Chip>
          <Chip icon="check" tone="sprout">Today's round</Chip>
        </div>
      </Appear>
      <Float shot={TODAY} region={FLOAT.today} x={RIGHT - 20} y={400} w={860} at={41.5} to={say - 0.15} caption="Four cares and a round make a good day. Any one keeps the streak." />

      {/* say */}
      <Appear at={say} to={snap - 0.1} style={{ left: RIGHT, top: 170 }}>
        <Headline>Say hello</Headline>
      </Appear>
      <Appear at={say + 0.3} to={snap - 0.1} style={{ left: RIGHT, top: 300 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", maxWidth: 860 }}>
          <Chip icon="paw">Wave</Chip>
          <Chip icon="music">Dance</Chip>
          <Chip icon="heart">Pet</Chip>
          <Chip icon="star">Treat</Chip>
        </div>
      </Appear>
      <Appear at={say + 0.6} to={snap - 0.1} style={{ left: RIGHT, top: 410 }}>
        <Body size={30} style={{ maxWidth: 820 }}>Emotes are for the two of you. They change nothing on the record.</Body>
      </Appear>

      {/* photo */}
      <Appear at={snap} to={COMPANION_END - 0.2} style={{ left: RIGHT, top: 170 }}>
        <Headline>Snap it. Share it.</Headline>
      </Appear>
      <Appear at={snap + 0.5} to={COMPANION_END - 0.2} style={{ left: RIGHT, top: 300 }}>
        <Chip icon="camera" tone="sun">A photo of your room</Chip>
      </Appear>
      <Appear at={snap + 2.3} to={COMPANION_END - 0.2} style={{ left: RIGHT, top: 400 }}>
        <Chip icon="out" tone="pool">Android share sheet</Chip>
      </Appear>
      <Appear at={snap + 5.1} to={COMPANION_END - 0.2} style={{ left: RIGHT, top: 500 }}>
        <Chip icon="check" tone="pool">Saved to your gallery</Chip>
      </Appear>
    </>
  );
}
