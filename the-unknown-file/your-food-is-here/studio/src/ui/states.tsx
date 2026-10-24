import React from "react";
import { AbsoluteFill } from "remotion";
import { OrderScreen, TrackScreen, ChatScreen, LockScreen, DeliveredScreen, DoorbellScreen, FinalScreen, CanceledScreen, Photo, PhotoViewer, CallScreen, K } from "./Phone";

/** UI stills used as textures on the 3D phone (rendered to renders/ui/<id>.png) */
export const STILLS: Record<string, React.ReactNode> = {
  n1_order: <OrderScreen t={0} time="3:13" />,
  n1_track: <TrackScreen t={0} time="3:13" />,
  n1_chat: <ChatScreen t={9} time="3:14" msgs={[{ at: 0, text: "I'M NOT AT YOUR BUILDING YET." }, { at: 0, text: "PLEASE DON'T OPEN THE DOOR." }]} />,
  n1_doorbell: <DoorbellScreen t={0} time="3:14" feed={<AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #3a4038 0%, #101310 70%)" }} />} />,
  n1_lost: <DoorbellScreen t={0} time="3:14" lost={1} />,
  n1_delivered: <DeliveredScreen t={9} time="3:15" photo="photos/n1_photo_a.jpg" />,
  n1_new_photo: <DeliveredScreen t={0} time="3:16" title="New photo" caption="Loading…" />,
  black: <AbsoluteFill style={{ background: "#000" }} />,
  n2_lock: <LockScreen t={9} time="3:13" notes={[{ at: 0, title: "Order #4471", body: "YOUR DELIVERY IS WAITING." }]} />,
  n2_call: <CallScreen t={3} name="DELIVERY DRIVER" state="active" secs={4} />,
  n2_photo_ui: <PhotoViewer src="photos/n2_photo_d.jpg" time="3:13" stamp="03:14 AM" />,
  n3_lock: <LockScreen t={9} time="3:12" date="Monday 16 March" notes={[{ at: 0, title: "Order #4471", body: "FINAL DELIVERY ATTEMPT.", red: true }]} />,
  n3_final: <FinalScreen t={0.5} time="3:13" photo="photos/n3_photo_n3.jpg" />,
  n3_final_not: <FinalScreen t={0.5} time="3:13" photo="photos/n3_photo_n3.jpg" press="not" pressAmt={1} />,
  n3_canceled: <CanceledScreen time="3:14" />,
};

export const UIStill: React.FC<{ id: string }> = ({ id }) => <AbsoluteFill style={{ background: K.bg }}>{STILLS[id] ?? null}</AbsoluteFill>;
