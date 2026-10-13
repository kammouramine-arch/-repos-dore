import React from "react";
import { Composition } from "remotion";
import "./theme";
import { Lab } from "./Lab";
import { Lab2 } from "./Lab2";
import { Short, SHORT_DURATION } from "./short/Short";
import { Long, LONG_DURATION } from "./long/Long";
import { Thumb, Cover } from "./Covers";
export const Root: React.FC = () => (
  <>
    <Composition id="Short" component={Short} width={1080} height={1920} fps={30} durationInFrames={Math.round(SHORT_DURATION * 30)} />
    <Composition id="Long" component={Long} width={3840} height={2160} fps={24} durationInFrames={Math.round(LONG_DURATION * 24)} />
    <Composition id="Thumb" component={Thumb} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{ variant: "A" as const }} />
    <Composition id="ThumbB" component={Thumb} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{ variant: "B" as const }} />
    <Composition id="Cover" component={Cover} width={1080} height={1920} fps={30} durationInFrames={1} />
    <Composition id="Lab" component={Lab} width={1920} height={1080} fps={30} durationInFrames={300} defaultProps={{ scene: "people" }} />
    <Composition id="LabV" component={Lab} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={{ scene: "people" }} />
    <Composition id="Lab2" component={Lab2} width={1920} height={1080} fps={30} durationInFrames={480} />
    <Composition id="Lab2V" component={Lab2} width={1080} height={1920} fps={30} durationInFrames={480} />
  </>
);
