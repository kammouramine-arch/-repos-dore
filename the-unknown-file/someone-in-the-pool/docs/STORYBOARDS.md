# SOMEONE IS IN THE POOL — Storyboards

Times are narration seconds. Frame 0 is the first narrated word: there is no intro, logo, title card, watermark or outro. Each night ends on its final scare and then hard-cuts to black.

Shot IDs map to functions in `blender/p1_shots.py`, `p2_shots.py` and `p3_shots.py`. `UI` marks a CCTV or phone overlay built in Remotion (`studio/src/edit/kit.tsx`, `studio/src/ui/*`). `cc` shots are rendered from the in-set CCTV cameras (CAM1–CAM4 in `pool.blend`) and graded as CCTV in the edit: 8 fps, desaturated, noise and an OSD with camera label, date, timestamp and REC.

Geography (one floor plan, `pool.blend`):
- The office looks north through its window straight onto the deep end.
- CAM4 sits high in the north-east corner, looking down into the deep end.
- CAM1 sits in the office's south-east corner, behind and to the right of the guard's chair.
- CAM2 is at the west end of the service corridor, looking east at the office door, which has a glass vision panel.

## NIGHT 1 — "SOMEONE IS UNDER THE POOL" (0–125.0 s)

| # | Time | Shot | Picture | Sound |
|---|---|---|---|---|
| 1 | 0.00–4.00 | p1_01 | Dark pool hall from the shallow-end corner. Teal underwater lights; mirror-still water reflects the trusses. Slow dolly forward along the deck. | Ventilation hum, pool filter, a distant drip |
| 2 | 4.00–5.90 | p1_02 | Office wall clock, 3:07, second hand ticking. | Tick |
| 3 | 5.90–11.40 | p1_03 | From across the water, low over the surface: the only lit window is the security office, with the guard's silhouette at the monitors. The reflection trembles. Slow push. | Room tone |
| 4 | 11.40–16.00 | p1_04 | Over the guard's shoulder: five dim monitors. Monitor 4 flicks on (CAM4) and washes his face blue; his head turns to it. | Monitor click, CRT whine |
| 5 | 16.00–19.54 | UI cc4 | CAM 04 feed fills the screen, with "MOTION DETECTED" flashing and "CAM 04 · POOL — DEEP END". The water is dark. | Alarm beep ×2 |
| 6 | 19.54–21.44 | p1_05 | His face, lit by the monitor, leans in. | — |
| 7 | 21.44–30.70 | p1_cc4 | CAM4: a woman standing upright on the deep-end floor in a white gown, long black hair floating. Slow digital zoom. | Underwater drone |
| 8 | 30.70–32.66 | p1_05 | His eyes (tighter crop of the same render). | — |
| 9 | 32.66–38.98 | p1_cc4 | Tighter on her: she isn't floating; her feet are on the tiles and her gown sways. | — |
| 10 | 38.98–45.24 | p1_cc4z | PTZ zoom on her. She raises her head slowly and stares straight into the lens. **SCARE 1:** her eyes lock on the camera, the feed glitches and tears. | Sting, feed noise |
| 11 | 45.24–47.90 | p1_06 | His hand snatches the flashlight from the desk; the empty chair rolls back and spins. | Chair castors, grab |
| 12 | 47.90–49.68 | p1_07 | POV: he bursts through the glass pool doors. His hand slaps the light panel, the torch beam swings, and the hall fluorescents stutter on. | Door bar, switch clacks, ballast tick |
| 13 | 49.68–53.76 | p1_08 | Hall fully lit. Perfectly still water, empty basin, lane lines visible to the bottom. Nobody. | Fluorescent buzz |
| 14 | 53.76–56.76 | p1_09 | Behind the guard at the deep-end edge, torch sweeping the water. Nothing. | Footsteps on wet tile |
| 15 | 56.76–61.88 | p1_10 | Close on the surface in the torch disc. Three concentric ripple rings rise from below, one per knock. | 3 muffled knocks under water |
| 16 | 61.88–66.24 | p1_11 | Water-level angle: his boots step up to the coping. Three more rings spread past his feet. | Knock, knock, knock |
| 17 | 66.24–68.68 | p1_12 | Over the shoulder: the torch points down; the beam cuts a volumetric shaft through 3 m of water to the floor. | Torch click |
| 18 | 68.68–72.56 | p1_13 | POV down the beam: the floor tiles in the light disc. Something shifts; the grout lines bend. | Low creak |
| 19 | 72.56–78.20 | p1_14 | Looking down through the water: the tiles bulge upward in the clear shape of a palm and five fingers pressing up **from underneath** the floor. | Concrete stress, knock |
| 20 | 78.20–83.76 | p1_15 | Just above the floor: the hand-shaped bulge strains and claws, cracks run through the grout, and the fingers drag. Trapped beneath the concrete. | Grinding, muffled thump |
| 21 | 83.76–87.46 | p1_16 | POV stumble backward: the beam whips across the ceiling; he turns and runs for the office. | Scuffle, breath |
| 22 | 87.46–91.38 | UI cc4 | CAM4: the deep end, empty. | Feed hum |
| 23 | 91.38–93.24 | p1_17 | He exhales and sinks back in the chair. | Breath |
| 24 | 93.24–95.32 | p1_18 | Push into the monitor bank to monitor 2 (CAM1). | — |
| 25 | 95.32–105.64 | p1_cc1 | CAM1 office feed from the high corner: the guard in his chair at the monitors. In the dark behind him stands the woman in white, dripping. Push in on her as the narration names her. | Drip, drip |
| 26 | 105.64–107.24 | p1_19 | He spins the chair around to face the room. | Chair squeal |
| 27 | 107.24–108.22 | p1_20 | POV: the empty office, door, filing cabinet. Nobody. | Silence |
| 28 | 108.22–110.06 | p1_19 (reverse) | He turns back to the screen. | — |
| 29 | 110.06–111.48 | p1_cc1b | CAM1: she is closer, right behind the chair. | Feed glitch |
| 30 | 111.48–114.72 | p1_cc1z | PTZ zoom: her face inches from the back of his head, wet hair hanging. | Breath |
| 31 | 114.72–118.78 | p1_21 | Extreme close-up of his shoulder: one drop of water falls, splashes and darkens the slate cloth. | Single drop |
| 32 | 118.78–122.54 | p1_22 | POV tilting slowly up past the monitors into the dark ceiling. A ceiling tile is missing: a black hole. | Drip, building tone |
| 33 | 122.54–125.80 | p1_23 | **FINAL SCARE:** her upside-down face drops out of the black hole above him, long wet hair hanging straight down, water dripping off it onto the lens. Her face lurches down toward camera. **Hard cut to black.** | Drips on lens, sting, cut |

