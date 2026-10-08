import { Img, staticFile, useCurrentFrame } from "remotion";
import { Icon, type IconName } from "@app/components/pk/icon";
import { C, F } from "../brand";
import { EL, SHEET } from "../elements";
import { FPS, cue, lineEnd, lineStart } from "../timeline";
import { Appear, Chip, Headline, PaperTag } from "../components/Labels";
import { Framed, Lift } from "../components/Loupe";
import { life, pop, ramp } from "../components/motion";
import type { Shot } from "../components/Phone";
import { TOGETHER } from "./Together";

const RIGHT = 900;
/** Keeping the story on Solana: right after the companion and its household, before anything spends. */
export const SOLANA = { start: TOGETHER.end, end: 108.0 };
const k = lineStart("s4a-keep");
const approves = cue("s4a-keep", "your");
const opens = cue("s4a-keep", "opens");
const links = cue("s4a-keep", "links");
const signed = cue("s4b-record", "from");
const plays = cue("s4b-record", "and");
const passport = cue("s4b-record", "mango's");
const visitors = cue("s4b-record", "visitors");
export const keepsake = cue("s4b-record", "mango's", 1);
const history = lineEnd("s4b-record") + 0.45;

export const SOLANA_SHOTS: Shot[] = [
  // keep Mango's story on Solana: the sheet says what it means
  { clip: "k1-setup", at: SOLANA.start, to: approves, src: 1.6 },
  // one approval: what it does, the wallet app signing, this phone linked
  { clip: "k1-setup", at: approves, to: approves + 1.5, src: 6.2, rate: 1.6 },
  { clip: "k1-setup", at: approves + 1.5, to: approves + 4.5, src: 25.8, rate: 2.0 },
  { clip: "k1-setup", at: approves + 4.5, to: signed, src: 33.0, rate: 1.3 },
  // signed right here, no pop-up; the moment only after it is confirmed
  { clip: "k2-keep", at: signed, to: plays, src: 10.0, rate: 1.55 },
  { clip: "k6-care", at: plays, to: plays + 1.5, src: 2.6, rate: 2.4 },
  { clip: "k6-care", at: plays + 1.5, to: passport, src: 6.6 },
  // the public Passport; a wave; the keepsake card
  { clip: "k4-passport", at: passport, to: visitors, src: 0.3, rate: 1.5 },
  { clip: "k5-wave", at: visitors, to: visitors + 1.1, src: 13.6 },
  { clip: "k5-wave", at: visitors + 1.1, to: keepsake, src: 16.6 },
  { clip: "k4-passport", at: keepsake, to: keepsake + 1.2, src: 36.4 },
  { clip: "k4-passport", at: keepsake + 1.2, to: keepsake + 2.4, src: 43.6 },
  { clip: "k4-passport", at: keepsake + 2.4, to: history, src: 48.6 },
  // and every one of them, read back from Solana
  { clip: "w3-history", at: history, to: SOLANA.end, src: 8.6 },
];

/** Moments the edit's sounds land on: each "Recorded on Solana" toast, by where it is in its take. */
export const SOLANA_RECORDS = [
  approves + 4.5 + (38.0 - 33.0) / 1.3, // this phone linked
  signed + (15.0 - 10.0) / 1.55, // Mango kept on Solana
  plays + 1.5 + (7.0 - 6.6), // Play, confirmed
  visitors + 1.1 + (17.5 - 16.6), // the wave
  keepsake + 2.4 + (49.0 - 48.6), // the keepsake card
];
export const HISTORY_AT = history;

const KEEP: Shot = { clip: "k1-setup", at: k + 0.6, to: approves, src: 3.5, rate: 0.05 };
const TOAST: Shot = { clip: "k2-keep", at: signed + 2.4, to: passport, src: 16.2, rate: 0.05 };
const HISTORY: Shot = { clip: "w3-history", at: history, to: SOLANA.end, src: 13.0, rate: 0.05 };

