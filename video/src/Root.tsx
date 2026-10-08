import { Composition } from "remotion";
import { Pawket } from "./Pawket";
import { DURATION, FPS } from "./timeline";
import "./tokens.css";
import "./video.css";

export const Root = () => (
  <>
    <Composition id="Pawket" component={Pawket} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} defaultProps={{ captions: true }} />
    <Composition id="PawketClean" component={Pawket} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} defaultProps={{ captions: false }} />
  </>
);
