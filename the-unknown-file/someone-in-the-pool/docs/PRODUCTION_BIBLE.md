# SOMEONE IS IN THE POOL — Production Bible

THE UNKNOWN FILE · horror miniseries · three vertical episodes (1080×1920, 30 fps, H.264/AAC, Shorts length).

This production is separate from the previous trilogy, YOUR FOOD IS HERE. It reuses that pipeline (MPFB humans, IK rig, EEVEE shots, Remotion edit, procedural sound) but has new sets, new characters and its own folder. Nothing in `your-food-is-here/` is touched.

## Presentation rules
- **No intro, no logo, no watermark, no outro.** There are no "End of Night", "Subscribe" or title cards.
  - Frame 0 is the first narrated sentence.
  - Each episode ends on its final scare with a hard cut to black.
- **Narration:** the supplied narration is the primary audio and is unchanged. It is only gain-matched and peak-limited, with no cuts. None of the three files contains a spoken label, so nothing had to be removed.
- **Text on screen:** story text only (CCTV on-screen display, phone UI, notifications, signs, the logbook page, the mirror message).
  - No subtitles.
  - English only: no French subtitles and no translations.
- **Music:** none. No track with a verified commercial licence for YouTube Shorts, TikTok and Instagram was available, so music is omitted. All sound is original and procedural (see Sound).

## Sets — one floor plan per location
### The indoor pool (`blender/pool_set.py` → `pool.blend`, Nights 1 and 2)
| Area | Footprint (m) | Notes |
|---|---|---|
| Pool hall | x 0–30, y 0–18, ceiling 7 | Tall north windows (city glow), steel trusses, 18 fluorescent fixtures, exit signs, plant-room door in the east wall. |
| Basin | x 2.5–27.5, y 4–14 | 6 lanes. Shallow end (west) is 1.1 m deep, sloping between x 10 and 18 to the deep end (3.2 m). Depth markings, coping, gutter grates, underwater lights (x 6/12/18/24, both side walls). |
| Ladders | (26.6, 4) and (26.6, 14) | Stainless rails curving over the coping, treads into the water. In Night 2 two extra treads are added lower down. |
| Deck | around the basin | Lifeguard chair (19, 15.4), monobloc chairs, benches, lane-rope reel, kickboards, ring buoy. |
| Security office | x 22–28, y −4–0, ceiling 2.7 | The window in its north wall looks straight onto the deep end. The desk runs under the window with **5 CCTV monitors**. Swivel chair at (25.0, −1.35), radio with its LED, wall clock on the east wall, filing cabinet, notice board. One ceiling tile above the chair is removable (Night 1 ending). The door in the west wall has a glass vision panel and an inside thumb-turn lock. |
| Service corridor | x 3–22, y −2.2–0 | Glass double doors into the hall (x 17–19), with the hall light switch on the hall side. Lockers, fire extinguisher. The SECURITY sign is above the office door. |
| CCTV cameras | CAM1 office, CAM2 corridor, CAM3 shallow end, CAM4 deep end | Real Blender cameras with housings and red LEDs. Every CCTV shot is rendered from them. CAM4 is mounted high on the east wall looking down into the deep end; its PTZ zoom is a lens change. |

**Water:**
- The surface is a Fresnel mix of a glossy reflection and a tinted transparent layer, with two 4D noise ripple layers animated per frame.
- The water volume under it has teal absorption and scatter, so the torch beam forms a visible shaft.
- The basin tiles carry animated caustics (4D voronoi).
- Underwater spot lights sit in the walls.
- Close-ups replace the surface locally with a dense **RipplePatch** (240–260² verts) carrying physically shaped ring waves for the knocks (`blender/fx.py`).

**Drained (Night 2):** the water is hidden. Dry basin tiles, a dark puddle in the deep end, cones, a hose and barrier tape. The CCTV still shows the pool full.

