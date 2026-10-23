import React from "react";
import { Composition, getInputProps } from "remotion";
import { QC } from "./rig/math";
import { Lab } from "./Lab";
import { Cover1, Cover2, Cover3 } from "./Covers";
import { Sheet } from "./Sheet";
import { Night1, N1_DUR } from "./n1/Night1";
import { Night2, N2_DUR } from "./n2/Night2";
import { Night3, N3_DUR } from "./n3/Night3";

if ((getInputProps() as { qc?: boolean }).qc) QC.on = true;
const F = (s: number) => Math.round(s * 30);

export const Root: React.FC = () => (
  <>
    <Composition id="Night1" component={Night1} durationInFrames={F(N1_DUR)} fps={30} width={1080} height={1920} />
    <Composition id="Night2" component={Night2} durationInFrames={F(N2_DUR)} fps={30} width={1080} height={1920} />
    <Composition id="Night3" component={Night3} durationInFrames={F(N3_DUR)} fps={30} width={1080} height={1920} />
    <Composition id="Cover1" component={Cover1} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="Cover2" component={Cover2} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="Cover3" component={Cover3} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="Sheet" component={Sheet} durationInFrames={1} fps={30} width={2400} height={3000} />
    <Composition id="Lab" component={Lab} durationInFrames={150} fps={30} width={1080} height={1920} />
  </>
);
