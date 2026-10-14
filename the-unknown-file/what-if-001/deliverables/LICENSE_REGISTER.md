# THE UNKNOWN FILE — WHAT IF? BONUS #001 · Music and visual asset licence register

**Episode:** What if the Moon disappeared tonight? This is a hypothetical scenario informed by science.

## 1. What is real, and what is fiction

Every fictional or speculative shot is labelled on screen. A persistent **WHAT IF? · SIMULATION** badge stays in the corner throughout. A tag in the other corner names the kind of claim on screen:

| On-screen tag | Meaning | Examples |
|---|---|---|
| **ESTABLISHED SCIENCE** | Documented fact | The Sun still raises tides. Grunion eggs hatch when the next high-tide series reaches them, about 10 days after spawning. Some corals use lunar cues to synchronise spawning. |
| **PLAUSIBLE CONSEQUENCE** | A scientifically reasonable outcome of the hypothetical event. It is not a prediction. | Some nests are not reached. Spawning becomes less synchronised. A reef recovers less well over years. |
| **UNCERTAIN · MODEL-DEPENDENT** | Long-term effects on which published models disagree | Earth's axial tilt over hundreds of thousands to millions of years |
| **FICTIONAL SCENARIO** | Invented people and events | Mia and her mother, the townspeople, the fishing family |

The news broadcast and the phone clips are labelled **FICTIONAL BROADCAST** and **FICTIONAL CLIPS**. They do not imitate any real channel or person.

**V1:** there was no real footage; everything on screen was original animation.

**V2 (`*_V2.mp4`):** V2 adds real footage and photographs (section 8). Each real shot carries an on-screen label under the knowledge tag:
- **REAL FOOTAGE** or **REAL PHOTO**, plus what and where it is
- **ARCHIVE FOOTAGE · DRAMATIZED** for real scientists at work, shown to illustrate the fictional scenario. They are never presented as footage of the event.

Each real shot also has a small source credit. Where graphics are drawn over real footage (tide lines, egg-nest markers), they are labelled *illustrative*.

## 2. Music

| Track | Composer / source | Licence | Notes |
|---|---|---|---|
| *WHAT IF? #001 score* (short and long cues) | Original composition made for this production. It was synthesised in code by `tools/music.py`: additive pads, a felt-piano-like voice, a low pulse, and a generated-noise reverb. | Original work of the production, owned by the channel. No third-party licence is needed. | No samples, loops, presets, library tracks or AI-music services were used. The score is not registered with Content ID, so it cannot trigger third-party claims. |

How the score fits the story:
- **Opening:** restrained suspense.
- **Biology sections:** quiet tension.
- **Fishing family:** warm and understated.
- **Ending:** reflective.

The score is delivered as a separate stem (`*_MUSIC.wav`). To use a commercial library track instead, replace that stem and add the library's licence details here.

## 3. Sound effects

The effects are original procedural sound design (`tools/sfx.py`), owned by the channel:
- **Sea and air:** surf, wind and underwater ambience.
- **Night wildlife:** crickets and an owl call.
- **People:** crowd murmur, with no intelligible speech.
- **Places and objects:** boat engine and market ambience.
- **Transitions:** the Moon's "vanish" swell, air transitions and time-passage swells.
- **Interface:** ticks, paper sounds and a stamp.

No sample libraries or third-party recordings were used.

## 4. Narration

| Asset | Source | Rights | Processing |
|---|---|---|---|
| `WHAT_IF_001_SHORT.mp3`, `WHAT_IF_001_LONG.mp3` | Supplied by the channel (ElevenLabs voice) | The channel's ElevenLabs licence. Confirm that your plan covers commercial use. | Gain and a transparent peak limiter only. Nothing was cut, repeated, re-ordered or time-stretched. |

## 5. Visual assets

All animation, characters, sets, diagrams and typography are original work made for this episode:
- **Engine:** Remotion, three.js and SVG.
- **Characters:** a silhouette rig.
- **3D:** a procedural coral reef and fish.
- **Sets:** an illustrated town, beach, harbour, market and grassland.

Only the following external data was used:

