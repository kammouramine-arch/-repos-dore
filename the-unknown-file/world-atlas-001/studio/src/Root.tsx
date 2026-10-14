import React from "react";
import { Composition } from "remotion";
import "./theme";
import { MapTest } from "./MapTest";
import { Gambia, DURATION } from "./Gambia";
import { Cover } from "./Cover";
export const Root: React.FC = () => (
  <>
    <Composition id="Gambia" component={Gambia} width={1080} height={1920} fps={30} durationInFrames={Math.round(DURATION * 30)} />
    <Composition id="Cover" component={Cover} width={1080} height={1920} fps={30} durationInFrames={1} />
    <Composition id="MapTest" component={MapTest} width={1080} height={1920} fps={30} durationInFrames={240} />
  </>
);
