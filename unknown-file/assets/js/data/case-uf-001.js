/* ═══════════════════════════════════════════════════════════════
   CASE UF-001 — "THE HOLLOW HOUR"

   ⚠ FICTION. Every person, vessel, agency, island and document in
   this file is invented. Kestrel Point, the Isle of Morn, Ardmair,
   the Northern Isles Constabulary and the Caldon Atmospheric Trust
   do not exist. Nothing here depicts a real event or a real person.

   Design note for whoever maintains this file:
   the case is solvable. Every conclusion in `solution` is reachable
   from the exhibits alone, and each step is anchored to a specific
   pair of documents listed in `crossRefs`. If you add an exhibit,
   add it to the chain — do not add atmosphere that leads nowhere.
   ═══════════════════════════════════════════════════════════════ */

export const CASE = {
  id: "UF-001",
  number: "001",
  slug: "the-hollow-hour",
  title: "The Hollow Hour",
  strapline: "Fifty-seven minutes of a room that should have been empty.",
  hook: "At 02:41 the door opened. At 03:38 it opened again. Between those two events the station's audio recorder captured a woman who was, by every other measure, already gone.",

  classification: "UNKNOWN FILE ORIGINAL — FICTIONAL INVESTIGATION",
  status: "OPEN / NEVER FORMALLY CLOSED",
  location: "Kestrel Point Field Station, Isle of Morn",
  region: "Ardmair Sound (fictional)",
  incidentDate: "3–4 February 2009",
  filedBy: "Ardmair Division · Case ref. AD/09/0217",
  difficulty: "ADVANCED",
  difficultyLevel: 4,
  duration: "2–3 hours",
  sittings: "Designed for two sittings. Your progress is kept.",
  exhibitCount: 24,
  cover: "assets/img/case-001.svg",

  price: { amount: 14.99, currency: "EUR", display: "€14.99", compare: null },

  /* Shown on the product page and above the investigation. */
  brief: [
    "Kestrel Point is a four-room atmospheric monitoring station on the north shore of the Isle of Morn. In the winter of 2009 it held three people: a station lead, a technician and a graduate researcher. It is reached by a thirty-five minute crossing from the mainland slip at Ardmair, and by nothing else.",
    "On the morning of 4 February, Dr Elin Marchetti was not in the station. Her coat and boots were on the rack. The station boat was on its mooring. There were no outbound footprints in forty millimetres of fresh snow. The two remaining occupants were asleep in adjacent rooms and neither reported hearing anything.",
    "The station's instrumentation, however, had been awake all night — a door sensor, a motion sensor, a power log, a weather mast and a continuous audio recorder running in the common room. Between 02:41 and 03:38 that recorder captured a chair moving, pages turning, and Dr Marchetti's voice saying six words.",
    "The inquiry could not reconcile the recording with the search. It could not explain the footprints. It returned no finding, and the file was left open.",
    "Everything required to close it is in this dossier."
  ],

  /* The one line the whole case turns on, used in marketing. */
  teaser: "Three people were in the station. The recorder says four.",

  persons: [
    {
      id: "P1",
      name: "Dr Elin Marchetti",
      age: 41,
      role: "Station lead — atmospheric chemistry",
      status: "MISSING",
      tone: "subject",
      summary: "Nine years at Kestrel Point. Held sole administrator credentials for the station's instrument archive. Described by colleagues as exacting and increasingly withdrawn in the weeks before 4 February.",
      note: "Personal expedition parka and boots are listed on her January equipment inventory. Neither was recovered from the station."
    },
    {
      id: "P2",
      name: "Callum Reyes",
      age: 34,
      role: "Station technician",
      status: "WITNESS",
      tone: "poi",
      summary: "Responsible for the generator, the microgrid tie and the instrument mast. Second-longest serving member of the team. Reported the disappearance at 07:40.",
      note: "States he woke once in the night and did not leave the building."
    },
    {
      id: "P3",
      name: "Nora Vance",
      age: 29,
      role: "Graduate researcher (12-week placement)",
      status: "WITNESS",
      tone: "poi",
      summary: "Arrived 12 January. Argued with Dr Marchetti at the evening meal on 3 February over the station's aerosol dataset. States she took a prescribed sedative at 22:00 and heard nothing.",
      note: "Her account of that night contains a contradiction. It is not the contradiction that matters."
    },
    {
      id: "P4",
      name: "Peter Ilves",
      age: 58,
      role: "Boat operator — MV Sgurr, contracted resupply",
      status: "WITNESS",
      tone: "poi",
      summary: "Runs the only contracted vessel between Ardmair slip and Kestrel Point. Delivered fuel and stores on the evening of 3 February and states he made no further crossing until the alarm was raised.",
      note: "The harbour berth log does not agree with him."
    },
    {
      id: "P5",
      name: "Marina Holt",
      age: 63,
      role: "Harbourmaster, Ardmair slip",
      status: "WITNESS",
      tone: "witness",
      summary: "Maintains the berth log for the slip, assisted by a fixed camera on the pontoon head. Has kept the log by hand for nineteen years.",
      note: "Her log is the only record of that night made by someone with nothing to gain."
    }
  ],

  /* Master timeline. `key` marks events that matter to the solution,
     `gap` marks holes in the record, `src` cites the exhibit. */
  timeline: [
    { time: "3 FEB · 18:05", text: "MV Sgurr departs Ardmair slip with fuel and stores for Kestrel Point.", src: "EX-13" },
    { time: "3 FEB · 18:40", text: "Sgurr alongside Kestrel Point pier. Peter Ilves offloads 200 litres of diesel and one crate of provisions.", src: "EX-12" },
    { time: "3 FEB · 19:05", text: "Sgurr departs the station pier.", src: "EX-12" },
    { time: "3 FEB · 19:48", text: "Sgurr returns to Ardmair slip.", src: "EX-13" },
    { time: "3 FEB · 19:30", text: "Evening meal. Marchetti and Vance argue over the calibration applied to the January aerosol series. Reyes describes it as \"cold rather than loud\".", src: "EX-10" },
    { time: "3 FEB · 21:12", text: "Marchetti writes the final manual observation of the night in the station daybook.", src: "EX-23" },
    { time: "3 FEB · 22:00", text: "Vance retires to her room. States she took one prescribed sedative tablet.", src: "EX-11" },
    { time: "3 FEB · 22:47", text: "Reyes completes the nightly generator check. Day tank logged at 61%.", src: "EX-14" },
    { time: "3 FEB · 23:52", text: "Outgoing message from Marchetti's satellite handset: \"Confirmed. I'll be ready at 2.\"", src: "EX-09", key: true },
    { time: "4 FEB · 00:52", text: "Berth log records MV Sgurr departing Ardmair slip. No purpose entered.", src: "EX-13", key: true },
    { time: "4 FEB · 01:41", text: "Photograph EX-07 taken — true time, once the camera clock offset is applied.", src: "EX-07 / EX-08", key: true, hidden: true },
    { time: "4 FEB · 01:58", text: "Administrator credentials MARCHETTI_E open a write session on the audio archive partition. Duration 3 min 40 s.", src: "EX-18", key: true },
    { time: "4 FEB · 02:15", text: "Snow begins. Light, no wind.", src: "EX-04", key: true },
    { time: "4 FEB · 02:41", text: "Exterior door sensor: OPEN — 8 seconds.", src: "EX-03", key: true },
    { time: "4 FEB · 02:44", text: "Island microgrid supply fails. Generator changeover. Non-essential circuits shed, including the pier light, the workshop and the exterior floods.", src: "EX-14", key: true },
    { time: "4 FEB · 03:05", text: "Snow ceases. Accumulation 40 mm, even, undisturbed across the approach.", src: "EX-04", key: true },
    { time: "4 FEB · 03:11", text: "Audio: a chair is moved. Two pages turn.", src: "EX-05" },
    { time: "4 FEB · 03:26", text: "Berth log records MV Sgurr returning to Ardmair slip.", src: "EX-13", key: true },
    { time: "4 FEB · 03:29", text: "Audio: a voice identified by both witnesses as Dr Marchetti's — \"It's fine. Go back to bed.\"", src: "EX-05", key: true },
    { time: "4 FEB · 03:31–03:35", text: "Audio logger records SENSOR RESET. Four minutes absent from the transcript.", src: "EX-05", gap: true },
    { time: "4 FEB · 03:36", text: "Corridor motion sensor triggered.", src: "EX-03" },
    { time: "4 FEB · 03:38", text: "Exterior door sensor: OPEN — 22 seconds.", src: "EX-03", key: true },
    { time: "4 FEB · 03:44", text: "Inbound call to Marchetti's handset. Unanswered, 8 seconds.", src: "EX-09" },
    { time: "4 FEB · 04:20", text: "Berth log records MV Sgurr departing Ardmair slip a second time.", src: "EX-13" },
    { time: "4 FEB · 04:55", text: "Berth log records MV Sgurr returning. Thirty-five minutes elapsed.", src: "EX-13", key: true },
    { time: "4 FEB · 06:10", text: "Microgrid supply restored. Shed circuits return.", src: "EX-14" },
    { time: "4 FEB · 07:02", text: "Reyes finds Marchetti's room empty and her bed unslept-in.", src: "EX-10" },
    { time: "4 FEB · 07:40", text: "Reyes reports the disappearance by satellite handset.", src: "EX-01" },
    { time: "4 FEB · 09:25", text: "First officers reach the station. Snow across the approach recorded as undisturbed except for a single line of prints described in EX-01.", src: "EX-01", key: true }
  ],

  /* Categories drive the evidence filter rail. */
  categories: [
    { id: "reports",     label: "Reports",     hint: "Official narrative" },
    { id: "logs",        label: "Instrument",  hint: "Machine record" },
    { id: "statements",  label: "Statements",  hint: "Human record" },
    { id: "photographs", label: "Photographs", hint: "Visual record" },
    { id: "documents",   label: "Documents",   hint: "Paper record" },
    { id: "maps",        label: "Maps",        hint: "Geography" }
  ],

  exhibits: [
    /* ─── EX-01 ─────────────────────────────────────────────── */
    {
      id: "EX-01", cat: "reports", kind: "REPORT",
      title: "First Response Report",
      sub: "Ardmair Division · 4 February 2009 · 09:25",
      hint: "Read the description of the snow twice. It contains the whole problem and half the answer.",
      body: [
        { t: "kv", rows: [
          ["Reporting officer", "Sgt. D. Aylward, Ardmair Division"],
          ["Attended", "4 Feb 2009, 09:25"],
          ["Conditions on arrival", "−3 °C, clear, no wind, 40 mm lying snow"],
          ["Persons present", "C. Reyes (34), N. Vance (29)"],
          ["Persons absent", "Dr E. Marchetti (41)"]
        ]},
        { t: "head", v: "Narrative" },
        { t: "p", v: "Attended Kestrel Point Field Station following a report by satellite handset at 07:40 that the station lead could not be located. Crossing made in the vessel MV Sgurr, operator P. Ilves, departing Ardmair 08:12." },
        { t: "p", v: "The station comprises a single-storey block of four rooms with a common room, a vestibule and a covered walkway to a generator shed. There is one exterior door. The windows are sealed units and none showed signs of having been opened or forced. The station boat Kittiwake was on its mooring and dry inside." },
        { t: "p", v: "Dr Marchetti's room was in order. The bed had not been slept in. Her spectacles were on the desk. A station-issue coat and a pair of station-issue boots were on the vestibule rack." },
        { t: "head", v: "Ground conditions" },
        { t: "p", v: "Snow lay evenly across the entire approach, the pier path, the shore path and the pier itself. Accumulation measured at 40 mm in six places, consistent throughout. The surface was undisturbed with one exception, recorded below." },
        { t: "note", v: "A single line of footprints ran from the pier head to the exterior door. Inbound only. No corresponding outbound line. Prints were crisp and had not been softened, indicating they were made after the snowfall ceased. The covered walkway to the generator shed carries no snow and would not retain prints." },
        { t: "head", v: "Preliminary view" },
        { t: "p", v: "No evidence of forced entry, struggle, or disturbance within the station. No trace on the shoreline within 400 m. The absence of an outbound track across an unbroken surface cannot presently be reconciled with the absence of the missing person from the building." },
        { t: "sig", name: "D. Aylward", role: "Sergeant, Ardmair Division", date: "4 February 2009" }
      ]
    },

    /* ─── EX-02 ─────────────────────────────────────────────── */
    {
      id: "EX-02", cat: "maps", kind: "PLAN",
      title: "Site Plan — Kestrel Point Field Station",
      sub: "Drawn to scale · Caldon Atmospheric Trust, 2004",
      hint: "One route off this site leaves no prints. Find it, and ask who could use it.",
      body: [
        { t: "img", src: "assets/img/ex-siteplan.svg", alt: "Scale plan of Kestrel Point Field Station showing the station block, covered walkway, generator shed, pier path and pier.", cap: "Fig. 1 — Station layout. North to top of sheet." },
        { t: "kv", rows: [
          ["Station block", "4 rooms, common room, vestibule. One exterior door (east elevation)."],
          ["Generator shed", "18 m north-east. Reached by a roofed walkway — no snow accumulation."],
          ["Pier path", "Gravel, 62 m, exposed. Snow-retaining."],
          ["Pier", "Timber, 24 m. Station mooring on the south face."],
          ["Weather mast", "31 m south-west, on the rise. Instrument cabling runs underground."],
          ["Shore path", "Traverses the headland west. Exposed. Snow-retaining."]
        ]},
        { t: "note", v: "The covered walkway is the only exterior route on the site that will not record a footprint in lying snow. It connects the station door to the generator shed and terminates there." }
      ]
    },

    /* ─── EX-03 ─────────────────────────────────────────────── */
    {
      id: "EX-03", cat: "logs", kind: "SENSOR LOG",
      title: "Door and Motion Sensor Log",
      sub: "Instrument channel D1/M1 · 3–4 February 2009",
      hint: "A door sensor records that a door opened. It does not record which way anyone went.",
      body: [
        { t: "mono", v: "KESTREL PT / SECURITY CHANNEL / EXPORT AD-0217-03" },
        { t: "table", cols: ["Time", "Channel", "Event", "Duration"], rows: [
          ["21:40:16", "D1 EXT", "OPEN", "0:14"],
          ["21:41:02", "D1 EXT", "OPEN", "0:09"],
          ["22:47:31", "D1 EXT", "OPEN", "1:52"],
          ["22:49:23", "D1 EXT", "OPEN", "0:11"],
          ["02:41:07", "D1 EXT", "OPEN", "0:08"],
          ["03:36:44", "M1 CORRIDOR", "MOTION", "0:31"],
          ["03:38:02", "D1 EXT", "OPEN", "0:22"],
          ["07:02:10", "M1 CORRIDOR", "MOTION", "2:14"],
          ["07:39:55", "D1 EXT", "OPEN", "3:40"]
        ], note: "D1 EXT is a magnetic reed contact on the single exterior door. It records the interval during which the door is not closed. It has no directional capability. M1 is a passive infrared unit in the corridor serving the four rooms; it does not cover the common room." },
        { t: "note", v: "The 22:47 and 22:49 pair corresponds to the nightly generator check. The 02:41 event has no corresponding second event until 03:38 — a gap of fifty-seven minutes." }
      ]
    },

    /* ─── EX-04 ─────────────────────────────────────────────── */
    {
      id: "EX-04", cat: "logs", kind: "MET LOG",
      title: "Meteorological Log — Station Mast",
      sub: "Automatic, 10-minute intervals · 4 February 2009",
      hint: "Forty millimetres of snow fell onto a path. Then it stopped. Both facts are load-bearing.",
      body: [
        { t: "table", cols: ["Time", "Temp °C", "Wind", "Precip", "Lying"], rows: [
          ["01:50", "−2.1", "calm", "—", "0 mm"],
          ["02:00", "−2.4", "calm", "—", "0 mm"],
          ["02:10", "−2.6", "calm", "—", "0 mm"],
          ["02:20", "−2.8", "calm", "snow lt", "3 mm"],
          ["02:30", "−2.9", "calm", "snow lt", "9 mm"],
          ["02:40", "−3.0", "calm", "snow mod", "16 mm"],
          ["02:50", "−3.1", "calm", "snow mod", "25 mm"],
          ["03:00", "−3.2", "calm", "snow lt", "36 mm"],
          ["03:10", "−3.2", "calm", "—", "40 mm"],
          ["03:20", "−3.3", "calm", "—", "40 mm"],
          ["04:00", "−3.5", "calm", "—", "40 mm"],
          ["09:20", "−3.0", "calm", "—", "40 mm"]
        ], note: "Precipitation onset 02:15. Cessation 03:05. Total accumulation 40 mm. Wind calm throughout — no drifting, no infill by wind action." },
        { t: "note", v: "In calm conditions, snow falling at the rates logged above will fill and erase a footprint in soft accumulation within approximately twenty minutes. After 03:05 nothing further fell." }
      ]
    },

    /* ─── EX-05 ─────────────────────────────────────────────── */
    {
      id: "EX-05", cat: "logs", kind: "AUDIO TRANSCRIPT",
      title: "Audio Logger Transcript — 4 February, 02:38–03:42",
      sub: "Common room channel A1 · continuous recording",
      weight: 3,
      hint: "You are looking at fifty-seven minutes of proof. Proof is only as good as the file it lives in.",
      body: [
        { t: "mono", v: "CHANNEL A1 / COMMON ROOM / CONTINUOUS / EXPORT AD-0217-05" },
        { t: "p", v: "Transcribed by the inquiry from the station's own archive copy. Non-verbal events are annotated where the transcriber identified them." },
        { t: "transcript", rows: [
          { time: "02:38:00", cue: "Room tone. Clock escapement audible. No speech." },
          { time: "02:41:07", cue: "Exterior door. Latch, then close. Eight seconds." },
          { time: "02:44:12", cue: "Supply interruption. Lighting relay. Generator hum enters at low level and remains." },
          { time: "02:52:40", cue: "Roof tick — thermal contraction, north pitch." },
          { time: "03:02:18", cue: "Single page turn." },
          { time: "03:07:55", cue: "Roof tick — north pitch." },
          { time: "03:11:03", cue: "Chair moved on boards, approximately 300 mm." },
          { time: "03:11:31", cue: "Two page turns in succession." },
          { time: "03:18:09", cue: "Cup set down on a hard surface." },
          { time: "03:22:47", cue: "Roof tick — north pitch." },
          { time: "03:29:12", who: "FEMALE VOICE", line: "It's fine. Go back to bed." },
          { time: "03:29:19", cue: "No reply recorded. No second voice on the channel." },
          { time: "03:30:44", cue: "Chair moved on boards." },
          { time: "03:31:00", cue: "SENSOR RESET — channel unavailable" },
          { time: "03:35:00", cue: "Channel restored. Room tone. Generator hum present." },
          { time: "03:36:44", cue: "Corridor movement audible through the wall." },
          { time: "03:38:02", cue: "Exterior door. Latch, then close. Twenty-two seconds." },
          { time: "03:42:00", cue: "End of requested export." }
        ]},
        { t: "note", v: "Both surviving occupants identified the voice at 03:29:12 as Dr Marchetti's. Neither reported hearing it at the time." }
      ]
    },

    /* ─── EX-06 ─────────────────────────────────────────────── */
    {
      id: "EX-06", cat: "logs", kind: "AUDIO TRANSCRIPT",
      title: "Audio Logger Transcript — 31 January, 23:10–00:14",
      sub: "Archive comparison copy · common room channel A1",
      weight: 3,
      hint: "Put this beside EX-05 and read the two columns together, line by line, not one after the other.",
      body: [
        { t: "mono", v: "CHANNEL A1 / COMMON ROOM / ARCHIVE / EXPORT AD-0217-06" },
        { t: "p", v: "Requested by the inquiry as a comparison sample of ordinary night-time activity at the station." },
        { t: "transcript", rows: [
          { time: "23:10:00", cue: "Room tone. Clock escapement audible. No speech." },
          { time: "23:13:07", cue: "Exterior door. Latch, then close. Eight seconds." },
          { time: "23:16:12", cue: "Supply interruption. Lighting relay. Generator hum enters at low level and remains." },
          { time: "23:24:40", cue: "Roof tick — thermal contraction, north pitch." },
          { time: "23:34:18", cue: "Single page turn." },
          { time: "23:39:55", cue: "Roof tick — north pitch." },
          { time: "23:43:03", cue: "Chair moved on boards, approximately 300 mm." },
          { time: "23:43:31", cue: "Two page turns in succession." },
          { time: "23:50:09", cue: "Cup set down on a hard surface." },
          { time: "23:54:47", cue: "Roof tick — north pitch." },
          { time: "00:01:12", who: "FEMALE VOICE", line: "It's fine. Go back to bed." },
          { time: "00:01:19", cue: "No reply recorded. Corridor door closes." },
          { time: "00:02:44", cue: "Chair moved on boards." },
          { time: "00:09:30", cue: "Cupboard, then running water." },
          { time: "00:14:00", cue: "End of requested export." }
        ]},
        { t: "note", v: "Station records show a microgrid supply interruption on the night of 31 January at 23:16, of similar duration to that of 4 February." }
      ]
    },

    /* ─── EX-07 ─────────────────────────────────────────────── */
    {
      id: "EX-07", cat: "photographs", kind: "PHOTOGRAPH",
      title: "Photograph — Station Pier",
      sub: "Recovered from Dr Marchetti's camera · file stamp 04 FEB 03:52",
      weight: 3,
      hint: "Before you ask what this photograph shows, ask whether you can trust the number written under it.",
      body: [
        { t: "img", src: "assets/img/ex-pier.svg", alt: "Night photograph of a timber pier lit by a single lamp, with a vessel alongside carrying an illuminated gantry lamp.", cap: "EX-07 · Camera file stamp: 04 FEB 2009 03:52:16" },
        { t: "kv", rows: [
          ["Device", "Compact digital camera, recovered from the common room shelf"],
          ["File stamp", "04 FEB 2009 03:52:16"],
          ["Frame", "0417"],
          ["Subject", "Station pier from the vestibule step, looking south-east"]
        ]},
        { t: "head", v: "Inquiry description of the frame" },
        { t: "list", items: [
          "The pier lamp is lit.",
          "A vessel lies alongside the pier's south face, outboard of the station boat Kittiwake.",
          "The vessel carries an illuminated lamp on an aft gantry.",
          "There is no lying snow on the pier decking or the pier path.",
          "No person is visible in the frame."
        ]},
        { t: "note", v: "Frame 0417 is the only frame recovered from the device for 3–4 February. Frames 0410–0416 were recorded on 2 February and show instrument calibration work at the mast." }
      ]
    },

    /* ─── EX-08 ─────────────────────────────────────────────── */
    {
      id: "EX-08", cat: "photographs", kind: "PHOTOGRAPH",
      title: "Photograph — Common Room Noticeboard",
      sub: "Same device, frame 0418 · file stamp 04 FEB 03:58",
      weight: 3,
      hint: "There are two clocks in this exhibit. They do not agree. That disagreement is a measurement.",
      body: [
        { t: "img", src: "assets/img/ex-noticeboard.svg", alt: "Photograph of a station noticeboard beside a wall clock, with a tide card and a rota pinned to the cork.", cap: "EX-08 · Camera file stamp: 04 FEB 2009 03:58:41" },
        { t: "kv", rows: [
          ["Device", "As EX-07 — same camera, same card"],
          ["File stamp", "04 FEB 2009 03:58:41"],
          ["Frame", "0418"],
          ["Subject", "Common room noticeboard and wall clock, north wall"]
        ]},
        { t: "head", v: "Inquiry description of the frame" },
        { t: "list", items: [
          "The station wall clock is legible in the frame. It reads 01:47.",
          "The wall clock was found on 4 February to be accurate to within one minute of the instrument time base.",
          "The rota sheet pinned to the board is the current week's, headed 2–8 FEB.",
          "The pinned tide card is legible and dated FEB 2009.",
          "Room lighting is on. The generator indicator lamp beside the board is not lit."
        ]},
        { t: "note", v: "The device's internal clock was found on examination to have been set incorrectly. It was never corrected. Both frames carry the same error." }
      ]
    },

    /* ─── EX-09 ─────────────────────────────────────────────── */
    {
      id: "EX-09", cat: "documents", kind: "COMMS RECORD",
      title: "Satellite Handset Log and Message Extract",
      sub: "Handset assigned to Dr E. Marchetti · 3–4 February",
      weight: 2,
      hint: "Six words, one number, and a time. Then go and find out where that number was moored.",
      body: [
        { t: "table", cols: ["Time", "Type", "Counterparty", "Duration / Content"], rows: [
          ["3 FEB 09:14", "VOICE OUT", "Caldon Trust, Ardmair office", "4 min 20 s"],
          ["3 FEB 17:50", "SMS IN", "+44 7700 900 118", "\"Weather holds. Same as agreed.\""],
          ["3 FEB 23:52", "SMS OUT", "+44 7700 900 118", "\"Confirmed. I'll be ready at 2.\""],
          ["4 FEB 03:44", "VOICE IN", "+44 7700 900 118", "8 s — unanswered"],
          ["4 FEB 07:40", "VOICE OUT", "Ardmair Division", "6 min 02 s — reported by C. Reyes using this handset"]
        ], note: "Subscriber check on +44 7700 900 118 returns a business account in the name of Ardmair Marine Services, the trading name under which MV Sgurr is operated." },
        { t: "note", v: "No message body was recovered for the 17:50 inbound beyond the text shown. The handset was found on the common room shelf beside the camera." }
      ]
    },

    /* ─── EX-10 ─────────────────────────────────────────────── */
    {
      id: "EX-10", cat: "statements", kind: "STATEMENT",
      title: "Statement — Callum Reyes",
      sub: "Station technician · taken 4 February, 11:20",
      weight: 2,
      hint: "He tells you about a night that is not this night. Write down what happened on that other night.",
      body: [
        { t: "kv", rows: [["Name", "Callum Reyes, 34"], ["Role", "Station technician"], ["Taken", "4 Feb 2009, 11:20, at the station"], ["Officer", "Sgt. D. Aylward"]] },
        { t: "quote", v: "We ate at half seven. Elin and Nora had it out over the January series — Nora thought the calibration had been applied twice and Elin told her she was welcome to check it herself. It was cold rather than loud. Nobody shouted. Elin went to the common room after and I did the genny check at about a quarter to eleven." },
        { t: "quote", v: "I went to bed around eleven. I woke up once. The changeover alarm indicator was showing on the panel in the corridor — you get that when the island supply drops and the genny picks up. It's a lamp, not a noise. I saw it under the door. So I got up, went to the corridor, looked at the panel, and it had already caught. Everything was fine. Elin's door was shut. Nora's door was shut. I went back to bed." },
        { t: "quote", v: "I didn't open the front door. I've been asked that four times now and the answer doesn't change. I didn't go outside. There was nothing to go outside for — the genny had already picked up, and if it hadn't I'd have gone through the walkway, not the front." },
        { t: "quote", v: "I heard nothing. No voice. If you tell me the recorder has her talking at half three then I can't help you, because I was in bed and I heard nothing through that wall. Those walls are eighty millimetres of board and I've heard her drop a pen before now." },
        { t: "head", v: "On the night of 31 January" },
        { t: "quote", v: "I had a stomach thing that week. I was up half the night on the Saturday — that would be the thirty-first. I came through to the common room about midnight to get water and she was still up with her papers. She told me to go back to bed. Something like — it's fine, go back to bed. That's her. She'd say that." },
        { t: "head", v: "On Dr Marchetti's state of mind" },
        { t: "quote", v: "She'd been off for weeks. Not upset. Organised. There's a difference and I noticed it and I didn't do anything about it." },
        { t: "sig", name: "C. Reyes", role: "Statement read back and signed", date: "4 February 2009" }
      ]
    },

    /* ─── EX-11 ─────────────────────────────────────────────── */
    {
      id: "EX-11", cat: "statements", kind: "STATEMENT",
      title: "Statement — Nora Vance",
      sub: "Graduate researcher · taken 4 February, 12:05",
      weight: 2,
      hint: "She is lying about one thing. Decide whether that thing has anything at all to do with the disappearance.",
      body: [
        { t: "kv", rows: [["Name", "Nora Vance, 29"], ["Role", "Graduate researcher, 12-week placement"], ["Taken", "4 Feb 2009, 12:05, at the station"], ["Officer", "Sgt. D. Aylward"]] },
        { t: "quote", v: "The argument was mine. I raised it. The January aerosol series has a correction applied to it that I can't reproduce from the raw counts, and when I asked her about it she told me the raw counts weren't my concern. That's not an answer you give a researcher. So yes, it was an argument." },
        { t: "quote", v: "I went to my room at ten. I took a tablet — I'm prescribed them, I don't sleep well in places like this — and I was gone until Callum knocked in the morning. I heard nothing. I'd have heard nothing if the roof came off." },
        { t: "quote", v: "I did not leave my room. I did not go into the common room. I want that written down because I know how this looks. I had a row with her at dinner and now she's gone and I'm the one who's been here three weeks." },
        { t: "head", v: "Supplementary, taken 5 February, 16:40" },
        { t: "quote", v: "All right. I didn't take the tablet. I said I did because I didn't want to explain what I was doing instead, and now I have to explain it anyway. I was copying the raw instrument files onto my own drive. I did it between about eleven and one in the morning, in my room, with the door shut, because I thought she'd altered them and I thought that if I raised it formally the files would stop existing." },
        { t: "quote", v: "I still heard nothing. I had headphones in for most of it. I've handed over the drive. Do what you like with it — I'd rather be the person who copied the files than the person who didn't." },
        { t: "sig", name: "N. Vance", role: "Supplementary statement read back and signed", date: "5 February 2009" }
      ]
    },

    /* ─── EX-12 ─────────────────────────────────────────────── */
    {
      id: "EX-12", cat: "statements", kind: "STATEMENT",
      title: "Statement — Peter Ilves",
      sub: "Operator, MV Sgurr · taken 4 February, 15:30",
      weight: 3,
      hint: "Everything he says about his own boat can be checked against two other exhibits. Check both.",
      body: [
        { t: "kv", rows: [["Name", "Peter Ilves, 58"], ["Role", "Operator, MV Sgurr — contracted resupply"], ["Taken", "4 Feb 2009, 15:30, Ardmair"], ["Officer", "Sgt. D. Aylward"]] },
        { t: "quote", v: "I ran the stores out on the Tuesday evening. Left the slip about six, alongside at Kestrel about twenty to seven. Two hundred litres of diesel and a crate. Elin took the crate. Callum did the fuel with me. I was away by five past seven and back on the slip before eight." },
        { t: "quote", v: "That was the last crossing. I didn't go back out. Next time I went over was the morning, with your sergeant, and that was after eight." },
        { t: "quote", v: "In February I'll do two, maybe three crossings a week. It's thirty-five minutes each way if the sound is kind. Six litres the round trip — I know that boat to the litre, I've had her nineteen years." },
        { t: "head", v: "On Dr Marchetti" },
        { t: "quote", v: "I've run her out and back for nine years. She'd sit up in the wheelhouse and not say anything for the whole crossing and that suited us both. I don't know anything about her business and I didn't ask." },
        { t: "head", v: "Supplementary question put 6 February" },
        { t: "p", v: "Mr Ilves was invited to comment on the Ardmair berth log for the night of 3–4 February. He declined to add to or amend his statement." },
        { t: "sig", name: "P. Ilves", role: "Statement read back and signed", date: "4 February 2009" }
      ]
    },

    /* ─── EX-13 ─────────────────────────────────────────────── */
    {
      id: "EX-13", cat: "documents", kind: "BERTH LOG",
      title: "Berth Log — Ardmair Slip",
      sub: "Kept by hand by M. Holt, Harbourmaster · 3–4 February",
      weight: 3,
      hint: "Two of these movements are too short to have reached the island. One of them matters.",
      body: [
        { t: "mono", v: "ARDMAIR SLIP / BERTH MOVEMENTS / SHEET 041" },
        { t: "table", cols: ["Time", "Vessel", "Movement", "Purpose entered"], rows: [
          ["3 FEB 18:05", "SGURR", "DEPART", "Kestrel stores"],
          ["3 FEB 19:48", "SGURR", "RETURN", "—"],
          ["3 FEB 20:30", "MAIREAD", "RETURN", "Creels"],
          ["4 FEB 00:52", "SGURR", "DEPART", "— (not entered)"],
          ["4 FEB 03:26", "SGURR", "RETURN", "— (not entered)"],
          ["4 FEB 04:20", "SGURR", "DEPART", "— (not entered)"],
          ["4 FEB 04:55", "SGURR", "RETURN", "— (not entered)"],
          ["4 FEB 08:12", "SGURR", "DEPART", "Kestrel — police"],
          ["4 FEB 09:40", "SGURR", "RETURN", "—"]
        ], note: "Movements are recorded from the pontoon-head camera feed and confirmed by the harbourmaster on the following working day. Purpose is entered by the operator on the slip sheet; four entries for this night were left blank." },
        { t: "head", v: "Note appended by M. Holt, 6 February" },
        { t: "quote", v: "I have kept this log by hand since 1990 and I do not put a vessel on it that was not there. The camera is on the pontoon head and it does not know whose boat it is looking at, but I do. Sgurr has an aft gantry lamp. She is the only boat on this slip that has one." },
        { t: "note", v: "Ardmair slip to Kestrel Point is recorded by the operator himself as thirty-five minutes each way. The 00:52 departure and 03:26 return allow two hours thirty-four minutes — sufficient. The 04:20 departure and 04:55 return allow thirty-five minutes in total." }
      ]
    },

    /* ─── EX-14 ─────────────────────────────────────────────── */
    {
      id: "EX-14", cat: "logs", kind: "POWER LOG",
      title: "Power and Generator Log",
      sub: "Microgrid tie and standby set · 3–4 February",
      weight: 3,
      hint: "Make a list of which lights were physically capable of being on, and at what times. Then look at your photographs again.",
      body: [
        { t: "table", cols: ["Time", "Event", "Detail"], rows: [
          ["3 FEB 22:47", "MANUAL CHECK", "Day tank 61%. Signed C.R."],
          ["4 FEB 02:44:38", "SUPPLY FAIL", "Island microgrid tie lost"],
          ["4 FEB 02:44:44", "CHANGEOVER", "Standby set online, 6 s transfer"],
          ["4 FEB 02:44:44", "LOAD SHED", "Non-essential circuits opened — see schedule"],
          ["4 FEB 03:37:02", "PANEL ACK", "Changeover indicator acknowledged at corridor panel"],
          ["4 FEB 06:10:29", "SUPPLY RESTORE", "Microgrid tie recovered, shed circuits closed"]
        ]},
        { t: "head", v: "Load shedding schedule (standby operation)" },
        { t: "table", cols: ["Circuit", "Classification", "State on standby"], rows: [
          ["Instrument rack, mast, logger", "ESSENTIAL", "LIVE"],
          ["Common room and corridor lighting", "ESSENTIAL", "LIVE"],
          ["Room heating (reduced)", "ESSENTIAL", "LIVE"],
          ["Pier lamp", "NON-ESSENTIAL", "SHED"],
          ["Exterior floodlights", "NON-ESSENTIAL", "SHED"],
          ["Workshop and drying room", "NON-ESSENTIAL", "SHED"],
          ["Pier path low-level lighting", "NON-ESSENTIAL", "SHED"]
        ], note: "Shed circuits remained open from 02:44:44 until 06:10:29." },
        { t: "note", v: "The corridor panel acknowledgement at 03:37:02 requires a person standing at the panel and pressing it. It falls inside the corridor motion event recorded in EX-03." }
      ]
    },

    /* ─── EX-15 ─────────────────────────────────────────────── */
    {
      id: "EX-15", cat: "documents", kind: "FUEL RECORD",
      title: "Fuel Record — MV Sgurr",
      sub: "Ardmair slip pump account · week ending 8 February",
      weight: 2,
      hint: "He told you what a crossing costs him. Do the arithmetic he did not do for you.",
      body: [
        { t: "mono", v: "ARDMAIR SLIP / PUMP ACCOUNT / A. MARINE SERVICES" },
        { t: "table", cols: ["Date", "Time", "Litres", "Signed"], rows: [
          ["2 FEB", "11:20", "6.1", "P.I."],
          ["3 FEB", "17:40", "14.2", "P.I."],
          ["5 FEB", "10:05", "12.0", "P.I."],
          ["7 FEB", "16:15", "6.0", "P.I."]
        ], note: "The pump is drawn against a running account and reconciled weekly. Quantities are metered at the pump head." },
        { t: "note", v: "Mr Ilves states in EX-12 that a round trip to Kestrel Point costs him six litres, and that he made one crossing on 3 February. The 5 February entry of 12.0 litres follows two crossings made on 4 February in connection with the search." }
      ]
    },

    /* ─── EX-16 ─────────────────────────────────────────────── */
    {
      id: "EX-16", cat: "documents", kind: "INVENTORY",
      title: "Personal Equipment Inventory — Dr E. Marchetti",
      sub: "Completed on arrival, 12 January 2009 · Trust safety requirement",
      weight: 3,
      hint: "Compare this list against what was actually found on the rack. Not the number of items. The items.",
      body: [
        { t: "p", v: "The Caldon Atmospheric Trust requires each occupant to inventory personal cold-weather equipment on arrival, so that a search party knows what a missing person is likely to be wearing." },
        { t: "table", cols: ["Item", "Description", "Marking"], rows: [
          ["Parka", "Personal. Dark olive, hip length, fur-trimmed hood", "None"],
          ["Boots", "Personal. Brown leather, lace, size 39", "Initials E.M. inked at tongue"],
          ["Gloves", "Personal. Black, leather palm", "None"],
          ["Hat", "Personal. Grey wool", "None"],
          ["Coat (issued)", "Station spare, navy, tag STN-04", "STN-04"],
          ["Boots (issued)", "Station spare, black rubber, size 40", "STN-04"],
          ["Head torch", "Personal", "None"],
          ["Rucksack", "Personal, 30 litre, grey", "None"]
        ]},
        { t: "note", v: "Station spares are held in the vestibule for visitors and for anyone whose own gear is wet. Occupants are asked not to rely on them." }
      ]
    },

    /* ─── EX-17 ─────────────────────────────────────────────── */
    {
      id: "EX-17", cat: "photographs", kind: "SCENE PHOTOGRAPH",
      title: "Scene Photograph — Entrance Vestibule",
      sub: "Taken by attending officer, 4 February 09:52",
      weight: 3,
      hint: "The famous detail in this case is a coat on a hook. Read the label on it.",
      body: [
        { t: "img", src: "assets/img/ex-vestibule.svg", alt: "Scene photograph of a station vestibule showing a coat rack with one navy coat hanging, a pair of black rubber boots below it, and three empty hooks.", cap: "EX-17 · Vestibule, east elevation, looking north. Scale card in frame." },
        { t: "head", v: "Inquiry description" },
        { t: "list", items: [
          "One navy coat on the second hook. Trust tag at the collar reads STN-04.",
          "One pair of black rubber boots, size 40, beneath the second hook. Trust tag STN-04.",
          "Three hooks empty. Hook one carries C. Reyes's jacket. Hook four carries N. Vance's jacket.",
          "No dark olive parka is present in the vestibule or elsewhere in the station.",
          "No brown leather boots, size 39, are present in the vestibule or elsewhere in the station.",
          "A 30-litre grey rucksack listed on EX-16 was not recovered."
        ]},
        { t: "note", v: "The initial press description of this scene as \"her coat and boots still on the rack\" originates from the first report and was not corrected." }
      ]
    },

    /* ─── EX-18 ─────────────────────────────────────────────── */
    {
      id: "EX-18", cat: "logs", kind: "ACCESS LOG",
      title: "Instrument Archive — Access and Credential Record",
      sub: "Logger host · 1–4 February",
      weight: 3,
      hint: "Somebody wrote to the archive in the middle of the night. Ask what a write session on an audio archive can do.",
      body: [
        { t: "table", cols: ["Time", "Credential", "Session", "Partition", "Mode"], rows: [
          ["1 FEB 09:12", "REYES_C", "0:04:10", "instrument", "READ"],
          ["2 FEB 14:38", "MARCHETTI_E", "0:22:51", "instrument", "READ"],
          ["3 FEB 10:02", "VANCE_N", "1:51:30", "instrument", "READ"],
          ["3 FEB 20:44", "MARCHETTI_E", "0:07:02", "archive", "READ"],
          ["4 FEB 01:58:11", "MARCHETTI_E", "0:03:40", "archive", "WRITE"],
          ["4 FEB 10:30", "REYES_C", "0:12:00", "instrument", "READ"]
        ], note: "Administrator credentials were held by the station lead only. The archive partition holds retained recordings from previous nights; the instrument partition holds the live channels. A WRITE session on the archive partition permits a file to be created, replaced or exported." },
        { t: "note", v: "The inquiry did not obtain the underlying audio. It worked from transcripts prepared from the station's own archive copy, as exported by the station on 4 February." }
      ]
    },

    /* ─── EX-19 ─────────────────────────────────────────────── */
    {
      id: "EX-19", cat: "documents", kind: "MEDICAL RECORD",
      title: "Prescription Record — N. Vance",
      sub: "Obtained with consent, 5 February",
      weight: 1,
      hint: "This proves somebody said something untrue. It does not prove what they were doing instead.",
      body: [
        { t: "kv", rows: [
          ["Preparation", "Zopiclone 3.75 mg"],
          ["Quantity dispensed", "28 tablets"],
          ["Dispensed", "14 January 2009"],
          ["Directions", "One at night when required"],
          ["Container count, 5 February", "24 tablets remaining"]
        ]},
        { t: "note", v: "Twenty-two nights elapsed between dispensing and count. Four tablets are accounted for. Ms Vance's initial statement of 4 February describes taking one tablet on the night of 3 February; her supplementary statement of 5 February withdraws that account." }
      ]
    },

    /* ─── EX-20 ─────────────────────────────────────────────── */
    {
      id: "EX-20", cat: "documents", kind: "HANDWRITTEN NOTE",
      title: "Handwritten Note — Marchetti Desk Drawer",
      sub: "Undated · found folded in a field notebook",
      weight: 1,
      hint: "A note without a date is atmosphere until you can date it. Can you?",
      body: [
        { t: "p", v: "Found in the second drawer of the desk in Dr Marchetti's room, folded twice inside the back cover of a field notebook. Written in her hand. Undated and unaddressed." },
        { t: "quote", v: "It is not the finding that is wrong. It is that I let it stand for four years and every year after that it became a thing that could not be corrected without correcting everything under it. I have run out of ways to make the correction small." },
        { t: "note", v: "Handwriting comparison against the station daybook was consistent. The notebook containing the note has entries dated to late January." },
        { t: "note", v: "The inquiry treated this note as capable of more than one reading, and did not rely on it." }
      ]
    },

    /* ─── EX-21 ─────────────────────────────────────────────── */
    {
      id: "EX-21", cat: "documents", kind: "CORRESPONDENCE",
      title: "Internal Correspondence — Dataset Audit Notice",
      sub: "Caldon Atmospheric Trust · issued 28 January 2009",
      weight: 2,
      hint: "This is a date in the near future. Measure the distance between it and the night in question.",
      body: [
        { t: "mono", v: "CALDON ATMOSPHERIC TRUST / INTERNAL / REF CAT-09-114" },
        { t: "kv", rows: [
          ["To", "Dr E. Marchetti, Station Lead, Kestrel Point"],
          ["Copied", "Programme Office; R. Aldiss, Trustee"],
          ["Date", "28 January 2009"],
          ["Subject", "Verification of the Kestrel Point aerosol series, 2005–2008"]
        ]},
        { t: "p", v: "Further to the funding renewal submitted in November, the Trust has commissioned an independent verification of the Kestrel Point aerosol series covering 2005 to 2008 inclusive. The reviewer will require the raw instrument counts alongside the published series, together with a written account of any correction applied at any stage." },
        { t: "p", v: "The reviewer will attend Kestrel Point on 9 February 2009. Please make the raw archive available in full on that date." },
        { t: "sig", name: "H. Prentice", role: "Programme Office, Caldon Atmospheric Trust", date: "28 January 2009" },
        { t: "note", v: "Dr Marchetti acknowledged receipt on 29 January. No further correspondence on the subject was recovered." }
      ]
    },

    /* ─── EX-22 ─────────────────────────────────────────────── */
    {
      id: "EX-22", cat: "maps", kind: "CHART",
      title: "Chart — Ardmair Sound and Crossing Routes",
      sub: "Working copy annotated by the inquiry",
      hint: "Distance divided by speed gives time. The times are already written down elsewhere.",
      body: [
        { t: "img", src: "assets/img/ex-chart.svg", alt: "Chart of Ardmair Sound showing the mainland slip at Ardmair, the Isle of Morn, Kestrel Point on its north shore, and the crossing route between them.", cap: "EX-22 · Ardmair Sound. Depths omitted. Not for navigation — this is a fictional coastline." },
        { t: "kv", rows: [
          ["Ardmair slip to Kestrel Point", "6.4 nautical miles"],
          ["Stated crossing time", "35 minutes each way (EX-12)"],
          ["Implied speed made good", "≈ 11 knots"],
          ["Nearest other landing to Ardmair", "Sannick jetty — 3.1 nautical miles, ≈ 17 minutes each way"],
          ["Nearest landing to Kestrel Point", "None. The north shore has no other landing."]
        ]},
        { t: "note", v: "Sannick jetty serves a fish farm and three houses. It is unlit and unmanned outside working hours." }
      ]
    },

    /* ─── EX-23 ─────────────────────────────────────────────── */
    {
      id: "EX-23", cat: "documents", kind: "DAYBOOK",
      title: "Station Daybook — Page for 3 February",
      sub: "Bound daybook, kept in the common room",
      weight: 1,
      hint: "Look at what she chose to leave tidy.",
      body: [
        { t: "mono", v: "KESTREL POINT DAYBOOK / VOL 11 / P. 214" },
        { t: "table", cols: ["Time", "Entry", "Initials"], rows: [
          ["07:00", "Mast check. Rime on the cups, cleared.", "C.R."],
          ["09:30", "Aerosol rack, filter change.", "E.M."],
          ["11:00", "Vance — raw count extraction, day 3 of 5.", "N.V."],
          ["14:15", "Instrument time base checked against handset. Agreement within 1 s.", "E.M."],
          ["18:40", "Stores landed. 200 L diesel, 1 crate. Signed for.", "E.M."],
          ["21:12", "Manual obs. Cloud 8/8, vis 12 km, no precip. Series complete to date.", "E.M."]
        ]},
        { t: "note", v: "The 21:12 entry is the last in the volume in Dr Marchetti's hand. \"Series complete to date\" is not a formula she used on any other page of the volume." },
        { t: "note", v: "The 14:15 entry confirms that the station's instrument time base was accurate on the afternoon of 3 February." }
      ]
    },

    /* ─── EX-24 — locked until the reveal ───────────────────── */
    {
      id: "EX-24", cat: "logs", kind: "RECOVERED AUDIO",
      title: "Recovered Fragment — 03:33:12",
      sub: "SEALED · released with the case conclusion",
      locked: true,
      weight: 3,
      hint: "Sealed. It is released when you close the case.",
      body: [
        { t: "mono", v: "CHANNEL A1 / RECOVERED FROM CORRUPTED BLOCK / 3.4 SECONDS" },
        { t: "p", v: "During the four minutes recorded on the transcript as SENSOR RESET, the logger did not stop writing. It wrote to a block that the export routine could not read, and which the inquiry never requested. It was recovered in 2019 during a migration of the Trust's archive." },
        { t: "p", v: "The fragment is three point four seconds long. It sits at 03:33:12 — inside the gap, and after the point at which the substituted audio ends." },
        { t: "transcript", rows: [
          { time: "03:33:12.0", cue: "Room tone. Generator hum present, consistent with standby operation." },
          { time: "03:33:12.9", cue: "Breathing. Close to the microphone. Not laboured." },
          { time: "03:33:14.2", cue: "Breathing, second cycle." },
          { time: "03:33:15.4", cue: "Fragment ends. Block boundary." }
        ]},
        { t: "note", v: "At 03:33:12 the exterior door had not opened since 02:41. Dr Marchetti had left the building fifty-two minutes earlier. Callum Reyes was in his room; the corridor sensor does not trigger until 03:36:44, and it covers the only route from the rooms to the common room. Nora Vance was in her room with headphones on." },
        { t: "note", v: "The common room was, by every record the station kept, empty." }
      ]
    }
  ],

  /* ═══ CROSS-REFERENCES ═══════════════════════════════════════
     The core mechanic. The player selects two exhibits and submits
     them. A valid pair returns a finding and advances the case.
     Eleven pairs are valid. Two of them are genuine contradictions
     that have nothing to do with the disappearance — they are here
     because real files contain them, and because a player who
     cannot tell a relevant contradiction from an irrelevant one
     has not finished thinking. */
  crossRefs: [
    {
      id: "XR-1", pair: ["EX-07", "EX-14"], weight: "key",
      title: "A lamp that could not have been lit",
      finding: "EX-07 is stamped 03:52 and shows the pier lamp burning. EX-14 records the pier lamp on a non-essential circuit that was shed at 02:44:44 and not restored until 06:10:29. Both cannot be true. The power log is machine-written; the file stamp comes from a clock a person set by hand. The file stamp is wrong."
    },
    {
      id: "XR-2", pair: ["EX-07", "EX-08"], weight: "key",
      title: "The camera is two hours and eleven minutes fast",
      finding: "EX-08 comes from the same camera and shows the station wall clock reading 01:47 against a file stamp of 03:58. The wall clock was verified accurate. The camera therefore runs 2 h 11 min fast. Applying that correction to EX-07 gives a true capture time of 01:41 — an hour before the door opened, with the pier lamp still lit and no snow yet on the ground. Every impossible element of the photograph resolves at once, and one new fact appears: there was a second vessel at the pier."
    },
    {
      id: "XR-3", pair: ["EX-05", "EX-06"], weight: "key",
      title: "The same fifty-seven minutes, twice",
      finding: "Laid side by side, the 4 February transcript and the 31 January archive transcript are the same recording. Every non-verbal event falls at an identical offset from the start: the door at +3:07, the supply interruption at +6:12, the roof tick at +14:40 and again at +29:55, the page turn at +24:18, the chair at +33:03, the cup at +40:09, the voice at +51:12. Room tone does not repeat itself to the second. The audio covering the hollow hour is a copy of the night of 31 January."
    },
    {
      id: "XR-4", pair: ["EX-18", "EX-05"], weight: "key",
      title: "Who had the archive open, and when",
      finding: "A WRITE session on the archive partition was opened at 01:58:11 under MARCHETTI_E and ran for three minutes forty seconds — forty-three minutes before the door opened, using the only credential at the station capable of replacing an archived file. The inquiry never held the original audio. It worked from an export the station produced itself, on the morning after."
    },
    {
      id: "XR-5", pair: ["EX-12", "EX-13"], weight: "key",
      title: "A crossing that was never declared",
      finding: "Peter Ilves states the 18:05 stores run was his last movement of the night. The Ardmair berth log records MV Sgurr departing at 00:52 and returning at 03:26 — two hours thirty-four minutes, ample for a return crossing to Kestrel Point at his own stated speed. He was invited to comment on the log and declined to add to his statement."
    },
    {
      id: "XR-6", pair: ["EX-15", "EX-12"], weight: "key",
      title: "Eight litres that go nowhere",
      finding: "Ilves puts a Kestrel round trip at six litres and says he made one. On 3 February at 17:40 he drew 14.2 litres. Six covers the declared stores run. The remaining 8.2 covers a second return crossing to Kestrel at six litres and leaves roughly two — close to what the thirty-five minute movement at 04:20 would burn. The arithmetic closes only if he crossed twice."
    },
    {
      id: "XR-7", pair: ["EX-16", "EX-17"], weight: "key",
      title: "The coat on the rack was never hers",
      finding: "The coat and boots photographed on the vestibule rack carry Trust tag STN-04 — station spares. Dr Marchetti's own parka, her size 39 boots marked E.M., her gloves, her hat and her 30-litre rucksack are all listed on her January inventory and none was recovered. The single most repeated detail of this case is exactly backwards: she left dressed for the weather, and what was left behind belonged to the building."
    },
    {
      id: "XR-8", pair: ["EX-03", "EX-04"], weight: "key",
      title: "Why there was nothing to find in the snow",
      finding: "The door opened at 02:41:07. Snow began at 02:15 and did not stop until 03:05 — twenty-four further minutes of accumulation in calm air, at rates that fill a print in soft snow within roughly twenty minutes. Any track made at 02:41 was gone before the fall ended. The single inbound line found at 09:25 was necessarily made after 03:05, which places it with the 03:38 door event and not the 02:41 one."
    },
    {
      id: "XR-9", pair: ["EX-09", "EX-13"], weight: "key",
      title: "\"Ready at 2\", and a boat that leaves at 00:52",
      finding: "At 23:52 Dr Marchetti sends six words to a number registered to Ardmair Marine Services — the trading name under which MV Sgurr is operated. Fifty-eight minutes later that vessel leaves the slip with no purpose entered, on a crossing its operator says he did not make. Thirty-five minutes' passage puts her alongside at about 01:27. EX-07, corrected, was taken at 01:41."
    },
    {
      id: "XR-10", pair: ["EX-21", "EX-20"], weight: "key",
      title: "Eleven days",
      finding: "On 28 January the Trust gave notice that an independent reviewer would attend on 9 February and would require the raw counts alongside the published series, with a written account of every correction applied. The undated note in her drawer describes a finding she let stand for four years and could no longer correct in a small way. The audit was six days after the night she vanished, and she had known about it for eleven."
    },
    {
      id: "XR-11", pair: ["EX-19", "EX-11"], weight: "herring",
      title: "A lie with nothing behind it",
      finding: "The tablet count disproves Nora Vance's first account — and she withdrew it herself the following day, unprompted. What she was actually doing between 23:00 and 01:00, copying the raw instrument files she believed were about to be altered, makes her the only person at Kestrel Point who took a step to preserve the evidence. The contradiction is real. It is not part of the disappearance.",
      note: "Filed as immaterial."
    },
    {
      id: "XR-12", pair: ["EX-13", "EX-22"], weight: "open",
      title: "The thirty-five minute movement",
      finding: "The 04:20–04:55 pair cannot be a Kestrel crossing; the island is seventy minutes there and back. Sannick jetty is seventeen minutes each way and fits exactly. Nothing in this dossier establishes what went to Sannick at half past four in the morning, or who was aboard. The inquiry did not pursue it.",
      note: "Unresolved. Carried forward."
    }
  ],

  /* ═══ THE THEORY FORM ════════════════════════════════════════ */
  theoryForm: {
    intro: "File your reconstruction. You are graded question by question against the dossier — and you will see the conclusion either way. There is no penalty for being wrong. There is no reward for guessing.",
    questions: [
      {
        id: "Q1",
        prompt: "What happened to Dr Elin Marchetti on the night of 3–4 February?",
        options: [
          { id: "a", label: "She was taken from the station by a person or persons unknown." },
          { id: "b", label: "She went out towards the pier and entered the water." },
          { id: "c", label: "She left the station deliberately, by arrangement, and did not intend to be found.", correct: true },
          { id: "d", label: "She never left the building." }
        ]
      },
      {
        id: "Q2",
        prompt: "What accounts for the fifty-seven minutes of audio between 02:41 and 03:38?",
        options: [
          { id: "a", label: "An equipment fault in the logger." },
          { id: "b", label: "A recording from an earlier night, put in place of the live channel.", correct: true },
          { id: "c", label: "Another person in the room imitating her voice." },
          { id: "d", label: "The logger clock was running behind the door sensor clock." }
        ]
      },
      {
        id: "Q3",
        prompt: "Why was there no outbound track in the snow?",
        options: [
          { id: "a", label: "She was carried, and the carrier walked back in his own prints." },
          { id: "b", label: "She left by the covered walkway and was never on open ground." },
          { id: "c", label: "She left at 02:41, and twenty-four more minutes of snowfall filled the track.", correct: true },
          { id: "d", label: "The fall had already stopped, and she crossed the bare rock of the headland." }
        ]
      },
      {
        id: "Q4",
        prompt: "Who assisted her?",
        options: [
          { id: "a", label: "Callum Reyes." },
          { id: "b", label: "Nora Vance." },
          { id: "c", label: "Peter Ilves.", correct: true },
          { id: "d", label: "No one. She acted alone." }
        ]
      },
      {
        id: "Q5",
        prompt: "Which single exhibit fixes the true time at which EX-07 was taken?",
        type: "exhibit",
        answer: "EX-08",
        placeholder: "Exhibit code — e.g. EX-14"
      }
    ],
    grades: {
      5: { title: "CASE CLOSED", note: "Complete reconstruction. You had the mechanism, the accomplice, and the measurement the whole file hangs on." },
      4: { title: "SUBSTANTIALLY CORRECT", note: "One element short — and the dossier supports the element you missed. It is in an exhibit you have already opened." },
      3: { title: "PARTIAL FINDING", note: "You established that the record had been interfered with. You stopped before you finished following it." },
      2: { title: "INCONCLUSIVE", note: "You are working from the story the file wants to tell rather than from the instruments. The instruments have no motive." },
      1: { title: "INCONCLUSIVE", note: "You are working from the story the file wants to tell rather than from the instruments. The instruments have no motive." },
      0: { title: "NO FINDING", note: "Nothing in this case is supernatural and nothing in it is coincidence. Start again at the machine records and let them contradict the people." }
    }
  },

  /* ═══ THE THREE READINGS ═════════════════════════════════════ */
  theories: [
    {
      id: "T1", name: "The Intruder",
      claim: "The 02:41 door event was an entry, not an exit. Someone came ashore, took Dr Marchetti, and left at 03:38.",
      forIt: [
        "It explains a single inbound line of prints.",
        "It explains why nobody heard anything — the station was built for silence.",
        "It fits the 03:38 exit exactly."
      ],
      against: [
        "The prints were made after the snow stopped at 03:05 — seventy-eight minutes too late to belong to the 02:41 event.",
        "Nothing was disturbed. Her spectacles were left square on the desk.",
        "An intruder does not hold the station's archive credentials, and does not use them at 01:58."
      ],
      verdict: "Not supported."
    },
    {
      id: "T2", name: "The Water",
      claim: "She walked out towards the pier in the night, slipped or went in, and was carried out on the ebb.",
      forIt: [
        "The pier path ices badly in February.",
        "Ardmair Sound would not be expected to give anything back.",
        "It requires nobody to have lied."
      ],
      against: [
        "Her parka, boots, gloves, hat and rucksack are all missing. People who fall in the water do not pack.",
        "It needs the recorder to be wrong by coincidence, on the one night it mattered.",
        "It has nothing to say about a WRITE session on the archive partition at 01:58."
      ],
      verdict: "Not supported."
    },
    {
      id: "T3", name: "The Departure",
      claim: "She arranged her own disappearance, prepared the record to cover the hour in which she left, and went by sea.",
      forIt: [
        "Every machine record supports it once the camera clock is corrected.",
        "The berth log and the fuel account independently show a crossing that was never declared.",
        "She had the credentials, the motive, and eleven days' notice of an audit she could not survive."
      ],
      against: [
        "It requires a second person to have lied on the record and to go on lying.",
        "It does not account for the fragment recovered at 03:33:12."
      ],
      verdict: "Supported by the dossier."
    }
  ],

  /* ═══ THE CONCLUSION ═════════════════════════════════════════
     Released when the investigator files a theory. */
  solution: {
    title: "The Hollow Hour — Conclusion",
    verdict: "Dr Elin Marchetti left Kestrel Point Field Station of her own volition at 02:41 on 4 February 2009, having spent the preceding four hours preparing the record that would be used to look for her.",
    steps: [
      {
        n: "01",
        head: "The photograph is not from that hour, and it is the key to the rest.",
        body: "EX-07 is stamped 03:52 and shows the pier lamp lit. EX-14 shows that lamp dead from 02:44:44 to 06:10:29. EX-08, taken on the same camera, shows the station wall clock at 01:47 against a stamp of 03:58 — the camera runs two hours eleven minutes fast. Corrected, EX-07 was taken at 01:41: lamp lit, no snow, and a second vessel alongside the pier carrying an aft gantry lamp.",
        refs: ["EX-07", "EX-08", "EX-14"]
      },
      {
        n: "02",
        head: "That vessel is MV Sgurr, and it was never declared.",
        body: "The Ardmair berth log records Sgurr departing at 00:52 and returning at 03:26 — two hours thirty-four minutes for a seventy-minute round crossing. Peter Ilves states he made no such movement, and declined to comment when shown the log. The pump account is worse for him: he drew 14.2 litres on 3 February and puts a Kestrel round trip at six. Only two crossings make that arithmetic close. Marina Holt's note settles identification — Sgurr is the only vessel on that slip with an aft gantry lamp, and the lamp is in the photograph.",
        refs: ["EX-12", "EX-13", "EX-15", "EX-07"]
      },
      {
        n: "03",
        head: "She asked him to come, ninety minutes before he left.",
        body: "At 23:52 her satellite handset sends six words — \"Confirmed. I'll be ready at 2.\" — to a number registered to Ardmair Marine Services. At 00:52 the Sgurr leaves the slip. Thirty-five minutes' passage puts it alongside at about 01:27. EX-07 was taken at 01:41. She photographed the pier to confirm he had arrived.",
        refs: ["EX-09", "EX-13", "EX-07"]
      },
      {
        n: "04",
        head: "The hollow hour is a recording of a different night.",
        body: "Set the 4 February transcript beside the 31 January archive transcript and they are the same fifty-seven minutes. Every incidental event lands at an identical offset — the door at +3:07, the supply interruption at +6:12, the roof ticks, the page turns, the chair, the cup, and the voice at +51:12 saying \"It's fine. Go back to bed.\" Callum Reyes tells you, without being asked, that she said exactly that to him around midnight on 31 January when he came through for water. The line was never spoken on 4 February. It was spoken four nights earlier, to him.",
        refs: ["EX-05", "EX-06", "EX-10"]
      },
      {
        n: "05",
        head: "She put it there herself at 01:58.",
        body: "The credential record shows a three-minute-forty-second WRITE session on the archive partition at 01:58:11 under MARCHETTI_E — the only administrator credential at the station. The inquiry never held the original audio; it worked from an export the station produced on the morning of the fourth. A researcher who has spent nine years watching instruments decide arguments knows precisely which record an inquiry will trust.",
        refs: ["EX-18", "EX-05"]
      },
      {
        n: "06",
        head: "The snow did the rest, and it did it by accident.",
        body: "She opened the door at 02:41:07 and walked to the pier. Snow had been falling since 02:15 and went on falling until 03:05 — twenty-four more minutes at a rate that fills a print in soft snow in about twenty. By the time the sky cleared there was nothing on the path. She did not arrange this. She could not have. It is the one part of the night that was luck, and it is the part that made the case famous.",
        refs: ["EX-03", "EX-04"]
      },
      {
        n: "07",
        head: "The coat on the rack was the building's, not hers.",
        body: "The most-repeated sentence about this case — that she left her coat and boots behind — is false. Both carry Trust tag STN-04 and are station spares. Her own parka, her size 39 boots marked E.M., her gloves, her hat and a thirty-litre rucksack are on her January inventory and none was ever found. She left dressed for a February crossing, carrying a bag.",
        refs: ["EX-16", "EX-17"]
      },
      {
        n: "08",
        head: "Why that night, and not another.",
        body: "On 28 January the Trust gave notice that an independent reviewer would attend on 9 February and would require the raw counts beside the published series, with a written account of every correction ever applied. In her drawer is an undated note about a finding she let stand for four years, which had become impossible to correct without correcting everything built on top of it. In the room next door, Nora Vance was already copying the raw files. Whatever Dr Marchetti had done to the Kestrel Point series, it had six days left to live.",
        refs: ["EX-21", "EX-20", "EX-11"]
      },
      {
        n: "09",
        head: "And the 03:38 door.",
        body: "Fifty-seven minutes after she left, the exterior door opened for twenty-two seconds. Callum Reyes was in the corridor at 03:36:44 and acknowledged the changeover panel at 03:37:02 — inside that motion window, exactly as he describes. He has never accepted that he opened the outer door, and the corridor sensor covers the only route between the rooms and the common room. It records nothing between 03:37:15 and 07:02. Whoever opened that door at 03:38 was already in the common room. The single line of prints in the snow leads to the station and stops.",
        refs: ["EX-03", "EX-10", "EX-01"]
      }
    ],
    aftermath: [
      "Dr Elin Marchetti was never located. The Kestrel Point aerosol series was withdrawn by the Caldon Atmospheric Trust in November 2009 and reissued from the raw counts Nora Vance had copied on the night of 3 February.",
      "Peter Ilves was interviewed a further three times and never amended his statement. He continued to operate the Ardmair run until 2016.",
      "Callum Reyes left the Trust in April 2009. He has said one thing about that night in every account he has given: that he did not open the door.",
      "In 2019, during a migration of the Trust's archive, a technician recovered 3.4 seconds of audio from a block the 2009 export routine had skipped. It sits at 03:33:12, inside the four minutes the transcript records as SENSOR RESET. It has been added to this dossier as EX-24."
    ],
    unlocks: ["EX-24"],
    finalQuestion: "She spent four hours making certain the recorder would say the room was occupied.\n\nWhat she could not have known is that for four minutes, it was."
  },

  /* Shown on the product page: what the buyer actually receives. */
  contents: [
    { label: "Case dossier", detail: "Complete file, structured as it was held" },
    { label: "Exhibits", detail: "24 documents, logs, transcripts, statements, photographs and charts" },
    { label: "Witness statements", detail: "5 accounts, one of which is withdrawn and replaced" },
    { label: "Master timeline", detail: "29 events, sourced to the exhibit that establishes each" },
    { label: "Cross-reference tool", detail: "12 findings to establish — 10 that matter, 2 that do not" },
    { label: "Investigator's notebook", detail: "Per-exhibit notes and a free notebook, kept between sittings" },
    { label: "Theory submission", detail: "5-part reconstruction, graded against the file" },
    { label: "The conclusion", detail: "Nine-step reveal, plus one sealed exhibit released with it" }
  ]
};

export default CASE;
