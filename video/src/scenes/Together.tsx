import { useCurrentFrame } from "remotion";
import { PetArt, type PetForm, type Temper } from "@app/components/pk/pet-art";
import { C, F, sticker } from "../brand";
import { EL, FLOAT, GAME, type Box } from "../elements";
import { FPS, cue } from "../timeline";
import { Appear, Body, Chip, Headline } from "../components/Labels";
import { Float, Lift } from "../components/Loupe";
import { MiniDock, SLOT } from "../components/MiniDock";
import { life, pop } from "../components/motion";
import { Footage, type Shot } from "../components/Phone";
import { COMPANION_END } from "./Companion";

const RIGHT = 900;
export const TOGETHER = { start: COMPANION_END, profile: 62.6, end: 75.9 };

const games = cue("s3a-play", "four");
const round = cue("s3a-play", "one");
const keep = cue("s3b-profile", "keep");
const dress = cue("s3b-profile", "dress");
const watch = cue("s3b-profile", "watch");

/** Playground, then the profile: everything here works in this app, before anything is kept on Solana. */
export const TOGETHER_SHOTS: Shot[] = [
  { clip: "g1-list", at: TOGETHER.start, to: 55.0, src: 0.2, rate: 1.3 },
  { clip: "g3-hop", at: 55.0, to: 59.0, src: 17.4 },
  { clip: "g5-pairs", at: 59.0, to: TOGETHER.profile, src: 14.6 },
  // the household: a name, pets, who is home, a look, stickers
  { clip: "h-profile", at: TOGETHER.profile, to: 65.6, src: 0.2 },
  { clip: "f-switch", at: 65.6, to: 67.4, src: 0.1 },
  { clip: "f-switch", at: 67.4, to: 68.9, src: 2.1 },
  { clip: "h-profile", at: 68.9, to: 70.6, src: 11.8, rate: 1.8 },
  { clip: "h-profile", at: 70.6, to: 71.9, src: 17.4 },
  { clip: "h-profile", at: 71.9, to: TOGETHER.end, src: 25.3 },
];

/** The finished round held still beside the phone. */
const RESULT: Shot = { clip: "g3-hop", at: round - 0.2, to: TOGETHER.profile, src: 21.6, rate: 0.05 };
const STICKERS: Shot = { clip: "h-profile", at: watch - 0.3, to: TOGETHER.end, src: 41.6, rate: 0.04 };

