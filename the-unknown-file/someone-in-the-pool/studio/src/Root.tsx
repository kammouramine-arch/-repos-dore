import React from "react";
import { Composition } from "remotion";
import { Pool1, P1_END } from "./edit/P1";
import { Pool2, P2_END } from "./edit/P2";
import { Pool3, P3_END } from "./edit/P3";
import { UIStill } from "./ui/states";
import { SW, SH } from "./ui/Phone";
import { PoolCover1, PoolCover2, PoolCover3 } from "./Covers";

export const Root: React.FC = () => (
  <>
    <Composition id="UI" component={UIStill} width={SW} height={SH} fps={30} durationInFrames={1} defaultProps={{ id: "p3_home" }} />
    <Composition id="P1" component={Pool1} width={1080} height={1920} fps={30} durationInFrames={Math.round(P1_END * 30)} defaultProps={{ audio: true }} />
    <Composition id="P2" component={Pool2} width={1080} height={1920} fps={30} durationInFrames={Math.round(P2_END * 30)} defaultProps={{ audio: true }} />
    <Composition id="P3" component={Pool3} width={1080} height={1920} fps={30} durationInFrames={Math.round(P3_END * 30)} defaultProps={{ audio: true }} />
    <Composition id="Cover1" component={PoolCover1} width={1080} height={1920} fps={30} durationInFrames={1} />
    <Composition id="Cover2" component={PoolCover2} width={1080} height={1920} fps={30} durationInFrames={1} />
    <Composition id="Cover3" component={PoolCover3} width={1080} height={1920} fps={30} durationInFrames={1} />
  </>
);
