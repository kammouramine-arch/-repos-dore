import React from "react";
import { Composition } from "remotion";
import { Lab } from "./Lab";
import { Short, SHORT_DURATION } from "./short/Short";
import { Long, LONG_DURATION } from "./long/Long";
import { Thumb, Cover } from "./Covers";
import "./theme";

export const Root: React.FC = () => (
  <>
    <Composition id="Short" component={Short} width={1080} height={1920} fps={30} durationInFrames={Math.round(SHORT_DURATION * 30)} />
    <Composition id="Long" component={Long} width={3840} height={2160} fps={24} durationInFrames={Math.round(LONG_DURATION * 24)} />
    <Composition id="Thumb" component={Thumb} width={1920} height={1080} fps={30} durationInFrames={1} />
    <Composition id="Cover" component={Cover} width={1080} height={1920} fps={30} durationInFrames={1} />
    <Composition id="Lab" component={Lab} durationInFrames={3420} fps={30} width={1920} height={1080} />
    <Composition id="LabV" component={Lab} durationInFrames={3420} fps={30} width={1080} height={1920} />
  </>
);
