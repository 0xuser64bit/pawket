import { Audio, Sequence, staticFile } from "remotion";
import { FPS, NARRATION, f, speaking } from "../timeline";

export interface Sfx {
  file: string;
  at: number;
  volume?: number;
}

/** The score sits under the voice: full between lines, about 8 dB down while anyone speaks. */
function duck(frame: number) {
  const t = frame / FPS;
  let sum = 0;
  const taps = 9;
  for (let i = 0; i < taps; i++) sum += speaking(t + (i - (taps - 1) / 2) * 0.08) ? 0.4 : 1;
  return (sum / taps) * MUSIC;
}

const MUSIC = 0.36;

export function Soundtrack({ sfx }: { sfx: Sfx[] }) {
  return (
    <>
      <Audio src={staticFile("audio/score.wav")} volume={duck} />
      {NARRATION.map((n) => (
        <Sequence key={n.id} from={f(n.at)} layout="none">
          <Audio src={staticFile(`audio/narration/${n.id}.mp3`)} volume={1} />
        </Sequence>
      ))}
      {sfx.map((s, i) => (
        <Sequence key={`${s.file}-${i}`} from={f(s.at)} layout="none">
          <Audio src={staticFile(`audio/sfx/${s.file}.wav`)} volume={s.volume ?? 0.5} />
        </Sequence>
      ))}
    </>
  );
}
