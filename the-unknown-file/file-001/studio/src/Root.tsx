import React from "react";
import { Composition } from "remotion";
import "./theme";
import { Short, SHORT_DURATION } from "./short/Short";
import { Lab } from "./Lab";
import { Thumb, Cover } from "./Covers";
import { Long, LONG_DURATION } from "./long/Long";

export const Root: React.FC = () => (
  <>
    <Composition id="Short" component={Short} width={1080} height={1920} fps={30} durationInFrames={Math.ceil(SHORT_DURATION * 30)} />
    <Composition id="ShortClean" component={Short} width={1080} height={1920} fps={30} durationInFrames={Math.ceil(SHORT_DURATION * 30)} defaultProps={{ subtitles: false }} />
    <Composition id="Long" component={Long} width={3840} height={2160} fps={24} durationInFrames={Math.round(LONG_DURATION * 24)} />
    <Composition id="Thumb" component={Thumb} width={1280} height={720} fps={30} durationInFrames={1} defaultProps={{ variant: "A" as const }} />
    <Composition id="Cover" component={Cover} width={1080} height={1920} fps={30} durationInFrames={1} />
    <Composition id="Lab" component={Lab} width={1920} height={1080} fps={30} durationInFrames={300} defaultProps={{ scene: "globe" }} />
  </>
);