### The guard's flat and the street (`blender/apartment_set.py` → `apartment.blend`, Night 3)
| Area | Footprint (m) | Notes |
|---|---|---|
| Hall | x 0–1.6, y 0–3.4 | Front door **3C** (south wall), inward opening, lever handle and deadbolt thumb-turn. Coat hooks with his uniform jacket. |
| Bathroom | x 1.6–4.2, y 0–2.8 | The door is in its north wall and opens inward. Tiles, bathtub, toilet, sink and dripping tap. The **mirror** carries a fog layer: fog amount plus a fingertip-written message, revealed stroke by stroke. A planar reflection probe sits on the mirror. |
| Landing | x 1.6–4.2, y 2.8–3.4 | Between the bathroom door and the living room. **Main water valve** (red wheel) on the wall. |
| Living / kitchen | x 0–9, y 3.4–8 | Sofa facing the TV (west), coffee table, floor lamp, north window with curtains, kitchen counters, table and fridge. Clock on the wall. |
| Building corridor | y −2–0, x −8–10 | Doors 3A, 3B, 3C (his) and 3D. Fluorescent panels. |
| Stairwell | x −8 to −5 | Two flights of concrete stairs with handrails and an exit sign. |
| Street | x 28–52 (ground level, z −9) | Brick facade, glass entrance door, pavement, kerb, road, street lamp. **His car** is a generic dark hatchback heading east, driver on the road side. It has seats (the passenger seat is soaking wet), a steering wheel, a dashboard cluster that lights with the engine, a hinged driver door, and the passenger seatbelt with **one long black hair** hanging from it. |

Lighting states (`shotkit.set_lights`):
- **pool:** `night` (underwater lights, window glow, office), `hall` (all fluorescents), `drained`, `drained_hall`, `dark`.
- **apartment:** `warm` (lamp and ceiling lights), `bath`, `dark` (blackout; light comes only from the phone torch and the street), `street`.

## Characters (`blender/characters.py` → `characters.blend`)
Both are MakeHuman/MPFB CC0 bodies on the 53-bone game-engine skeleton. Each hand has five fingers with three joints each, plus a thumb.

### The guard
- Middle-aged man, about 1.78 m, short greying hair.
- **Uniform (identical in every shot):** slate-blue work shirt (`tools/recolor_uniform.py`), navy trousers, black shoes, and a radio pouch on the belt, parented to the pelvis bone.
- Props:
  - a long black torch with a real spot light at the lens;
  - the radio on the office desk, with its LED;
  - his phone, whose screen is the same UI the edit uses;
  - keys.

### The woman in white
- About 1.68 m. Pale, cold skin with a waterlogged tint. Long black hair, soaked and clumped.
- A white blouse with a lofted ankle-length white gown: wet, with stains and vertical folds, skinned to the legs.
- Escalation:
  - **N1:** standing still underwater, then her stare into the lens.
  - **N2:** she climbs out on the CCTV, stands at the door and puts her hand on the glass.
  - **N3:** void-black eyes, crouched upside down on his ceiling, on the floor behind him, a hand on his shoulder, then in his car.
- She is never a zombie: she doesn't lurch or rot. She moves slowly, stands perfectly still, tilts her head too far and appears where she can't be.
- When she hangs upside down (N1 ending, N3 photo), her hair is rebuilt as **gravity-hanging strands** (`fx.HangingHair`), so it falls toward the floor rather than sticking to her head.

### Rig and animation (`rigkit.py`, `actor.py`, `poses.py`)
- **Legs:** two-bone IK with pole targets and hinge locks on the knees and elbows. Feet are planted in world space (`Actor.foot`), so they never slide. `step_to()` moves the lead foot, then the body, then the trailing foot, with a lift arc.
- **Hands:** IK targets with explicit finger and palm directions, and finger curl presets (relaxed, grip, handle, point, flat, claw, phone, type). Contact uses:
  - `grip_torch` and `attach_rel` for the torch and phone, parented to the hand bone so props never float;
  - `touch()`, which iterates until the fingertip lands on the radio button;
  - hand targets that follow the valve rim, the deadbolt, the lock thumb-turn and the steering wheel every frame.
- **Sitting:** `sit()` puts the hips on the seat with the feet planted. In the office the swivel chair follows his yaw, and when he spins round his feet lift off the floor.
- **Upside-down poses:** `fx.invert()` rotates a fully posed actor 180° about a horizontal axis. It is a rotation, not a mirror, so hands stay hands.

