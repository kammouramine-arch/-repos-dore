import React from "react";
import { AbsoluteFill } from "remotion";
import { Person } from "./rig/Person";
import { stand } from "./rig/poses";
import { DRIVER, HERO, ROOMMATE } from "./lb/cast";
import { EXPR } from "./rig/Face";

/** character turnaround / test bench */
export const Lab: React.FC = () => (
  <AbsoluteFill style={{ background: "#556" }}>
    <svg width={1080} height={1920} viewBox="-1300 -2600 2600 4600">
      <Person pose={{ ...stand(0), brim: 1, expr: EXPR.smirk }} look={DRIVER} x={-800} y={0} seed={7} />
      <Person pose={{ ...stand(30), brim: 1 }} look={DRIVER} x={0} y={0} seed={8} />
      <Person pose={{ ...stand(160) }} look={HERO} x={800} y={0} seed={2} />
      <Person pose={{ ...stand(0) }} look={HERO} x={-800} y={1900} seed={3} />
      <Person pose={{ ...stand(-120) }} look={HERO} x={0} y={1900} seed={4} />
      <Person pose={{ ...stand(20) }} look={ROOMMATE} x={800} y={1900} seed={5} />
    </svg>
  </AbsoluteFill>
);