/** A node in the one-approval picture: a mono kicker, a title, a line. */
function Node({ kicker, title, line, icon, paper = true }: { kicker: string; title: string; line: string; icon: IconName; paper?: boolean }) {
  return (
    <div style={{ width: 400, background: paper ? C.paper : C.surface, border: paper ? `2px solid ${C.rule}` : `3px solid ${C.ink}`, borderRadius: paper ? 4 : 20, boxShadow: paper ? "none" : `5px 5px 0 ${C.ink}`, padding: "18px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F.mono, fontSize: 19, letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkSoft }}>
        <Icon name={icon} size={22} />
        {kicker}
      </div>
      <div style={{ marginTop: 8, fontFamily: F.text, fontWeight: 700, fontSize: 32, color: C.ink }}>{title}</div>
      <div style={{ marginTop: 6, fontFamily: F.mono, fontSize: 21, color: C.inkSoft, lineHeight: 1.35 }}>{line}</div>
    </div>
  );
}

/** A hairline arrow drawn on, Paper style. */
function Arrow({ x, y, w, at, to, down = false }: { x: number; y: number; w: number; at: number; to: number; down?: boolean }) {
  const t = useCurrentFrame() / FPS;
  if (t > to + 0.05) return null;
  const p = ramp(t, at, at + 0.45) * (1 - ramp(t, to - 0.3, to));
  const len = w * p;
  return (
    <svg style={{ position: "absolute", left: x, top: y, overflow: "visible" }} width={down ? 40 : w} height={down ? w : 40}>
      {down ? (
        <>
          <line x1={20} y1={0} x2={20} y2={len} stroke={C.ink} strokeWidth={3} />
          {p > 0.95 ? <path d={`M10 ${w - 12} L20 ${w} L30 ${w - 12}`} fill="none" stroke={C.ink} strokeWidth={3} /> : null}
        </>
      ) : (
        <>
          <line x1={0} y1={20} x2={len} y2={20} stroke={C.ink} strokeWidth={3} />
          {p > 0.95 ? <path d={`M${w - 12} 10 L${w} 20 L${w - 12} 30`} fill="none" stroke={C.ink} strokeWidth={3} /> : null}
        </>
      )}
    </svg>
  );
}

/** 75.9–108 s: keeping the story on Solana. The register turns to Paper, as the app does for facts. */
export function Solana() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (t < SOLANA.start - 0.05 || t > SOLANA.end + 0.2) return null;
  const cardFlip = pop(frame, keepsake + 0.3, 14, 120);
  return (
    <>
      <Appear at={SOLANA.start + 0.2} to={SOLANA.end - 0.2} style={{ left: RIGHT, top: 72 }}>
        <div style={{ display: "inline-flex", gap: 14, alignItems: "center", padding: "10px 18px", background: C.paper, border: `2px solid ${C.rule}`, borderRadius: 4, fontFamily: F.mono, fontSize: 22, letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink }}>
          <Icon name="keep" size={24} />A story you can keep · Solana devnet
        </div>
      </Appear>

      {/* keep it on Solana */}
      <Appear at={k - 0.3} to={approves - 0.1} style={{ left: RIGHT, top: 170 }}>
        <Headline>Keep it on Solana</Headline>
      </Appear>
      <Framed shot={KEEP} region={SHEET.keep} x={RIGHT} y={300} w={700} at={k + 0.6} to={approves - 0.1} caption="“A record nobody can edit or erase.” The app's own words." />

      {/* one approval */}
      <Appear at={approves} to={signed - 0.2} style={{ left: RIGHT, top: 170 }}>
        <Headline>One approval</Headline>
      </Appear>
      <Appear at={approves + 0.2} to={signed - 0.2} style={{ left: RIGHT, top: 300 }}>
        <Node paper={false} icon="wallet" kicker="Mobile Wallet Adapter" title="Your wallet app" line="approves once" />
      </Appear>
      <Arrow x={RIGHT + 410} y={346} w={70} at={opens} to={signed - 0.2} />
      <Appear at={opens} to={signed - 0.2} style={{ left: RIGHT + 490, top: 300 }}>
        <div style={{ width: 380 }}>
          <Node icon="pocket" kicker="Pawket Wallet" title="0.25 devnet SOL" line="in from you, out only to you" />
        </div>
      </Appear>
      <Arrow x={RIGHT + 180} y={470} w={110} at={links} to={signed - 0.2} down />
      <Appear at={links} to={signed - 0.2} style={{ left: RIGHT, top: 590 }}>
        <Node icon="lock" kicker="This phone's key" title="Made here" line="never read, exported or uploaded" />
      </Appear>
      <Appear at={links + 0.6} to={signed - 0.2} style={{ left: RIGHT, top: 830 }}>
        <PaperTag k="Shown" v="the official MWA test wallet, on devnet" />
      </Appear>

      {/* signed here, confirmed first: the toast, then Explorer below it, never touching */}
      <Appear at={signed} to={passport - 0.2} style={{ left: RIGHT, top: 170 }}>
        <Headline>Signed here. No pop-ups.</Headline>
      </Appear>
      <Lift shot={TOAST} el={EL.toast} x={RIGHT} y={300} w={760} at={signed + 2.6} to={passport - 0.2} />
      <Appear at={plays + 0.4} to={passport - 0.2} style={{ left: RIGHT, top: 530 }}>
        <div style={{ width: 560, height: 380, border: `2px solid ${C.rule}`, borderRadius: 4, overflow: "hidden", background: "#1c1c1c" }}>
          <Img src={staticFile("stills/explorer.png")} style={{ width: 560, display: "block", marginTop: -36 }} />
        </div>
      </Appear>
      <Appear at={plays + 0.8} to={passport - 0.2} style={{ left: RIGHT + 590, top: 540 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 300 }}>
          <PaperTag k="Status" v="Success" />
          <PaperTag k="Fee" v="paid by Pawket" />
          <div style={{ fontFamily: F.mono, fontSize: 19, color: C.inkSoft, lineHeight: 1.4 }}>Mango's Play, on Solana Explorer. The moment played after it.</div>
        </div>
      </Appear>

      {/* the passport, a wave, the card */}
      <Appear at={passport} to={keepsake - 0.2} style={{ left: RIGHT, top: 170 }}>
        <Headline>A public Passport</Headline>
      </Appear>
      <Appear at={passport + 0.3} to={keepsake - 0.2} style={{ left: RIGHT, top: 300 }}>
        <PaperTag k="pawket.world/pet/" v="Byaf…X5kY" />
      </Appear>
      <Appear at={visitors} to={keepsake - 0.2} style={{ left: RIGHT, top: 400 }}>
        <Chip icon="paw" tone="pool">Visitors wave, once a day</Chip>
      </Appear>
      <Appear at={keepsake} to={history - 0.2} style={{ left: RIGHT, top: 170 }}>
        <Headline>A keepsake card</Headline>
      </Appear>
      {t >= keepsake && t < history ? (
        <div style={{ position: "absolute", left: RIGHT, top: 300, perspective: 1600, opacity: life(t, keepsake + 0.2, history - 0.2, 0.3) }}>
          <div style={{ width: 420, height: 420, transform: `rotateY(${(1 - cardFlip) * 120}deg) rotate(${-3 * cardFlip}deg)`, transformOrigin: "50% 50%", border: `3px solid ${C.ink}`, borderRadius: 26, overflow: "hidden", boxShadow: `8px 8px 0 ${C.ink}`, background: C.ground }}>
            <Img src={staticFile("stills/keepsake.png")} style={{ width: 420, height: 420, display: "block" }} />
          </div>
        </div>
      ) : null}
      <Appear at={keepsake + 0.9} to={history - 0.2} style={{ left: RIGHT + 460, top: 330 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <PaperTag k="Metaplex Core" v="in your wallet" />
          <PaperTag k="Frozen" v="cannot be sold or sent" />
          <PaperTag k="Rent and fee" v="paid by Pawket" />
        </div>
      </Appear>

      {/* the history */}
      <Appear at={history} to={SOLANA.end - 0.2} style={{ left: RIGHT, top: 170 }}>
        <Headline>Every action, on the record</Headline>
      </Appear>
      <Lift shot={HISTORY} el={EL.history} x={RIGHT} y={300} w={600} at={history + 0.2} to={SOLANA.end - 0.2} caption="The Pawket Wallet's history, read from Solana." />
    </>
  );
}