## The hand under the floor (Night 1)
The deep-end floor has a separate finely subdivided patch (`HAND_PATCH`, 160×160 quads, 1.4 m). `fx.HandFloor` displaces it from an original hand height map (palm and five fingers, `tools/make_textures.py`). The tiles bulge upward in the clear shape of a hand pressing up **from underneath**:
- the tile glaze stretches over it, flat-projected so it reads as a skin of tiles;
- pale flesh shows through where the bulge is highest;
- dark cracks open along the grout as it strains;
- it drags and thumps.

A ring wave travels up through the water on each knock.

## Camera language
- **CCTV** (CAM1–4) is rendered at 8 fps from the in-set cameras and graded in the edit:
  - cold desaturated teal look, scanlines, sensor noise, vignette;
  - on-screen display with camera name, date, running timestamp and REC;
  - "MOTION DETECTED"; PTZ zoom labels;
  - tearing glitches on scares.
- **POV** is used for every run and stumble (no gliding run cycles) and for the turns to look ("nothing").
- Locked-off framing for dread: the clock, the radio, the door glass, the mirror.
- Slow push-ins carry dread. Handheld drift is subtle and gets violent only on impacts.
- Jump scares are set up, held, then delivered as one clear visual event. There is no constant shaking or strobing.
  - **N1:** her eyes lock onto CAM4 (feed tears) / her face drops from the hole in the ceiling.
  - **N2:** the slam on the door glass / her face in the black monitor.
  - **N3:** the hand on his shoulder / her face rising behind his car seat.

## Render pipeline
- The machine has a 4-core CPU and no GPU, so EEVEE runs through Mesa llvmpipe (surfaceless EGL).
- Resolution and samples:
  - 3D shots render at 576×1024; hero shots (the hand, the scares, the covers) at 720×1280 or 1080×1920.
  - Samples are 4–6 (CCTV 4–5; stills 10–16).
  - Screen-space raytracing is off and shadows are limited.
- Frame rates:
  - Animated shots render at 12 fps (15 or 24 for fast action). `tools/prep_shots.py` converts them to 30 fps with motion-compensated interpolation and Lanczos upscaling.
  - CCTV keeps its 8 fps stutter.
- The edit is done in Remotion (`studio/`), with film grain and a vignette.

Rebuild order:
```
blender -b --python blender/characters.py          # rigs + props
blender -b --python blender/pool_set.py            # pool, office, corridor, CCTV
blender -b --python blender/apartment_set.py       # flat, bathroom, stairs, street, car
python3 tools/make_textures.py                     # hand map, prints, crack, mirror message, logbook
(cd studio && node uistills.mjs p3_home p3_lock_note p3_cam4)   # phone textures
blender -b --python blender/p1_shots.py -- all     # likewise p2, p3 (feeds first, then CCTV + 3D shots)
python3 tools/prep_shots.py p1                     # 30 fps, 1080x1920
tools/mix.sh p1 audio/POOL_HORROR_NIGHT_01.mp3 126.0 0     # p2 137.6, p3 159.6
tools/render.sh P1 3780 ../renders/p1_parts 570 && tools/finish.sh 1
```

## Sound (`tools/sfx.py`, cue sheets `tools/cues_p1|2|3.py`)
- All sound is procedural; there are no samples and no music.
- **Pool kit:**
  - beds: the tiled-hall room tone (ventilation, filter pump hum, water lapping in the gutter), the underwater drone under the CCTV, office hum and monitor whine;
  - **knocks through 3 m of water and concrete**, ring-wave lapping, tile footsteps (dry and wet), wet bare footsteps;
  - chair castors, the light switch, fluorescent ballasts striking, the motion alarm;
  - radio squelch and static, knob clicks;
  - glass taps and squeaks, the door slam, glass cracking, monitors switching off.
- **Apartment kit:** the dripping tap, a water trickle, the valve squeal, the door slam, blackout, the lever handle, breathing at the ear, and wet cloth.
- **Car kit:** the car door, central locking, ignition and idle, glass taps and knocks on the seat back.
- Beds with gain automation, a dread drone and heartbeats run under the scares.
- The narration is gain-matched only. The effects are ducked −7 dB under the voice and trimmed −5 dB per episode so the narration stays primary.
- Stems: narration, ambience and effects are written separately.
- **Master:** −14 LUFS integrated, true peak ≤ −1 dBTP after AAC.
