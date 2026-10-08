import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { C, F } from "../brand";
import { EL, SHEET } from "../elements";
import { FPS, cue, lineStart } from "../timeline";
import { Appear, Chip, Headline, PaperTag } from "../components/Labels";
import { Framed, Lift } from "../components/Loupe";
import { MiniDock, SLOT } from "../components/MiniDock";
import type { Shot } from "../components/Phone";
import { SOLANA } from "./Solana";

const RIGHT = 900;
/** The world around you, now that Mango is on Solana: the Market, guilds, the Park and Pulse. */
export const WORLD = { start: SOLANA.end, guilds: 128.4, park: 143.2, end: 155.0 };

const hats = cue("s3c-market", "hats");
const rooms = cue("s3c-market", "rooms");
const frames = cue("s3c-market", "frames");
const cosmetic = cue("s3c-market", "it's");
const money = lineStart("s4c-money");
const never = cue("s4c-money", "but");
const spending = cue("s4c-money", "spending");
const guilds = cue("s3d-guilds", "guilds");
const meetup = cue("s3d-guilds", "plan");
const poll = cue("s3d-guilds", "vote");
const coin = cue("s3d-guilds", "guild's");
const park = cue("s3e-world", "park");
const pulse = cue("s3e-world", "pulse");

export const WORLD_SHOTS: Shot[] = [
  // the Market: looks for SOL at fixed prices, cosmetic only
  { clip: "m1-market", at: WORLD.start, to: hats, src: 0.6 },
  { clip: "m1-market", at: hats, to: rooms, src: 9.6, rate: 1.4 },
  { clip: "m1-market", at: rooms, to: frames, src: 16.4 },
  { clip: "m1-market", at: frames, to: cosmetic, src: 21.6 },
  { clip: "m3-buy", at: cosmetic, to: money - 0.4, src: 3.2, rate: 0.15 },
  // spending asks the wallet: Buy, the wallet app approves, then it is in the closet
  { clip: "m3-buy", at: money - 0.4, to: money + 2.4, src: 4.6 },
  { clip: "m3-buy", at: money + 2.4, to: money + 5.2, src: 8.4 },
  { clip: "m3-buy", at: money + 5.2, to: WORLD.guilds, src: 14.2 },
  // guilds: optional, free; a meetup, RSVP, check-in, a poll; a coin glimpsed
  { clip: "q1-found", at: WORLD.guilds, to: WORLD.guilds + 3.2, src: 3.0 },
  { clip: "q2-gather", at: WORLD.guilds + 3.2, to: meetup - 0.1, src: 0.2 },
  { clip: "q2-gather", at: meetup - 0.1, to: meetup + 1.1, src: 18.0, rate: 1.6 },
  { clip: "q2-gather", at: meetup + 1.1, to: meetup + 2.8, src: 20.0, rate: 1.6 },
  { clip: "q3-poll", at: meetup + 2.8, to: poll + 0.3, src: 3.6 },
  { clip: "q3-poll", at: poll + 0.3, to: coin + 0.2, src: 35.0, rate: 1.8 },
  { clip: "c1-coin", at: coin + 0.2, to: WORLD.park, src: 9.6, rate: 1.2 },
  // the wider world: the Park, read live, then Pulse
  { clip: "p1-world", at: WORLD.park, to: pulse, src: 0.3 },
  { clip: "p1-world", at: pulse, to: WORLD.end + 0.4, src: 16.2 },
];

/** Where the purchase's "Recorded on Solana" toast appears. */
export const PURCHASE_RECORDED = money + 5.2 + (15.0 - 14.2);

const HALO: Shot = { clip: "m3-buy", at: cosmetic, to: money, src: 3.2, rate: 0.05 };
const EVENT: Shot = { clip: "q3-poll", at: meetup, to: poll, src: 3.6, rate: 0.05 };
const POLL: Shot = { clip: "q3-poll", at: poll, to: coin, src: 43.0, rate: 0.05 };
const COUNTS: Shot = { clip: "p1-world", at: park, to: pulse, src: 2.4, rate: 0.05 };
const PULSE: Shot = { clip: "p1-world", at: pulse, to: WORLD.end, src: 19.0, rate: 0.05 };

