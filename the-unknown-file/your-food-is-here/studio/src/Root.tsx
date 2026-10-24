import React from "react";
import { Composition } from "remotion";
import { UIStill } from "./ui/states";
import { SW, SH } from "./ui/Phone";
import { Night1, N1_END } from "./edit/N1";
import { Night2, N2_END } from "./edit/N2";
import { Night3, N3_END } from "./edit/N3";

export const Root: React.FC = () => (
  <>
    <Composition id="UI" component={UIStill} width={SW} height={SH} fps={30} durationInFrames={1} defaultProps={{ id: "n1_order" }} />
    <Composition id="N1" component={Night1} width={1080} height={1920} fps={30} durationInFrames={Math.round(N1_END * 30)} defaultProps={{ audio: true }} />
    <Composition id="N2" component={Night2} width={1080} height={1920} fps={30} durationInFrames={Math.round(N2_END * 30)} defaultProps={{ audio: true }} />
    <Composition id="N3" component={Night3} width={1080} height={1920} fps={30} durationInFrames={Math.round(N3_END * 30)} defaultProps={{ audio: true }} />
  </>
);