| Asset | Source | Credit | Licence |
|---|---|---|---|
| Moon colour map (rendered as the Moon disc and the 3D Moon) | [NASA SVS — CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) (LRO LROC WAC mosaic) | NASA's Scientific Visualization Studio | NASA media; not copyrighted in the US. Credit NASA. |
| Earth day texture and ocean mask | [NASA Visible Earth — Blue Marble 57752](https://visibleearth.nasa.gov/images/57752) | NASA Goddard Space Flight Center | Public domain |
| Clouds | [NASA Visible Earth 57747](https://visibleearth.nasa.gov/images/57747) | NASA GSFC | Public domain |
| City lights | [NASA Earth Observatory — Black Marble 2016](https://earthobservatory.nasa.gov/images/144898) | NASA Earth Observatory / Suomi NPP VIIRS | Public domain |
| Fonts: Inter, IBM Plex Mono, Instrument Serif | Google Fonts / @fontsource | — | SIL Open Font License 1.1 |

No stock footage, news footage, AI-generated imagery or third-party photographs were used.

## 6. Scientific sources and fact-check

| Topic | Source | What it supports |
|---|---|---|
| Tides | [NOAA — Tides](https://www.noaa.gov/education/resource-collections/ocean-coasts/tides) and [NOAA JetStream — Tides](https://www.noaa.gov/jetstream/ocean/tides) | The Moon dominates tides and the Sun still contributes, so tides would continue with the Sun alone. Spring and neap tides come from Moon–Sun alignment. Tides depend on local coastline and seafloor. The Moon's tidal pull is "over twice" the Sun's. |
| Grunion | [California Department of Fish and Wildlife — Grunion](https://wildlife.ca.gov/Fishing/Ocean/Grunion) | Runs on the four nights after full and new moons. Females bury eggs in wet sand. Eggs hatch about 10 days later, when the next high-tide series reaches and agitates them. Adults are 5–6 in. |
| Coral spawning and moonlight | [Davies et al. 2023, *Nature Communications* 14:2511](https://www.nature.com/articles/s41467-023-38070-y) | Lunar light cues help time broadcast spawning, and disrupting the cue shifts spawning. The peer review noted that effects on recruitment are not yet demonstrated, so the video presents reduced fertilisation as plausible, not certain. |
| Axial tilt | [NASA — Milankovitch cycles](https://science.nasa.gov/science-research/earth-science/climate-science/milankovitch-orbital-cycles-and-their-role-in-earths-climate/) | Tilt has varied between 22.1° and 24.5° over a ~41,000-year cycle, and is about 23.4° today. |
| Moonless obliquity | Laskar, Joutel & Robutel 1993 (*Nature*), and Lissauer, Barnes & Chambers 2012 (*Icarus*) | One model finds large chaotic swings without the Moon; the other finds more constrained ones. The video presents both families qualitatively and says plainly that it cannot predict a climate collapse. |

### Narration review

The long narration needed no corrections. It is consistently hedged ("could", "might", "some species", "one possible future") and matches the sources above.

The short narration uses two compressed lines. Both were kept as recorded, and the visuals carry the nuance:

- **"A generation of fish could die before ever entering the ocean."** The visuals show some nests not reached and others hatching, not a total loss.
- **"Earth's seasons could become less predictable as its axis behaves differently."** On screen this is tagged UNCERTAIN · MODEL-DEPENDENT · VERY LONG TIMESCALES.

**No invented numbers are presented as findings.** The day, season and year counters are marked ILLUSTRATIVE. The tide curves come from a stated illustrative model (lunar term plus solar term at about 46% of it).

## 8. V2 — real footage and photographs

V2 is a revision of the existing films: the same narration, timing, brand, characters, Earth scenes and fishing family. Only unclear or unrealistic scenes were replaced.

**V2 audio:** at the channel's request, both V2 videos have **no music**. The soundtrack is the narration plus the original sound effects, at −14 LUFS. The score from V1 is not used.

### Real footage

| Clip | Shows | Source | Credit | Licence |
|---|---|---|---|---|
| reef_open, reef_school, reef_carib, reef_polyps, reef_tangs, reef_pacific, reef_ledge, reef_sparse | Coral reefs and reef fish | NOAA Fisheries B-roll, *Coral Reefs, Coral Spawning, and Fish* | NOAA Fisheries / Flower Garden Banks NMS | Public domain (US government work) |
| spawn_setting, spawn_close, spawn_release, spawn_cloud | Real coral spawning: bundles at the polyps, release, and bundles in the water | Same NOAA B-roll | NOAA Fisheries / FGBNMS | Public domain |
| fgb_plume, fgb_brain, fgb_release, fgb_brain_lit, fgb_cloud | Coral spawning research cruise, 27–29 Aug 2013 | NOAA Flower Garden Banks NMS | Videography: Emma L. Hickerson, NOAA FGBNMS | Public domain |
| reef_bleached | Bleached, damaged reef, Leone, American Samoa (2009) | [NOAA Fisheries, *B-Roll: Bleached Coral in American Samoa*](https://videos.fisheries.noaa.gov/detail/videos/b-roll:-corals/video/900477970001/b-roll:-bleached-coral-in-american-samoa) | NOAA Fisheries | Public domain. Shown as "a damaged reef", one possible future (illustrative). It is not the same reef. |
| divers_survey | Scientific divers surveying a reef | [NOAA Fisheries, *B-Roll: Corals of the Pacific Ocean*](https://videos.fisheries.noaa.gov/detail/videos/b-roll:-corals/video/5231464663001/b-roll:-corals-of-the-pacific-ocean) | NOAA Fisheries | Public domain. Labelled ARCHIVE FOOTAGE · DRAMATIZED |
| ship_lab | Scientists and sonar displays aboard NOAA Ship *Reuben Lasker* | [NOAA Fisheries B-roll](https://videos.fisheries.noaa.gov/detail/videos/b-roll:-science-research/video/5800444465001/b-roll:-noaa-ship-reuben-lasker) | NOAA Fisheries | Public domain. Labelled dramatized |
| jsc_headset, jsc_screens | Scientists in a control room | [NASA SVS 12935](https://svs.gsfc.nasa.gov/12935) | NASA | Public domain. Labelled dramatized; no NASA logo is in the frames used |
| mayall_scope | The Mayall 4-m telescope | [NOIRLab 02102025-DESI-b-roll](https://noirlab.edu/public/videos/02102025-DESI-b-roll/) | DESI Collaboration/DOE/KPNO/NOIRLab/NSF/AURA/M. Sargent (Berkeley Lab) | CC BY 4.0 |
| mayall_operator | Telescope operator at the Mayall console | [NOIRLab Mayall-Clip_9-CC](https://noirlab.edu/public/videos/Mayall-Clip_9-CC/) | KPNO/NOIRLab/NSF/AURA/T. Matsopoulos | CC BY 4.0 |
| blanco_monitors | Observatory control room (Blanco telescope) | [NOIRLab Blanco-Clip_25-CC](https://noirlab.edu/public/videos/Blanco-Clip_25-CC/) | CTIO/NOIRLab/NSF/AURA/T. Matsopoulos | CC BY 4.0 |
| eso_domes, eso_domes2 | Very Large Telescope domes turning at night | [ESO ut1to3rotationtimelapse](https://www.eso.org/public/videos/ut1to3rotationtimelapse/), [ESO vltandatrotationtimelapse](https://www.eso.org/public/videos/vltandatrotationtimelapse/) | ESO/José Francisco Salgado (josefrancisco.org) | CC BY 4.0 |
| ca_pacific | Pacific Beach, San Diego (aerial surf) | [Flickr 25051522295](https://www.flickr.com/photos/59473516@N00/25051522295/) | TJ DeGroat | CC BY 2.0 |
| swash_fan | Waves washing up a California beach | [Flickr 52053351300](https://www.flickr.com/photos/195567181@N06/52053351300/) | Eve Harms | CC0 |
| beach_tripod | Locked-off shot of waves on a sandy beach (tide-line overlays) | [Flickr 30452602020](https://www.flickr.com/photos/148882997@N06/30452602020/) | Sparkus Design | CC BY 2.0. The location is not stated; it is labelled "REAL BEACH", not California, and the tide lines are illustrative. |
| ca_sunset | Hendry's Beach, Santa Barbara, at sunset | [Flickr 4360988820](https://www.flickr.com/photos/23024164@N06/4360988820/) | Damian Gadal | CC BY 2.0 |
| ca_lowtide | Low tide, Santa Barbara coast | [Flickr 6567341987](https://www.flickr.com/photos/23024164@N06/6567341987/) | Damian Gadal | CC BY 2.0 |
| night_predator | Wolf on an infrared night trail camera, Glacier Bay NP, Alaska (data bars cropped) | [NPS video](https://www.nps.gov/media/video/view.htm?id=3552D90B-0CBE-4C7F-BD1B-08DC8E8D69B2) | NPS / T. Lewis | Public domain |

### Real photographs

| Photo | Shows | Source | Credit | Licence |
|---|---|---|---|---|
| gr_female_digging | Female grunion dug in tail-first, San Diego County, 14 Mar 2025 | [iNaturalist photo 476783542](https://www.inaturalist.org/photos/476783542) | tunicatedreamz | CC BY 4.0 |
| gr_eggs_sand | Grunion eggs in the sand, Santa Barbara, 21 Apr 2023 | [iNaturalist photo 269835900](https://www.inaturalist.org/photos/269835900) | Mike Burnett | CC BY 4.0 |
| gr_eggs_closeup | Grunion eggs, La Jolla Shores, 21 Apr 2023 | [iNaturalist photo 276846407](https://www.inaturalist.org/photos/276846407) | Cypress Hansen | CC BY 4.0 |
| gr_egg_clump | A clutch of grunion eggs, Santa Barbara, 17 May 2022 | [iNaturalist photo 198573126](https://www.inaturalist.org/photos/198573126) | George Williams | CC BY 4.0 |
| gr_mass | Grunion run, La Jolla Shores | [iNaturalist photo 276846377](https://www.inaturalist.org/photos/276846377) | Cypress Hansen | CC BY 4.0 |
| gr_run_night | Grunion run, North Pacific Beach, 13 May 2025 | [iNaturalist photo 506949697](https://www.inaturalist.org/photos/506949697) | Lisa Biasillo | CC BY 4.0 |
| gr_run_surf | Grunion in the swash, Law Street Beach, San Diego | [iNaturalist photo 640604453](https://www.inaturalist.org/photos/640604453) | Jess Mullins | CC BY 4.0 |
| gr_run_waterline | Grunion at the waterline, Del Mar | [iNaturalist photo 453412977](https://www.inaturalist.org/photos/453412977) | sdash | CC BY 4.0 |
| gr_run_pier | Grunion run, Scripps Beach | [iNaturalist photo 386300940](https://www.inaturalist.org/photos/386300940) | Jess Mullins | CC BY 4.0 |
| gr_underwater | Grunion in the sea, La Jolla | [iNaturalist photo 146529740](https://www.inaturalist.org/photos/146529740) | Henrik Kibak | CC BY 4.0 |
| beach_night_waves | Night surf, Dana Point, California | [iNaturalist photo 672187404](https://www.inaturalist.org/photos/672187404) | Gavin Skeen | CC BY 4.0 |
| tide_gauge | NOAA tide gauge, Scripps Pier, La Jolla | [NOAA CO-OPS station 9410230](https://tidesandcurrents.noaa.gov/stationhome.html?id=9410230) | NOAA CO-OPS | Public domain |

### Textures

Sand textures `coast_sand_01`, `damp_beach_sand_02` and `dense_sand` from [Poly Haven](https://polyhaven.com), CC0. They are used only in the editable project's experimental beach diagram (`BeachSection.tsx`), not in the V2 videos.

**Attribution for the video description (V2):**
> Real footage and photos: NOAA Fisheries and NOAA Flower Garden Banks NMS; NASA; NPS; ESO/J.F. Salgado (CC BY 4.0); NOIRLab/NSF/AURA, DESI Collaboration, T. Matsopoulos, M. Sargent (CC BY 4.0); Flickr: TJ DeGroat, Sparkus Design, Damian Gadal (CC BY 2.0), Eve Harms (CC0); iNaturalist: tunicatedreamz, Mike Burnett, Cypress Hansen, George Williams, Lisa Biasillo, Jess Mullins, sdash, Henrik Kibak, Gavin Skeen (CC BY 4.0). Scientists shown are archive footage, dramatized; they are not footage of the hypothetical event.

