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

There is no real footage in either video. Everything on screen is an original animation made for this episode.

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