/** A lane: what this phone signs, or what the wallet approves. */
function Lane({ title, children, paper }: { title: string; children: ReactNode; paper?: boolean }) {
  return (
    <div style={{ width: 430 }}>
      <div style={{ fontFamily: paper ? F.mono : F.text, fontWeight: paper ? 500 : 800, fontSize: paper ? 22 : 24, letterSpacing: paper ? "0.08em" : "0.1em", textTransform: "uppercase", color: paper ? C.inkSoft : C.sproutEdge, marginBottom: 18 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>{children}</div>
    </div>
  );
}

/** 108–155 s: the Market and what spends, guilds, the Park and Pulse. */
export function World() {
  const t = useCurrentFrame() / FPS;
  if (t < WORLD.start - 0.05 || t > WORLD.end + 0.2) return null;
  return (
    <>
      <Appear at={WORLD.start + 0.3} to={WORLD.end - 0.1} style={{ left: RIGHT, top: 64 }}>
        <MiniDock
          stops={[
            [WORLD.start, SLOT.market],
            [WORLD.guilds - 0.3, SLOT.market],
            [WORLD.guilds + 0.15, SLOT.guilds],
            [WORLD.park - 0.3, SLOT.guilds],
            [WORLD.park + 0.15, SLOT.park],
          ]}
        />
      </Appear>

      {/* the Market */}
      <Appear at={WORLD.start + 0.6} to={money - 0.25} style={{ left: RIGHT, top: 226 }}>
        <Headline>Looks, never power</Headline>
      </Appear>
      <Appear at={hats} to={cosmetic - 0.1} style={{ left: RIGHT, top: 360 }}>
        <Chip icon="halo" tone="sun">25 pieces for your pets</Chip>
      </Appear>
      <Appear at={rooms} to={cosmetic - 0.1} style={{ left: RIGHT, top: 460 }}>
        <Chip icon="home" tone="sun">12 rooms</Chip>
      </Appear>
      <Appear at={frames} to={cosmetic - 0.1} style={{ left: RIGHT, top: 560 }}>
        <Chip icon="image" tone="sun">8 photo frames</Chip>
      </Appear>
      <Framed shot={HALO} region={SHEET.halo} x={RIGHT} y={350} w={700} at={cosmetic + 0.2} to={money - 0.3} paper caption="The Halo's own sheet: a fixed price, and what it can never change." />

      {/* what spends */}
      <Appear at={money - 0.1} to={WORLD.guilds - 0.25} style={{ left: RIGHT, top: 226 }}>
        <Headline>Care, not money</Headline>
      </Appear>
      <Appear at={money + 0.2} to={WORLD.guilds - 0.25} style={{ left: RIGHT, top: 360 }}>
        <Lane title="This phone signs, no pop-up">
          {(["Care", "Rounds", "Looks", "Guilds", "Gatherings", "Waves"] as const).map((w) => (
            <Chip key={w} tone="sprout" size={24}>{w}</Chip>
          ))}
        </Lane>
      </Appear>
      <Appear at={never} to={WORLD.guilds - 0.25} style={{ left: RIGHT, top: 640 }}>
        <div style={{ padding: "14px 20px", border: `2px solid ${C.rule}`, borderRadius: 4, background: C.paper, fontFamily: F.mono, fontSize: 24, color: C.ink, width: 860 }}>This phone's key can never move the balance.</div>
      </Appear>
      <Appear at={spending} to={WORLD.guilds - 0.25} style={{ left: RIGHT + 470, top: 360 }}>
        <Lane title="Your wallet approves" paper>
          {["Market", "Guild coins", "Put in", "Take out"].map((w) => (
            <PaperTag key={w} k="" v={w} />
          ))}
        </Lane>
      </Appear>

      {/* guilds */}
      <Appear at={WORLD.guilds + 0.2} to={WORLD.park - 0.2} style={{ left: RIGHT, top: 226 }}>
        <Headline color={C.bloomEdge}>Guilds, if you like</Headline>
      </Appear>
      <Appear at={guilds} to={meetup - 0.1} style={{ left: RIGHT, top: 360 }}>
        <div style={{ display: "flex", gap: 18 }}>
          <Chip icon="guild" tone="bloom">Optional</Chip>
          <Chip icon="users" tone="bloom">Free to join, free to leave</Chip>
        </div>
      </Appear>
      <Lift shot={EVENT} el={EL.event} x={RIGHT} y={360} w={760} at={meetup + 0.1} to={poll - 0.05} caption="A meetup: RSVP, then check in when it starts." />
      <Lift shot={POLL} el={EL.poll} x={RIGHT} y={360} w={560} at={poll} to={coin - 0.15} caption="Polls take one vote per wallet, with no weight." />
      <Appear at={coin} to={WORLD.park - 0.2} style={{ left: RIGHT, top: 360 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Chip icon="guild" tone="bloom">A guild's own coin is optional</Chip>
          <PaperTag k="On Meteora, devnet" v="test tokens, no value" />
          <PaperTag k="What it changes" v="never a pet" />
        </div>
      </Appear>

      {/* the park and the pulse */}
      <Appear at={WORLD.park + 0.2} to={WORLD.end - 0.2} style={{ left: RIGHT, top: 226 }}>
        <Headline>Every pet, read live</Headline>
      </Appear>
      <Lift shot={COUNTS} el={EL.parkCount} x={RIGHT} y={370} w={760} at={park} to={pulse - 0.15} caption="The Park's own counts, read live from the program." />
      <Lift shot={PULSE} el={EL.pulse} x={RIGHT} y={370} w={680} at={pulse + 0.2} to={WORLD.end - 0.2} caption="Pulse: everything the program holds, counted." />
      <Appear at={pulse + 1.2} to={WORLD.end - 0.2} style={{ left: RIGHT, top: 860 }}>
        <PaperTag k="Solana devnet" v="counts include Pawket's own test runs" />
      </Appear>
    </>
  );
}
