# YOUR FOOD IS HERE — Production Bible

THE UNKNOWN FILE · psychological horror miniseries · three vertical episodes (1080×1920, 30 fps, H.264/AAC).

## Presentation rules (apply to every episode)
- **No intro, no title card, no logo, no watermark, no night-number introduction, no outro.**
  - Frame 0 is the story, and the narration starts on frame 0.
  - Each episode cuts to black right after its final frightening moment.
- **Narration:** only the supplied narration is used.
  - Night 3's spoken label "Night three," was removed with a clean cut inside the silence that follows it (`tools/edit_narration.sh`, cut at 1.50 s). The episode opens on "You haven't slept."
  - Nights 1 and 2 contain no spoken labels or branding, so they are unchanged.
- **On-screen text:** the only text is story text: phone UI, notifications, messages, clocks, timestamps, door numbers, the receipt and buttons.
  - There are no subtitles.
  - Everything is English only. There are no French subtitles or translations.
- **Music:** none. No licence-verified music was available, so it is omitted. Every sound is procedural and original (see Sound).

## One world
### The apartment — 6A, sixth floor
The apartment has one fixed floor plan, built by `blender/apartment.py` and drawn in `docs/FLOOR_PLAN.png`.

| Room | Footprint (m) | Notes |
|---|---|---|
| Hall | x 0–1.4, y 0–4.2 | Front door 6A in the south wall (x 0.25–1.15). It has a lever handle, deadbolt, chain and peephole. There is a 1.8 cm gap under the door, where the corridor light leaks in. |
| Bath | x 1.4–3.6, y 0–4.2 | Door from the hall. Tiles, bathtub, toilet, sink and mirror. |
| Bedroom | x 3.6–7.4, y 0–4.2 | Door in its north wall (x 4.2–5.0). **Wardrobe/closet on the south wall, x 4.0–5.2**: a single hinged door, directly in line with the bedroom doorway. |
| Kitchen | x 0–3.0, y 4.2–8.6 | Open plan. Counters run along the west and north walls; the sink is under the window and the fridge stands at the end of the run. The table is at (1.95, 6.3). |
| Living room | x 3.0–7.4, y 4.2–8.6 | The sofa faces the TV on the east wall. There are two rain windows (north), a floor lamp, a bookshelf, and the **wall clock** left of the bedroom door. |
| Corridor | y −2.0–0, x −6–12 | Doors 6A (ours), **6B** (the east neighbour) and 6C/6D opposite. Fluorescent panels, carpet. The **doorbell camera** is beside 6A. |

