# THE UNKNOWN FILE — THE SKIP BUTTON (original animated short)

Two complete films made from the supplied narration, with one reusable character rig.

| Deliverable | |
|---|---|
| `deliverables/THE_SKIP_BUTTON_SHORT.mp4` | 9:16 vertical short, 1080×1920, 30 fps |
| `deliverables/THE_SKIP_BUTTON_FULL_YOUTUBE.mp4` | 16:9 full film, 3840×2160, 24 fps. Its own shots and extra sequences; not a resized short. |
| `deliverables/THE_SKIP_BUTTON_YOUTUBE_THUMBNAIL.png`, `…_VERTICAL_COVER.png` | Thumbnail and cover |
| `deliverables/THE_SKIP_BUTTON_CHARACTER_MODEL_SHEET.png` | Model sheet |
| `deliverables/*_NARRATION.wav`, `*_SFX.wav` | Stems (no music) |
| `deliverables/TRANSCRIPT_EN_*.md`, `LICENSE_REGISTER.md`, `PUBLISHING_KIT.md` | Documents |

## How the character stays consistent
- **One skeleton for everyone** (`studio/src/rig/Person.tsx`). Proportions are measured from the reference image and locked:
  - head radius 128
  - torso 365
  - thigh 205, shin 205
  - upper arm 165, forearm 160
- **Shots only move joint targets.** No shot redraws the character.
- **Limbs are solved with two-bone IK** (`rig/math.ts`), so bones never stretch.
- **Views come from one yaw value.** Front, 3/4, profile and back all derive from it. Left and right are never mirrored, so the right hand is always the right hand.
- **Hands use one design** (`rig/Hands.tsx`): a mitten for the four fingers (finger lines where visible) plus one thumb.
  - The thumb side follows anatomy: forward or up in profile, toward the body's midline in front and back views.
  - Each pose is a variant of that one design: relax, open, point, fist, grip, flat, cup, pocket.
- **Phone close-ups** (`phone/Phone.tsx`): the right hand holds the phone, fingertips wrap the far edge, and the thumb is an IK chain anchored in the palm. On a press, the thumb pad lands on the button.
- **Walking** (`rig/motion.ts`): the cycle is driven by distance travelled, not time. Each foot is pinned to the floor while it carries weight, so feet cannot slide, even while accelerating or stopping. It includes heel–toe roll, pelvis bob and opposite arm swing.
- **Sitting and standing:** weight shifts forward over the feet, then the hips travel back and down onto the seat. Feet stay planted throughout.

## Quality control (run before the final renders)
- **`node studio/qc.mjs Short|Long [n]`** evaluates every n-th frame of a film with no screenshots. It reports any limb whose target is out of reach, which would mean a floating hand, a hand that can't reach a pocket or table, or a sliding foot. Both films were fixed until the report was empty.
- **`studio/labs.mjs`** renders contact sheets of chosen frames. These were used to inspect, frame by frame:
  - hands on the phone and contact frames;
  - gestures, door, table and pocket moments;
  - walking and sitting.
- **`tools/sheet.sh`** renders every frame of a stride or a sit-down for checking.

## Build
```
cd studio && npm ci   # or link node_modules
tools/render.sh Short 3726 ../renders/short_parts 600 17
tools/render.sh Long 12542 ../renders/long_parts 240 18
tools/mix.sh short audio/THE_SKIP_BUTTON_SHORT.mp3 124.2 9.6
tools/mix.sh long  audio/THE_SKIP_BUTTON_LONG.mp3 522.6 9.6
```

## Layout
```
studio/src/rig/        Person (rig + drawing), Face (expressions), Hands, poses, motion (walk/sit), math (IK + QC)
studio/src/scenes/     env (sets), cast (supporting wardrobe), beats + beats2 (reusable staged moments)
studio/src/phone/      phone close-ups with the hand, screens (lock, call, messages, gallery, SKIP/PLAY)
studio/src/components/ SKIP effect, camera/view, typography, shots, film look
studio/src/short, long the two edits (every shot keyed to narration timing)
tools/                 transcription, SFX synthesis + cue sheets, mix, render
```
