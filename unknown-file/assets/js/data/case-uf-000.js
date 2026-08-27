/* ═══════════════════════════════════════════════════════════════
   CASE UF-000 — "THE LAST GUEST"  ·  FREE SAMPLE INVESTIGATION

   ⚠ FICTION. Ardmair, the Bellhaven and every person named here are
   invented.

   Product role: this is the tutorial. It is short, it is winnable in
   about ten minutes, and it teaches exactly one habit — check the
   instrument before you accept the impossibility. That habit is the
   spine of CASE #001. It gives nothing about #001 away.
   ═══════════════════════════════════════════════════════════════ */

export const CASE = {
  id: "UF-000",
  number: "000",
  slug: "the-last-guest",
  title: "The Last Guest",
  strapline: "Three impossible things in one small room.",
  hook: "A broken watch stopped at 02:14. A jacket soaked through on a night with no rain. And a photograph the guest took after he had already gone.",

  free: true,
  classification: "UNKNOWN FILE ORIGINAL — FICTIONAL INVESTIGATION",
  status: "OPEN — SAMPLE FILE",
  location: "The Bellhaven Guest House, Ardmair",
  region: "Ardmair Sound (fictional)",
  incidentDate: "12–13 October 2016",
  filedBy: "Ardmair Division · Case ref. AD/16/1188",
  difficulty: "INTRODUCTORY",
  difficultyLevel: 1,
  duration: "10–15 minutes",
  sittings: "One sitting. No account required.",
  exhibitCount: 6,
  cover: "assets/img/case-000.svg",
  price: { amount: 0, currency: "EUR", display: "FREE", compare: null },

  brief: [
    "The Bellhaven is a six-room guest house above the slip at Ardmair. On the evening of 12 October 2016 a guest signed the register as T. Lowrie and took room 11 on the first floor.",
    "In the morning room 11 was empty. The front door had been bolted from the inside since eleven the previous night and was still bolted at six. Three objects in the room could not be explained: a wristwatch stopped at 02:14, a jacket soaked through on a dry night, and a camera holding a photograph of the harbour taken — according to the camera — at twenty past three in the morning, long after anyone had last seen him.",
    "This is a sample file. It is shorter and easier than a full Unknown File case, and it is complete: the answer is in the exhibits, and you can reach it.",
    "One instruction, and it is the only one you will get: do not accept that something is impossible until you have checked whatever was measuring it."
  ],

  teaser: "The camera says 03:20. The sea disagrees.",

  persons: [
    { id: "P1", name: "T. Lowrie", age: null, role: "Guest, room 11", status: "MISSING", tone: "subject",
      summary: "Signed the register at 21:40 on 12 October. Paid one night in cash. No vehicle, no booking.", note: "" },
    { id: "P2", name: "Ada Brenner", age: 71, role: "Night porter and owner", status: "WITNESS", tone: "witness",
      summary: "Has run the Bellhaven for thirty-one years. Bolts the front door at eleven and unbolts it at six.", note: "" }
  ],

  timeline: [
    { time: "12 OCT · 21:40", text: "T. Lowrie signs the register and takes room 11.", src: "F-02" },
    { time: "12 OCT · 23:00", text: "Front door bolted from the inside by Ada Brenner.", src: "F-06", key: true },
    { time: "13 OCT · 01:12", text: "High water, Ardmair.", src: "F-05", key: true },
    { time: "13 OCT · 02:14", text: "Time at which the wristwatch found in room 11 has stopped.", src: "F-03", key: true },
    { time: "13 OCT · 03:20", text: "File stamp on the harbour photograph recovered from the guest's camera.", src: "F-04", key: true },
    { time: "13 OCT · 06:00", text: "Front door found still bolted. Unbolted by Ada Brenner.", src: "F-06", key: true },
    { time: "13 OCT · 07:26", text: "Low water, Ardmair.", src: "F-05", key: true },
    { time: "13 OCT · 09:15", text: "Room 11 found empty. Police attend.", src: "F-01" }
  ],

  categories: [
    { id: "reports", label: "Reports", hint: "Official narrative" },
    { id: "documents", label: "Documents", hint: "Paper record" },
    { id: "photographs", label: "Photographs", hint: "Visual record" },
    { id: "statements", label: "Statements", hint: "Human record" }
  ],

  exhibits: [
    {
      id: "F-01", cat: "reports", kind: "REPORT", title: "Incident Note",
      sub: "Ardmair Division · 13 October 2016, 09:15",
      hint: "Three impossibilities. They do not have to share an explanation.",
      body: [
        { t: "kv", rows: [
          ["Attended", "13 Oct 2016, 09:15"],
          ["Premises", "The Bellhaven Guest House, Shore Street, Ardmair"],
          ["Reported by", "A. Brenner, owner"],
          ["Subject", "T. Lowrie — guest, room 11, not located"]
        ]},
        { t: "p", v: "Room 11 was found unoccupied at 09:15. The bed had been lain on but not slept in. The room key was on the desk. The window is a sealed sash, painted shut, and was found painted shut." },
        { t: "p", v: "The front door of the premises is the only exterior door available to guests. It was bolted from the inside at 23:00 by the owner and found still bolted at 06:00 by the owner. A rear service door is padlocked externally and the owner holds the only key, which was in her possession throughout." },
        { t: "head", v: "Items in room 11" },
        { t: "list", items: [
          "One wristwatch, glass cracked, hands stopped at 02:14.",
          "One jacket, hanging on the door hook, soaked through and still wet at 09:15.",
          "One compact camera on the sill, holding twelve frames."
        ]},
        { t: "note", v: "There was no precipitation at Ardmair on the night of 12–13 October. The guest was not seen leaving. He does not appear to have been able to leave." }
      ]
    },
    {
      id: "F-02", cat: "documents", kind: "REGISTER", title: "Guest Register — 12 October",
      sub: "The Bellhaven · bound register, page 88",
      hint: "It tells you when he arrived and almost nothing else. That is the point of it.",
      body: [
        { t: "table", cols: ["Time", "Name", "Room", "Nights", "Vehicle"], rows: [
          ["16:20", "M. & S. Iyer", "7", "2", "Yes"],
          ["18:05", "D. Kerr", "9", "1", "Yes"],
          ["21:40", "T. Lowrie", "11", "1", "—"]
        ], note: "Paid in cash on arrival. No forwarding address given. Signature is legible but has not been matched to any record." },
        { t: "note", v: "Rooms 7 and 9 were vacated normally on the morning of 13 October. Both parties were traced and neither reported anything unusual." }
      ]
    },
    {
      id: "F-03", cat: "documents", kind: "SCENE INVENTORY", title: "Scene Inventory — Room 11",
      sub: "Recorded 13 October, 09:40",
      hint: "Where in the room was each item, and what is directly above it?",
      body: [
        { t: "table", cols: ["Item", "Position", "Condition"], rows: [
          ["Wristwatch", "Windowsill, beneath the ceiling rose", "Glass cracked. Stopped 02:14. Water in the case."],
          ["Jacket", "Hook on the back of the door", "Soaked through, shoulders and collar heaviest."],
          ["Camera", "Windowsill", "Dry. Twelve frames recorded."],
          ["Bed", "Against the west wall", "Coverlet disturbed. Not slept in."],
          ["Room key", "Desk", "Present."],
          ["Ceiling", "Directly above the sill", "Plaster stained and bulging over an area of approx. 400 mm. Damp to the touch."]
        ]},
        { t: "note", v: "The stain on the ceiling above the windowsill was recorded by the attending officer and not commented on further." }
      ]
    },
    {
      id: "F-04", cat: "photographs", kind: "PHOTOGRAPH", title: "Photograph — Ardmair Harbour",
      sub: "Recovered from the guest's camera · file stamp 13 OCT 03:20",
      hint: "Look at the water line, then go and find out what the water was doing at 03:20.",
      body: [
        { t: "img", src: "assets/img/ex-harbour.svg", alt: "Photograph of a small stone harbour, the steps fully exposed down to the lowest tread and the mooring rings clear of the water.", cap: "F-04 · Camera file stamp: 13 OCT 2016 03:20:44 · frame 9 of 12" },
        { t: "head", v: "Description of the frame" },
        { t: "list", items: [
          "The harbour steps are exposed to the lowest tread. The lowest tread is dry.",
          "The mooring rings on the harbour wall are clear of the water by roughly one metre.",
          "Weed on the wall below the rings is exposed and not submerged.",
          "The light is low and flat and comes from the east.",
          "No person is in the frame."
        ]},
        { t: "note", v: "Frames 1–8 show Ardmair slip, the shore road and the harbour in daylight. Frames 10–12 show the same harbour. The camera stores a file stamp taken from its own internal clock." }
      ]
    },
    {
      id: "F-05", cat: "documents", kind: "TIDE TABLE", title: "Tide Table — Ardmair, October 2016",
      sub: "Published table · heights above chart datum",
      hint: "Two hours after high water, the steps in that photograph are under the sea.",
      body: [
        { t: "table", cols: ["Date", "High water", "Height", "Low water", "Height"], rows: [
          ["12 OCT", "12:48", "4.4 m", "18:59", "0.7 m"],
          ["13 OCT", "01:12", "4.5 m", "07:26", "0.6 m"],
          ["13 OCT", "13:31", "4.4 m", "19:44", "0.7 m"]
        ], note: "Ardmair harbour steps: the lowest tread stands at 1.1 m above chart datum. The mooring rings stand at 2.0 m above chart datum." },
        { t: "note", v: "At 03:20 on 13 October the tide was two hours past a 4.5 m high water and still above 3.5 m. Both the lowest tread and the mooring rings were beneath the surface. The state shown in F-04 — lowest tread dry, rings clear by about a metre — occurs only within roughly an hour of low water." },
        { t: "note", v: "Sunrise at Ardmair on 13 October 2016: 07:48. Low water: 07:26." }
      ]
    },
    {
      id: "F-06", cat: "statements", kind: "STATEMENT", title: "Statement — Ada Brenner",
      sub: "Owner and night porter · taken 13 October, 10:20",
      hint: "She mentions a piece of plumbing. She does not think it is important.",
      body: [
        { t: "kv", rows: [["Name", "Ada Brenner, 71"], ["Role", "Owner, The Bellhaven"], ["Taken", "13 Oct 2016, 10:20"]] },
        { t: "quote", v: "I bolt the front at eleven and I draw it at six. I have done that every night for thirty-one years and I did it that night. It was bolted at six. Top bolt and bottom. If he went out the front he did not do it after eleven, and if he came back in he did not do it either." },
        { t: "quote", v: "He signed in at twenty to ten, paid cash, asked whether the kitchen was still going. It was not. He went up and I did not see him again." },
        { t: "quote", v: "The tank in the roof has been trouble since the spring. It went over twice last winter and it came through the ceiling of eleven both times. I had a man to it in March and he said the ballcock was on its way and I have not had him back. It comes through above the window. It has ruined that sill twice." },
        { t: "head", v: "On the layout of the house" },
        { t: "quote", v: "There are six letting rooms and then the top landing, which is the drying room and the linen press. Guests do not go up there and there is no key to the drying room because there is no lock on it. I did not look up there. Why would I look up there for a guest?" },
        { t: "sig", name: "A. Brenner", role: "Statement read back and signed", date: "13 October 2016" }
      ]
    }
  ],

  crossRefs: [
    {
      id: "XR-1", pair: ["F-04", "F-05"], weight: "key",
      title: "The photograph is six hours out",
      finding: "At 03:20 the tide at Ardmair was two hours past a 4.5 m high water and still above 3.5 m — the lowest step and the mooring rings were both under water. F-04 shows them dry, with weed exposed and a low flat light from the east. That state occurs within about an hour of low water, and low water was 07:26. The photograph was taken in the morning, not in the night. The camera's clock is wrong."
    },
    {
      id: "XR-2", pair: ["F-03", "F-06"], weight: "key",
      title: "The water came from above",
      finding: "The jacket is soaked at the shoulders and collar — wet from above, not from immersion. The watch on the sill has water in the case and has stopped. Directly over that sill the ceiling is stained, bulging and damp. Ada Brenner has a roof tank that has come through the ceiling of room 11 twice already, above the window, and has not been repaired. Nothing in this room needs weather to explain it."
    },
    {
      id: "XR-3", pair: ["F-01", "F-06"], weight: "key",
      title: "There is a room nobody looked in",
      finding: "The front door was bolted from 23:00 to 06:00 and the rear door is padlocked from outside. If the guest did not leave, he is in the building. The owner's own account contains the only part of the building nobody searched: a top landing with a drying room that has no lock, and where guests are not expected to be."
    }
  ],

  theoryForm: {
    intro: "Two questions. File your answer and the conclusion opens.",
    questions: [
      {
        id: "Q1",
        prompt: "The camera stamps the harbour photograph 03:20. From the tide table, what is the earliest time it could actually have been taken?",
        options: [
          { id: "a", label: "01:12 — high water, when the harbour is fullest." },
          { id: "b", label: "03:20 — the stamp is correct and the tide table is for a different harbour." },
          { id: "c", label: "About 06:30 — within roughly an hour of low water at 07:26.", correct: true },
          { id: "d", label: "13:31 — the following afternoon's high water." }
        ]
      },
      {
        id: "Q2",
        prompt: "What is the most likely explanation for the state of room 11?",
        options: [
          { id: "a", label: "The guest went out into the sea and something returned the camera." },
          { id: "b", label: "The roof tank overflowed above the sill; the guest left the room and is still in the building.", correct: true },
          { id: "c", label: "Someone else entered the room after 23:00 and staged it." },
          { id: "d", label: "The guest never existed and the register was forged." }
        ]
      }
    ],
    grades: {
      2: { title: "SOLVED", note: "You checked the instrument before you accepted the impossibility. That is the whole skill." },
      1: { title: "PARTIAL", note: "Half of it. Read the two exhibits you did not use." },
      0: { title: "NO FINDING", note: "Everything you need is in six exhibits. Start with the tide." }
    }
  },

  theories: [
    { id: "T1", name: "He went into the sea",
      claim: "The guest left the building, went down to the harbour, photographed it, and drowned.",
      forIt: ["Explains a wet jacket.", "Explains a harbour photograph at night."],
      against: ["The front door was bolted from the inside from 23:00 to 06:00.", "A jacket that has been in the sea is not wet only at the shoulders.", "The camera was dry, on the sill, in the room."],
      verdict: "Not supported." },
    { id: "T2", name: "Somebody came in",
      claim: "A third party entered room 11 and removed him.",
      forIt: ["Explains why he did not walk out past a bolted door.", "Explains a room left mid-occupation."],
      against: ["Both other rooms were occupied by traced guests who heard nothing.", "Nothing was taken and nothing was disturbed.", "It needs three separate objects to have been staged, each of which has a simpler cause."],
      verdict: "Not supported." },
    { id: "T3", name: "He never left the building",
      claim: "Water came through the ceiling; he moved; nobody searched the one room without a lock.",
      forIt: ["The ceiling above the sill is stained, bulging and damp.", "The tank has come through into room 11 twice before.", "The top landing was never searched and has no lock."],
      against: ["It requires the most famous detail — the impossible photograph — to be nothing at all."],
      verdict: "Supported by the file." }
  ],

  solution: {
    title: "The Last Guest — Conclusion",
    verdict: "T. Lowrie was found asleep on a folded blanket in the Bellhaven's drying room at 11:40 on 13 October 2016, two floors above the room everyone was searching.",
    steps: [
      { n: "01", head: "The photograph was taken in the morning.",
        body: "At 03:20 the harbour steps and the mooring rings were beneath three and a half metres of water. F-04 shows them dry, with exposed weed and a low, flat light from the east. That is the hour either side of low water — 07:26 — with the sun coming up at 07:48. The camera's internal clock had never been set. It was roughly six hours slow, and every one of the twelve frames carries the same error.",
        refs: ["F-04", "F-05"] },
      { n: "02", head: "The water came out of the ceiling.",
        body: "The jacket is heaviest at the shoulders and collar. The watch has water inside the case and is stopped at 02:14. Both sat directly beneath a ceiling that is stained, bulging and still damp at 09:40. The owner's roof tank has failed twice before and comes through above that window. At 02:14 it went over for a third time.",
        refs: ["F-03", "F-06"] },
      { n: "03", head: "So he moved.",
        body: "A guest woken at two in the morning by water coming through the ceiling onto his bed does not go out into a bolted street. He looks for somewhere dry. The Bellhaven has one room on the top landing with no lock on the door, kept warm for drying linen, which guests are not expected to enter and which nobody thought to search — because the question everybody was asking was how he had got out.",
        refs: ["F-01", "F-06"] },
      { n: "04", head: "And the photograph he had already taken.",
        body: "Frame 9 was taken on the morning of 11 October, two days before he ever signed the register, on a camera with a clock nobody had set. It only became evidence because it was found in a room that had become a mystery.",
        refs: ["F-04"] }
    ],
    aftermath: [
      "T. Lowrie declined to give a further account and left Ardmair the same afternoon. Nothing about him has ever been established beyond a signature and one night paid in cash.",
      "Ada Brenner had the ballcock replaced on 19 October 2016."
    ],
    unlocks: [],
    finalQuestion: "Three impossible things: a wrong clock, a broken cistern, and a door nobody opened.\n\nEvery case in this archive is built the same way. The difference is how well the file hides which is which."
  },

  contents: [
    { label: "Case file", detail: "6 exhibits" },
    { label: "Timeline", detail: "8 events" },
    { label: "Cross-references", detail: "3 findings" },
    { label: "Conclusion", detail: "Four-step reveal" }
  ]
};

export default CASE;