Geography that the story depends on:
- From the kitchen (N1's delivery photo), the camera looks straight down the hall to the front door.
- From the sofa, the open bedroom door frames the closet (N2), in both the photo and the real view.
- Apartment 6B is visible down the corridor from our door (N3 ending).

Assets:
- CC0 furniture and textures come from Poly Haven (`assets/polyhaven/register.json`).
- Everything else is modelled procedurally in the build script.

### Lighting states (`blender/shotkit.py: set_lights`)
| State | Look |
|---|---|
| `night` (N1, N2) | Warm floor lamp (down-spot), cold city light through the rain windows, a faint hall fill, under-cabinet glow. Phones light faces and hands with an area light on the screen. |
| `allon` (N3) | Every ceiling light on; windows covered with blankets. |
| `dark` | Blackout: only a whisper of ambient light. |
| `morning` | Grey daylight. |
| `corridor` | Fluorescent panels. |

## Characters (`blender/characters.py` → `characters.blend`)
Both characters are MPFB/MakeHuman CC0 bodies on the 53-bone `game_engine` skeleton. Every hand has five fingers with three joints each and a separate thumb.

### Protagonist
- Ordinary young man who lives alone, about 1.75 m.
- Same face, short brown hair, charcoal long-sleeve tee (MPFB casual suit 02 with the logo and trims removed by `tools/recolor_shirt.py`), blue jeans and white sneakers in every shot.

### The courier
- About 1.88 m, gaunt.
- A worn mustard-yellow PVC rain jacket. It is built from the CC0 casual-suit garment, let out by 1.2 cm, with the garment fold normals and grime/wet-streak shading.
- A dark hood (modelled shell with an oval face opening and a stiff brim that shadows the face), black gloves (the hand surface itself, so five clean gloved fingers), near-black trousers and wet black shoes.
- He carries a kraft-paper delivery bag in his left hand, gripped by its folded top.
- **The reveal face:** the same CC0 skin drained to waxy grey-green with faint bruising. The eyes are wet black voids in widened, hollow sockets. There are no random faces: this one face is used in every reveal (N1 lunge and final reveal, N2 photo, N3 lens).
- He moves minimally: he stands, sways a little, his head hangs and his head lifts. The lunge (N1) is the only fast move.

### Rig (`blender/rigkit.py`, `blender/actor.py`)
- **Arms and legs:**
  - Two-bone IK with pole targets.
  - The elbow and knee hinges are locked against twisting (`lock_ik_y/z`), the upper-arm twist is limited, and stretch is off.
- **Feet:** planted in world space, so feet never slide; steps lift and land on exact floor points.
- **Hands:**
  - Hand orientation is driven by explicit finger-direction and palm vectors.
  - Fingers curl about axes computed from the rest skeleton.
  - Presets: relaxed, phone, point, fist, grip, handle, flat and claw.
- **Contact:**
  - The phone grip (`Actor.grip_phone`) puts the palm on the phone's back, wraps the fingers round the far edge and lays the thumb over the screen.
  - Props are parented to the hand bone, so they never float.
  - `Actor.touch` iterates the hand target until the index fingertip lands on a screen point. In N3 it touches the "THAT'S NOT MY ORDER." text, with a residual error of about 1 mm.
  - The door lever grip follows the lever and the swinging door every frame (N3 morning).

## Camera language
- First-person phone views have near clipping, so his own head never intrudes.
- The camera sits over the shoulder at the hall mouth.
- Slow push-ins carry dread: some are dolly moves in Blender, others are 2D pushes on stills in the edit.
- Locked-off cameras are used for knocks, the closet, the clock and the handle; only the moving region is re-rendered (`border`).
- The doorbell perspective is a wide lens with barrel distortion, 15 fps, sensor noise and low saturation.
- Phone close-ups are either 3D (hand + phone with the real UI on the screen texture) or a screen-fill view of the same UI.
- Jump scares are set up, held, then delivered as one clear visual event, with no constant shaking or strobing:
  - **N1:** the courier slams his face into the doorbell camera; the final reveal is his face leaning out behind the protagonist.
  - **N2:** the photo of his eyeless face comes alive and his head snaps toward camera.
  - **N3:** the empty doorbell feed is held, then his face is suddenly against the lens and the phone screams.

## Phone UI (`studio/src/ui/Phone.tsx`)
- One unbranded dark delivery-app design (no logo or brand name): order, tracking, chat, lock screen, doorbell app, proof-of-delivery photo viewer, call screen, the final-attempt screen and "ORDER CANCELED."
- The same component renders the 3D phone texture (`studio/uistills.mjs` → `renders/ui/*.png`) and the screen-fill shots, so the two always match.

## Shot lists
The cut lists, with exact cue times, are the edit files themselves:
- `studio/src/edit/N1.tsx`
- `studio/src/edit/N2.tsx`
- `studio/src/edit/N3.tsx` (written in original narration seconds, shifted by −1.50 s)

Every 3D shot is a documented function in `blender/n1_shots.py`, `n2_shots.py` and `n3_shots.py`; its docstring gives its narration window.

## Render pipeline and budget
The machine is a 4-core CPU with no GPU. EEVEE runs through Mesa llvmpipe (surfaceless EGL).

Render settings:
- 3D shots render at 720×1280 with 6 TAA samples (stills and photos at 1080×1920 or 1080×1440 with 12–16 samples).
- Screen-space raytracing is off, shadows are limited to the lights that matter, and shadow resolution is at 50%.
- Typical animated shots run at 12 fps, with 24 fps for fast action. `tools/prep_shots.py` converts them to 30 fps with motion-compensated interpolation and upscales them with Lanczos.
- Doorbell footage stays at 15 fps like a real camera.

The edit is done in Remotion (`studio/`) and adds film grain and a vignette.

Rebuild order:
```
blender -b --python blender/characters.py
blender -b --python blender/apartment.py
tools/render_ep.sh n1 "photo_a photo_b photo_c" "n1_delivered n1_lost n1_new_photo"   # etc. (tools/queue.sh)
python3 tools/prep_shots.py n1|n2|n3
tools/edit_narration.sh; tools/mix.sh n1 audio/edited/N1_narration.wav 128.3 0   # n2 136.3, n3 156.0
tools/finish.sh   # Remotion render + encode + QC
```

## Sound (`tools/sfx.py`, cue sheets `tools/cues_n1|2|3.py`)
- All sound is procedural; there are no samples and no music.
- **Kit:** doorbell chime, knuckle knocks, muffled closet knocks, violent pounding with frame and chain rattle, wet footsteps, lever handle, camera shutter, mic pop, doorbell-camera interference, distorted scream, scare stings, phone pings, vibration and ringing, breathing on the line and next to the ear, phone hitting the floor, blackout and relight.
- **Beds:** rain on glass, fridge, room tone, fluorescent buzz, dread drone and heartbeat.
- **Stems:** narration, ambience and effects are written separately, and the effects are ducked −7 dB under the voice.
- **Master:** −14 LUFS integrated, true peak ≤ −1 dBTP after AAC.