/** Four real rounds at once, each a window inside its own game's field, so only one frame shows. */
function GameGrid({ at, to }: { at: number; to: number }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (t < at - 0.05 || t > to + 0.05) return null;
  const tiles: Array<{ name: string; shot: Shot; region: Box }> = [
    { name: "Catch", shot: { clip: "g2-catch", at, to, src: 2.2 }, region: GAME.catch },
    { name: "Hop", shot: { clip: "g3-hop", at, to, src: 6.4 }, region: GAME.hop },
    { name: "Copy", shot: { clip: "g4-copy", at, to, src: 4.2 }, region: GAME.copy },
    { name: "Pairs", shot: { clip: "g5-pairs", at, to, src: 6.0 }, region: GAME.pairs },
  ];
  const S = 290;
  return (
    <div style={{ position: "absolute", left: RIGHT, top: 360, display: "grid", gridTemplateColumns: `${S}px ${S}px`, gap: "28px 34px" }}>
      {tiles.map((g, i) => {
        const p = pop(frame, at + i * 0.12, 13, 170);
        const o = life(t, at, to, 0.3);
        const [rx, ry, rw, rh] = g.region;
        return (
          <div key={g.name} style={{ opacity: Math.min(1, p * 1.4) * o, transform: `scale(${0.9 + 0.1 * p})` }}>
            <div style={{ position: "relative", width: S, height: S, borderRadius: 30, overflow: "hidden", background: C.surface, ...sticker(5) }}>
              <Footage shot={g.shot} w={S} h={S} baseScale={S / rw} look={[[at, 1, rx + rw / 2, ry + rh / 2]]} />
              <div style={{ position: "absolute", left: 14, bottom: 14, padding: "4px 14px", borderRadius: 999, background: C.surface, border: `3px solid ${C.ink}`, fontFamily: F.text, fontWeight: 800, fontSize: 22, letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink }}>{g.name}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The household: each pet drawn by the app's own PetArt, one of them at home. */
function Household({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const pets: Array<{ name: string; form: PetForm; temper: Temper; sky: string; home?: boolean }> = [
    { name: "Mango", form: "cat", temper: "curious", sky: C.sunSoft, home: true },
    { name: "Pretzel", form: "dog", temper: "brave", sky: C.poolSoft },
    { name: "Pebble", form: "bun", temper: "cozy", sky: C.surfaceSunk },
  ];
  return (
    <div style={{ display: "flex", gap: 30 }}>
      {pets.map((p, i) => {
        const s = pop(frame, at + i * 0.18, 12, 180);
        return (
          <div key={p.name} style={{ width: 236, opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * 40}px) rotate(${(i - 1) * 2.5 * s}deg)` }}>
            <div style={{ width: 236, height: 236, borderRadius: 30, background: p.sky, ...sticker(5), overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <div style={{ width: 214, height: 214 }}>
                <PetArt form={p.form} temper={p.temper} feeling="happy" still />
              </div>
            </div>
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, fontFamily: F.display, fontWeight: 600, fontSize: 36, color: C.ink }}>
              {p.name}
              {p.home ? <span style={{ fontFamily: F.text, fontWeight: 800, fontSize: 18, letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 999, background: C.poolSoft, border: `2px solid ${C.poolEdge}`, color: C.poolEdge }}>AT HOME</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 52.4–75.9 s: four games and a round everyone shares; the player's household and look. */
export function Together() {
  const t = useCurrentFrame() / FPS;
  if (t < TOGETHER.start - 0.05 || t > TOGETHER.end + 0.2) return null;
  return (
    <>
      <Appear at={TOGETHER.start} to={TOGETHER.end - 0.1} style={{ left: RIGHT, top: 64 }}>
        <MiniDock stops={[[TOGETHER.start, SLOT.play], [TOGETHER.profile - 0.3, SLOT.play], [TOGETHER.profile + 0.15, SLOT.profile]]} />
      </Appear>

      {/* playground */}
      <Appear at={TOGETHER.start + 0.4} to={TOGETHER.profile - 0.2} style={{ left: RIGHT, top: 226 }}>
        <Headline>Four quick games</Headline>
      </Appear>
      <GameGrid at={games - 0.6} to={round - 0.25} />
      <Appear at={round} to={TOGETHER.profile - 0.2} style={{ left: RIGHT, top: 350 }}>
        <Chip icon="clock" tone="sun">Today's round: the same for everyone</Chip>
      </Appear>
      <Appear at={round + 0.25} to={TOGETHER.profile - 0.2} style={{ left: RIGHT, top: 440 }}>
        <Chip icon="spark" tone="sprout">+25 XP, once a day</Chip>
      </Appear>
      <Lift shot={RESULT} el={EL.hopResult} x={RIGHT} y={540} w={420} at={round + 0.5} to={TOGETHER.profile - 0.25} caption="Finishing any game is the day's round. The score is yours." />

      {/* profile */}
      <Appear at={TOGETHER.profile + 0.3} to={TOGETHER.end - 0.2} style={{ left: RIGHT, top: 226 }}>
        <Headline>Your household</Headline>
      </Appear>
      <Appear at={TOGETHER.profile + 0.7} to={keep - 0.15} style={{ left: RIGHT, top: 340 }}>
        <Body style={{ maxWidth: 840 }}>Your name, your look, every pet, and everything they have earned.</Body>
      </Appear>
      <Appear at={keep} to={dress - 0.1} style={{ left: RIGHT, top: 360 }} rise={0}>
        <Household at={keep} />
      </Appear>
      <Appear at={dress} to={TOGETHER.end - 0.2} style={{ left: RIGHT, top: 350 }}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", maxWidth: 860 }}>
          <Chip icon="person" tone="pool">Your look, in 3D</Chip>
          <Chip icon="scarf" tone="pool">Three outfits</Chip>
        </div>
      </Appear>
      <Float shot={STICKERS} region={FLOAT.stickers} x={RIGHT - 20} y={450} w={760} at={watch} to={TOGETHER.end - 0.2} caption="Stickers are earned by care. Never bought." />
    </>
  );
}
