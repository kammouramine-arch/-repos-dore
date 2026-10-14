import React from "react";
import { AbsoluteFill } from "remotion";
import { Shot } from "./components/Shot";
import { useT } from "./lib/time";
import { BeachSection } from "./scenes/BeachSection";
import { Footage, FootageLayer, Split } from "./components/Footage";
import { SpawnGrid } from "./components/SpawnGrid";
import { TideBeach } from "./scenes/TideBeach";

/** V2 test bench: one test view every 2 s */
const L: React.FC<{ render: (t: number) => React.ReactNode }> = ({ render }) => { const t = useT(); return <>{render(t + 3)}</>; };
export const LAB2: React.ReactNode[] = [
  <L render={(t) => <TideBeach t={t} day={13} moonless={false} />} />,
  <L render={(t) => <TideBeach t={t} day={25} moonless />} />,
  <L render={(t) => <BeachSection t={t} cam={{ x: 1000, y: 790, w: 1150 }} moonless={false} day={13} labels={1} />} />,
  <L render={(t) => <BeachSection t={t} cam={{ x: 1000, y: 790, w: 1150 }} moonless day={25} labels={1} inset={1} insetNest={0} />} />,
  <L render={(t) => <BeachSection t={t} cam={{ x: 1050, y: 760, w: 1500 }} moonless={false} day={3} light="dusk" inset={1} />} />,
  <Footage id="fgb_plume" start={4} />,
  <Split a={<FootageLayer id="reef_open" />} b={<FootageLayer id="reef_sparse" grade={{ s: 0.6 }} />} capA="WITH THE MOON" capB="WITHOUT THE MOON" subA="ILLUSTRATIVE" subB="ILLUSTRATIVE" />,
  <Footage id="mayall_operator" kind="archive" />,
  <L render={(t) => <SpawnGrid t={t} night={4.5} scatter={0} caption="WITH A LUNAR CUE" />} />,
  <L render={(t) => <SpawnGrid t={t} night={3.5} scatter={1} caption="WITHOUT IT" sub="ILLUSTRATIVE" />} />,
];
export const Lab2: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {LAB2.map((el, i) => <Shot key={i} from={i * 2} to={i * 2 + 2} fadeIn={0} fadeOut={0}>{el}</Shot>)}
  </AbsoluteFill>
);
