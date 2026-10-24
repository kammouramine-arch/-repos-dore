import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { LockScreen, MessagesScreen, CamApp, K } from "./Phone";

export const NOTE_CAM4 = { at: 0, title: "Motion detected", body: "Camera 4 · Pool", time: "now" };
export const MANAGER = [{ at: 0, text: "You don't have to come back in. Take some time off." }, { at: 0, text: "It's stress. Get some sleep." }];

/** UI stills used as textures on the 3D phone (rendered to renders/ui/<id>.png) */
export const STILLS: Record<string, React.ReactNode> = {
  p3_home: <MessagesScreen t={9} time="11:42" name="Manager" msgs={MANAGER} />,
  p3_lock_note: <LockScreen t={9} time="3:07" notes={[NOTE_CAM4]} />,
  p3_cam4: <CamApp t={0} time="3:07" cam="CAMERA 4" place="Pool — deep end" stamp="2026-10-22  03:07:41"
    feed={<Img src={staticFile("photos/feed_c4.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(0.5) contrast(1.15)" }} />} />,
  black: <AbsoluteFill style={{ background: "#000" }} />,
};

export const UIStill: React.FC<{ id: string }> = ({ id }) => <AbsoluteFill style={{ background: K.bg }}>{STILLS[id] ?? null}</AbsoluteFill>;