## NIGHT 2 — "THE POOL IS EMPTY. SO WHO IS THAT?" (0–137.0 s)

| # | Time | Shot | Picture | Sound |
|---|---|---|---|---|
| 1 | 0.00–3.64 | p2_01 | POV walking down the service corridor toward the SECURITY door; the drained pool is visible through the glass doors. | Footsteps, buzz |
| 2 | 3.64–5.98 | p2_02 | The logbook on the desk, his handwriting: "03:07 CAM 4 — WOMAN IN DEEP END… KNOCKING UNDER WATER… CAM 1 OFFICE". | Pen, paper |
| 3 | 5.98–10.24 | N1 reuse | Memory flashes: the woman under water (cc4), the ripple rings, the CAM1 frame. | Echoed knocks |
| 4 | 10.24–12.94 | UI | The monitor bank glitches to "SIGNAL ERROR / SYSTEM CHECK REQUIRED". | Static |
| 5 | 12.94–17.18 | p2_03 | Time-lapse: the water level drops through the basin under grey morning light. | Draining roar, gurgle |
| 6 | 17.18–20.66 | p2_04 | Night: the drained deep end with a dark puddle, cones, hose and barrier tape. Dry tiles. | Empty-hall echo |
| 7 | 20.66–25.02 | p2_05 | The guard back at the monitors, typing, checking the cameras. | Keys |
| 8 | 25.02–27.30 | p2_06 | Wall clock reads 3:07. | Tick |
| 9 | 27.30–31.50 | p2_06b + UI | The monitor bank: monitor 4 flashes red, "MOTION DETECTED · CAM 04". | Alarm |
| 10 | 31.50–35.14 | p2_07 | His face, lit blue, stomach dropping. | — |
| 11 | 35.14–38.36 | p2_cc4 | CAM4: the pool is FULL of dark water on the screen. | Water hum |
| 12 | 38.36–44.08 | p2_08 | Over the shoulder, racking from monitor 4 (full water) up to the window: the real basin beyond is empty, dry tiles under the night light. | — |
| 13 | 44.08–52.16 | p2_cc4 | CAM4: a pale shape forms in the dark water: the woman standing on the bottom, looking up. | Drone |
| 14 | 52.16–56.86 | p2_cc4 | She rises to the north ladder, grips the rails and climbs, one step, then another. | Metal rung creak, sloshing |
| 15 | 56.86–62.54 | p2_cc4 | Her head breaks the surface, hair plastered; she slowly turns toward the office (toward us). | Water parting |
| 16 | 62.54–67.48 | UI cc2 | Camera switch: CAM 02 HALLWAY, empty corridor. | Switch click |
| 17 | 67.48–73.40 | p2_09 | He turns his head toward the office door and its glass panel. | Wet footsteps, approaching |
| 18 | 73.40–75.26 | p2_10 | POV through the door glass: an empty corridor. | — |
| 19 | 75.26–84.36 | p2_10 | Wet footprints appear one by one on the dry floor, coming straight toward the door. | Wet steps synced to prints |
| 20 | 84.36–86.06 | p2_11 | His hand turns the lock thumb-turn. | Lock clack |
| 21 | 86.06–89.12 | p2_12 | Close on his face, breath held. | Silence |
| 22 | 89.12–95.92 | p2_13 | The handheld radio on the desk: the LED flicks on by itself. Static, then the whisper. | Radio squelch, whisper |
| 23 | 95.92–101.12 | p2_14 | His hand switches the radio off. The LED dies, then turns back on. | Click; static |
| 24 | 101.12–103.28 | p2_15 | Behind him, the monitor bank; monitor 4 is black. | — |
| 25 | 103.28–122.52 | p2_cc2 | CAM2: outside his locked door stands the woman, perfectly still, clothes dripping into a growing puddle, head tilted sideways. She raises one hand and lays it on the door glass. | Drips |
| 26 | 122.52–124.16 | p2_16 | POV whip to the door. | — |
| 27 | 124.16–133.04 | p2_16 | The door glass from inside: nobody behind it, but a wet handprint forms on OUR side, then another and another. **SCARE 1:** a slam shakes the door. | Squeaks, slam |
| 28 | 133.04–134.60 | p2_16 | The glass cracks. | Glass crack |
| 29 | 134.60–137.60 | p2_17 | The monitors go black one by one. **FINAL SCARE:** in the black glass of the last monitor, his reflection, and the woman's face right beside his. **Hard cut to black.** | CRT pops, sting |

