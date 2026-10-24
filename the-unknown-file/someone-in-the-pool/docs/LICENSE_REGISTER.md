# SOMEONE IS IN THE POOL — Licence register

This covers all three episodes. They contain **no music**, **no stock footage or stock photos**, **no sound libraries** and **no AI-generated faces or voices**.

- **Music:** none. No track with verified commercial rights for YouTube Shorts, TikTok and Instagram was available, so music is omitted as the brief requires.
- **Narration:** the supplied narration is the primary audio and is unchanged. It only has gain and peak limiting applied; no words are cut, added or re-ordered.

| Element | Source | Licence | Notes |
|---|---|---|---|
| Narration NIGHT 01–03 | Supplied by the client (`audio/POOL_HORROR_NIGHT_0{1,2,3}.mp3`) | Client-owned | Gain and peak limiting only. Every episode starts on its first narrated sentence. |
| Sound effects and ambience | Original, procedurally synthesised (`tools/sfx.py`, cue sheets `tools/cues_p1-3.py`) | Original work for this production | No samples, loops or music. The radio whisper in Night 2 is the narrator's own line; no extra voice was created. |
| Characters (guard, woman in white): bodies, skin, eyes, hair, clothes, shoes | MakeHuman / MPFB 2 system assets (makehumancommunity.org) | **CC0 1.0** | Guard uniform recoloured (`tools/recolor_uniform.py`). The woman's gown, wet hair, hanging hair strands and pale skin are built in `blender/characters.py` and `blender/fx.py`. |
| MPFB 2 add-on (tool only, used to generate the meshes) | extensions.blender.org/add-ons/mpfb | GPL-3.0 (tool) | Output meshes and assets are CC0. The add-on code is not distributed in the videos. |
| Blender 4.2 LTS (tool) | blender.org | GPL-2.0+ (tool) | The renders are the user's own output. |
| Pool hall, basin, water, ladders, lifeguard chair, security office, monitors, CCTV cameras, radio, corridor, glass doors | Modelled procedurally (`blender/pool_set.py`) | Original | |
| Apartment 3C (hall, bathroom, mirror, valve, living room, kitchen), building corridor, stairwell, street, car | Modelled procedurally (`blender/apartment_set.py`) | Original | The car is generic and unbranded. |
| Effects: water rings, the hand under the tiles, footprints, handprints, cracked glass, mirror writing, logbook page | Original (`blender/fx.py`, `tools/make_textures.py`) | Original | |
| CCTV on-screen display, phone UI (lock screen, messages, security-camera app), covers | Original (`studio/src/edit/kit.tsx`, `studio/src/ui/Phone.tsx`, `studio/src/Covers.tsx`) | Original | Unbranded, with no real company names or logos. |
| Fonts in the UI | Inter (rsms), IBM Plex Mono (IBM) via @fontsource | SIL Open Font License 1.1 | |
| Fonts in 3D (signs, door numbers) | DejaVu Sans | Bitstream Vera / DejaVu licence (free, redistributable) | |
| Logbook handwriting | Carlito Italic (Google Crosextra) | SIL Open Font License 1.1 | Rendered into a texture. |
| Film grain | Generated noise (`studio/public/fx/`) | Original | |
| Metal Office Desk (3D model) | Poly Haven — Ulan Cabanilla — https://polyhaven.com/a/metal_office_desk | **CC0 1.0** | |
| Plastic Monobloc Chair 01 (3D model) | Poly Haven — Kuutti Siitonen — https://polyhaven.com/a/plastic_monobloc_chair_01 | **CC0 1.0** | |
| Signal Flashlight (3D model) | Poly Haven — Jiří Ptáček — https://polyhaven.com/a/signal_flashlight | **CC0 1.0** | |
| Street Lamp 01 (3D model) | Poly Haven — Josh Dean — https://polyhaven.com/a/street_lamp_01 | **CC0 1.0** | |
| Sofa 03 (3D model) | Poly Haven — Fran Calvente — https://polyhaven.com/a/sofa_03 | **CC0 1.0** | |
| Square Tiles 02 (texture) | Poly Haven — Charlotte Baglioni — https://polyhaven.com/a/square_tiles_02 | **CC0 1.0** | |
| Anti Skid Tiles (texture) | Poly Haven — Amal Kumar — https://polyhaven.com/a/anti_skid_tiles | **CC0 1.0** | |
| Rounded Square Tiled Wall (texture) | Poly Haven — Charlotte Baglioni — https://polyhaven.com/a/rounded_square_tiled_wall | **CC0 1.0** | |
| Interior Tiles (texture) | Poly Haven — Charlotte Baglioni — https://polyhaven.com/a/interior_tiles | **CC0 1.0** | |
| Concrete Floor Painted (texture) | Poly Haven — Rob Tuytel — https://polyhaven.com/a/concrete_floor_painted | **CC0 1.0** | |
| Laminate Floor 02 (texture) | Poly Haven — Dario Barresi, Charlotte Baglioni — https://polyhaven.com/a/laminate_floor_02 | **CC0 1.0** | |
| Painted Plaster Wall (texture) | Poly Haven — Amal Kumar — https://polyhaven.com/a/painted_plaster_wall | **CC0 1.0** | |
| Kitchen Wood (texture) | Poly Haven — Rob Tuytel — https://polyhaven.com/a/kitchen_wood | **CC0 1.0** | |
| Asphalt Floor (texture) | Poly Haven — eye-candy.xyz — https://polyhaven.com/a/asphalt_floor | **CC0 1.0** | |

`signal_flashlight` was downloaded but not used; the torch is modelled in `blender/characters.py`.
