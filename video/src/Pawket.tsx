import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { C } from "./brand";
import { Captions } from "./components/Captions";
import { ramp } from "./components/motion";
import { Phone, PHONE, Shots } from "./components/Phone";
import { Soundtrack } from "./components/Soundtrack";
import { SFX } from "./sfx";
import { FPS } from "./timeline";
import { Backdrop } from "./scenes/Backdrop";
import { Close } from "./scenes/Close";
import { Companion, COMPANION_SHOTS } from "./scenes/Companion";
import { Hook, HOOK_SHOTS, PHONE_IN } from "./scenes/Hook";
import { Solana, SOLANA_SHOTS } from "./scenes/Solana";
import { Together, TOGETHER_SHOTS } from "./scenes/Together";
import { World, WORLD_SHOTS } from "./scenes/World";

/** Every shot on the phone, in order: one phone for the whole film, so even part changes dissolve. */
const ALL_SHOTS = [...HOOK_SHOTS, ...COMPANION_SHOTS, ...TOGETHER_SHOTS, ...SOLANA_SHOTS, ...WORLD_SHOTS];
const PHONE_OUT: [number, number] = [155.0, 155.45];

/** Fonts are local files; nothing is drawn until all three families are ready. */
function useFonts() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all([
      document.fonts.load("600 80px Fraunces"),
      document.fonts.load("500 40px 'Hanken Grotesk'"),
      document.fonts.load("800 40px 'Hanken Grotesk'"),
      document.fonts.load("400 30px 'DM Mono'"),
    ]).then(() => continueRender(handle));
  }, [handle]);
}

export const Pawket = ({ captions }: { captions: boolean }) => {
  useFonts();
  const t = useCurrentFrame() / FPS;
  const phone = ramp(t, ...PHONE_IN) * (1 - ramp(t, ...PHONE_OUT));
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <Backdrop t={t} />
      {phone > 0 ? (
        <Phone x={PHONE.x} y={PHONE.y} opacity={phone}>
          <Shots shots={ALL_SHOTS} />
        </Phone>
      ) : null}
      <Hook />
      <Companion />
      <Together />
      <Solana />
      <World />
      <Close />
      {captions ? <Captions /> : null}
      <Soundtrack sfx={SFX} />
    </AbsoluteFill>
  );
};
