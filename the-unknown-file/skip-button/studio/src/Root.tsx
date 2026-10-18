import React from "react";
import { Composition } from "remotion";
import "./theme";
import { ModelSheet } from "./ModelSheet";
import { Thumb, Cover } from "./Covers";
import { MotionTest } from "./MotionTest";
import { Lab } from "./Lab";
import { Short, SHORT_DURATION } from "./short/Short";
import { Long, LONG_DURATION } from "./long/Long";

export const Root: React.FC = () => (
  <>
    <Composition id="Long" component={Long} durationInFrames={Math.round(LONG_DURATION * 24)} fps={24} width={3840} height={2160} />
    <Composition id="Short" component={Short} durationInFrames={Math.round(SHORT_DURATION * 30)} fps={30} width={1080} height={1920} />
    <Composition id="MotionTest" component={MotionTest} durationInFrames={240} fps={24} width={1920} height={1080} defaultProps={{ part: "walk" as const }} />
    <Composition id="SitTest" component={MotionTest} durationInFrames={240} fps={24} width={1920} height={1080} defaultProps={{ part: "sit" as const }} />
    <Composition id="TurnTest" component={MotionTest} durationInFrames={240} fps={24} width={1920} height={1080} defaultProps={{ part: "turn" as const }} />
    <Composition id="Lab-press" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "press" }} />
    <Composition id="LabV-press" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "press" }} />
    <Composition id="Lab-call" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "call" }} />
    <Composition id="LabV-call" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "call" }} />
    <Composition id="Lab-msg" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "msg" }} />
    <Composition id="LabV-msg" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "msg" }} />
    <Composition id="Lab-lock" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "lock" }} />
    <Composition id="LabV-lock" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "lock" }} />
    <Composition id="Lab-cafe" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "cafe" }} />
    <Composition id="LabV-cafe" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "cafe" }} />
    <Composition id="Lab-apt" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "apt" }} />
    <Composition id="LabV-apt" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "apt" }} />
    <Composition id="Lab-kitchen" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "kitchen" }} />
    <Composition id="LabV-kitchen" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "kitchen" }} />
    <Composition id="Lab-house" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "house" }} />
    <Composition id="LabV-house" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "house" }} />
    <Composition id="Lab-office" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "office" }} />
    <Composition id="LabV-office" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "office" }} />
    <Composition id="Lab-bus" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "bus" }} />
    <Composition id="LabV-bus" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "bus" }} />
    <Composition id="Lab-bed" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "bed" }} />
    <Composition id="LabV-bed" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "bed" }} />
    <Composition id="Lab-bath" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "bath" }} />
    <Composition id="LabV-bath" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "bath" }} />
    <Composition id="Lab-park" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "park" }} />
    <Composition id="LabV-park" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "park" }} />
    <Composition id="Lab-street" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "street" }} />
    <Composition id="LabV-street" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "street" }} />
    <Composition id="Lab-skip" component={Lab} durationInFrames={96} fps={24} width={1920} height={1080} defaultProps={{ which: "skip" }} />
    <Composition id="LabV-skip" component={Lab} durationInFrames={96} fps={24} width={1080} height={1920} defaultProps={{ which: "skip" }} />
    <Composition id="Lab-b-queue" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-queue" }} />
    <Composition id="LabV-b-queue" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-queue" }} />
    <Composition id="Lab-b-front" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-front" }} />
    <Composition id="LabV-b-front" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-front" }} />
    <Composition id="Lab-b-face" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-face" }} />
    <Composition id="LabV-b-face" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-face" }} />
    <Composition id="Lab-b-office" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-office" }} />
    <Composition id="LabV-b-office" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-office" }} />
    <Composition id="Lab-b-officeL" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-officeL" }} />
    <Composition id="LabV-b-officeL" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-officeL" }} />
    <Composition id="Lab-b-officeA" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-officeA" }} />
    <Composition id="LabV-b-officeA" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-officeA" }} />
    <Composition id="Lab-b-bus" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-bus" }} />
    <Composition id="LabV-b-bus" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-bus" }} />
    <Composition id="Lab-b-boring" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-boring" }} />
    <Composition id="LabV-b-boring" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-boring" }} />
    <Composition id="Lab-b-argue" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-argue" }} />
    <Composition id="LabV-b-argue" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-argue" }} />
    <Composition id="Lab-b-time" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-time" }} />
    <Composition id="LabV-b-time" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-time" }} />
    <Composition id="Lab-b-apt" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-apt" }} />
    <Composition id="LabV-b-apt" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-apt" }} />
    <Composition id="Lab-b-mirror" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-mirror" }} />
    <Composition id="LabV-b-mirror" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-mirror" }} />
    <Composition id="Lab-b-bed" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-bed" }} />
    <Composition id="LabV-b-bed" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-bed" }} />
    <Composition id="Lab-b-arrive" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-arrive" }} />
    <Composition id="LabV-b-arrive" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-arrive" }} />
    <Composition id="Lab-b-kitchen" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-kitchen" }} />
    <Composition id="LabV-b-kitchen" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-kitchen" }} />
    <Composition id="Lab-b-pocket" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-pocket" }} />
    <Composition id="LabV-b-pocket" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-pocket" }} />
    <Composition id="Lab-b-momcall" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-momcall" }} />
    <Composition id="LabV-b-momcall" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-momcall" }} />
    <Composition id="Lab-b-dinner" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-dinner" }} />
    <Composition id="LabV-b-dinner" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-dinner" }} />
    <Composition id="Lab-b-walk" component={Lab} durationInFrames={120} fps={24} width={1920} height={1080} defaultProps={{ which: "b-walk" }} />
    <Composition id="LabV-b-walk" component={Lab} durationInFrames={120} fps={24} width={1080} height={1920} defaultProps={{ which: "b-walk" }} />
    <Composition id="Thumb" component={Thumb} durationInFrames={1} fps={24} width={1920} height={1080} />
    <Composition id="Cover" component={Cover} durationInFrames={1} fps={24} width={1080} height={1920} />
    <Composition id="ModelSheet" component={ModelSheet} durationInFrames={1} fps={24} width={3840} height={2160} />
  </>
);
