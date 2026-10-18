import React from "react";
import { AbsoluteFill } from "remotion";
import { useT } from "./lib/time";
import { View } from "./components/View";
import { Cafe, Apartment, Kitchen, HouseFront, Office, Bus, Bedroom, Bathroom, Park, Street } from "./scenes/env";
import { PhoneInsert, AppBg, SkipButton, SKIP_BTN, thumbPress, CallScreen, MessageScreen, LockScreen } from "./phone/Phone";
import { SkipCut } from "./components/SkipFx";
import { Person, KID } from "./rig/Person";
import { stand } from "./rig/poses";
import * as B from "./scenes/beats";

/** Development lab: one scene per `which`, used for stills while building. */
export const Lab: React.FC<{ which: string }> = ({ which }) => {
  const t = useT();
  if (which === "press") {
    const p = thumbPress(t, 1.2, SKIP_BTN);
    return <PhoneInsert t={t} bg={<View cam={{ cx: -600, cy: -900, w: 3000 }}><Cafe t={t} minutes={492} /></View>} screen={<g><AppBg /><SkipButton pressed={p.press} /></g>} thumb={p.tip} />;
  }
  if (which === "call") return <PhoneInsert t={t} screen={<CallScreen t={t} name="Mom" />} thumb={thumbPress(t, 1.2, SKIP_BTN).tip} />;
  if (which === "msg") return <PhoneInsert t={t} screen={<MessageScreen name="Aunt Clara" hair="aunt" date="THREE YEARS AGO · 11:42 PM" msgs={[{ from: "them", text: "I'm so sorry. Mom passed away last night." }]} />} thumb={null} />;
  if (which === "lock") return <PhoneInsert t={t} screen={<LockScreen time="8:12" date="Monday, March 2" note={{ app: "REMINDER", title: "Leave for work", body: "8:19 AM" }} />} />;
  const sets: Record<string, React.ReactNode> = {
    cafe: <Cafe t={t} minutes={492} />,
    apt: <Apartment t={t} calendar={{ month: "MARCH", year: 2026 }} />,
    kitchen: <Kitchen t={t} />,
    house: <HouseFront t={t} door={0.3} />,
    office: <Office t={t} />,
    bus: <Bus t={t} />,
    bed: <Bedroom t={t} />,
    bath: <Bathroom />,
    park: <Park t={t} season={1.5} day={0.8} />,
    street: <Street t={t} />,
  };
  const beats: Record<string, React.ReactNode> = {
    "b-queue": <B.QueueScene t={t} phase="wait" minutes={492} him={B.impatient(1.4, 2.5)} />,
    "b-front": <B.QueueScene t={t} phase="front" minutes={499} />,
    "b-face": <B.PhoneFace t={t} />,
    "b-office": <B.OfficeTalk t={t} phase="talk" />,
    "b-officeL": <B.OfficeTalk t={t} phase="lookdown" />,
    "b-officeA": <B.OfficeTalk t={t} phase="after" />,
    "b-bus": <B.BusRide t={t} phase="stuck" />,
    "b-boring": <B.BoringDesk t={t} minutes={14 * 60} />,
    "b-argue": <B.Argument t={t} phase="argue" />,
    "b-time": <B.TimeLapse t={t} />,
    "b-apt": <B.AptEvening t={t} mode="couch" calendar={{ month: "MAY", year: 2027 }} />,
    "b-mirror": <B.MirrorScene t={t} react={t > 2 ? 1 : 0} />,
    "b-bed": <B.BedEdge t={t} mode="grief" />,
    "b-arrive": <B.Arrival t={t} doorAt={0.5} walkFrom={-10} />,
    "b-kitchen": <B.KitchenTogether t={t} mode="talk" />,
    "b-pocket": <B.KitchenTogether t={t} mode="pocket" />,
    "b-momcall": <B.MomCalls t={t} />,
    "b-dinner": <B.MomDinner t={t} />,
    "b-walk": <B.WalkToFather t={t} dur={6} />,
  };
  if (beats[which]) return <>{beats[which]}</>;
  if (which === "skip") {
    return (
      <SkipCut t={t} at={1} label="+7 MIN" a={(tt) => <View cam={{ cx: -600, cy: -900, w: 4200 }}><Cafe t={tt} minutes={492} /><Person pose={stand(-90, { x: 400 })} t={tt} /></View>} b={(tt) => <View cam={{ cx: -600, cy: -900, w: 4200 }}><Cafe t={tt} minutes={499} /><Person pose={stand(-90, { x: -400 })} t={tt} /></View>} />
    );
  }
  return (
    <View cam={{ cx: 0, cy: -1000, w: 7000 }}>
      {sets[which]}
      <Person pose={stand(30, { x: 0, expr: "smirk" })} look={KID} t={t} />
    </View>
  );
};