## NIGHT 3 — "IT FOLLOWED YOU HOME" (0–158.5 s)

| # | Time | Shot | Picture | Sound |
|---|---|---|---|---|
| 1 | 0.00–2.98 | p3_01 | His flat, night: the security radio and torch dropped on the kitchen table beside the uniform badge. | Objects set down |
| 2 | 2.98–7.12 | N2 reuse | Flash: cracked door glass, then the drained deep end. | Glass tinkle |
| 3 | 7.12–10.64 | UI | Phone: a message from the manager, "Take some time off. It's stress." | Ping |
| 4 | 10.64–14.00 | p3_02 | He turns the deadbolt on his front door (3C). | Bolt |
| 5 | 14.00–16.98 | p3_03 | On the sofa under the lamp, phone in hand, head back. | Fridge hum |
| 6 | 16.98–21.60 | p3_04 | The phone on the coffee table buzzes; the lock screen lights at 3:07. | Vibration |
| 7 | 21.60–27.26 | UI | The notification: "POOL CCTV · Motion detected — Camera 4". | — |
| 8 | 27.26–29.92 | UI | His thumb taps it anyway. | Tap |
| 9 | 29.92–35.00 | UI + p3_cc4 | The phone shows CAM4: the pool full of dark water. | Feed hum |
| 10 | 35.00–47.50 | p3_cc4 | She stands beneath the surface looking straight up into the lens, at you. She raises one finger and points past the camera, behind you. | Drone |
| 11 | 47.50–50.32 | p3_05 | He looks up from the phone toward the hall. | Bathroom noise |
| 12 | 50.32–53.00 | p3_06 | Dark bathroom: the tap drips into the sink. | Drip ×3 |
| 13 | 53.00–57.14 | p3_07 | Hall floor, low: water flows out under the bathroom door and spreads toward us. | Trickle |
| 14 | 57.14–60.46 | p3_08 | His hand grips the red main-valve wheel and wrenches it shut. | Valve squeal |
| 15 | 60.46–64.96 | p3_09 | Behind him in the hall: he stands before the closed bathroom door. Silence. | Silence |
| 16 | 64.96–69.18 | UI | Phone buzz: "POOL CCTV · New camera image". | Vibration |
| 17 | 69.18–78.20 | p3_photo_a | The image: a high corner view of HIS bathroom. He stands in the doorway, and the woman crouches upside-down on the ceiling right above him. | — |
| 18 | 78.20–80.34 | p3_10 | POV up at the bathroom ceiling: nothing. | — |
| 19 | 80.34–84.66 | p3_photo_b | The photo changes: she is crouched on the floor right behind him. | Sting |
| 20 | 84.66–87.64 | p3_11 | POV spins around: an empty hall. | Whoosh |
| 21 | 87.64–97.12 | p3_12 | The mirror fogs over, then letters are wiped clear from the other side: "YOU LEFT THE DOOR OPEN." | Squeak of a finger on glass |
| 22 | 97.12–100.46 | p3_13 | POV backing out of the bathroom; the door slams shut in his face. | Slam |
| 23 | 100.46–101.74 | — | The lights die (black). | Breaker thunk |
| 24 | 101.74–108.38 | p3_14 | The phone torch on the closed bathroom door. Wet steps inside; water under the gap. The lever handle slowly turns down. | Steps, handle |
| 25 | 108.38–111.98 | p3_15 | POV running down the dark hall toward the front door. | Run |
| 26 | 111.98–115.86 | p3_16 | Profile close on his face; beside his ear, out of the dark, her wet face. | Breathing at the ear |
| 27 | 115.86–119.52 | p3_17 | **SCARE 1:** a pale, wet hand settles on his shoulder. | Sting, wet cloth |
| 28 | 119.52–121.92 | p3_18 | He yanks the front door open (from the corridor side, the door bursting open). | Scream (narrated), door |
| 29 | 121.92–123.60 | p3_19 | POV running down the building corridor. | Run |
| 30 | 123.60–124.28 | p3_20 | POV down the stairwell. | Steps |
| 31 | 124.28–126.24 | p3_21 | POV through the street door into the night. | Door, street |
| 32 | 126.24–128.96 | p3_22 | The street: his car under the lamp. The driver door slams. | Door slam |
| 33 | 128.96–134.62 | p3_23 | Inside the car, from the passenger side: lock, engine and dash lights on; he grips the wheel and breathes. | Locks, engine |
| 34 | 134.62–137.44 | p3_24 | The driver window: a tap rattles the glass. | Tap |
| 35 | 137.44–139.48 | p3_25 | POV out of the driver window: nothing. | — |
| 36 | 139.48–144.32 | p3_26 | POV slowly turning to the passenger side. | Tap |
| 37 | 144.32–147.92 | p3_27 | The passenger seat: empty but soaking, water running off its edge. | Drip |
| 38 | 147.92–153.36 | p3_28 | The seatbelt: one long black hair hangs from it, swaying, a drop at its tip. | — |
| 39 | 153.36–159.60 | p3_29 | Front view of him in the driver seat, frozen. Three slow knocks behind his seat. **FINAL SCARE:** her face rises from behind the headrest beside his head, then lunges. **Hard cut to black.** | Knock ×3, sting |

## Jump-scare plan

| Night | Scare 1 | Final scare |
|---|---|---|
| N1 | CAM4 PTZ: her eyes lock onto the lens and the feed tears (44.4 s) | Her face drops from the hole in the ceiling (125 s) |
| N2 | The door slam over the handprints (132.8 s) | Her face reflected in the black monitor (137 s) |
| N3 | The hand on his shoulder (116.5 s) | Her face rises behind the seat (158.6 s) |

Each scare is set up, held, then delivered as one clear visual event. There is no constant shaking or strobing.
