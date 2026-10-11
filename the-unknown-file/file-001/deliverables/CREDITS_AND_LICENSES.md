# THE UNKNOWN FILE — FILE #001 · Asset sources and licensing register

Every external asset used in either video is listed below, with its licence and how it is used. Everything else on screen was made for this production: motion graphics, typography, the illustrations of the village, bottle and cross-section, the 3D terrain renders, and the gas-flow model.

## Narration

| Asset | Source | Licence / rights | Use |
|---|---|---|---|
| `UNKNOWN_FILE_SHORT.mp3`, `UNKNOWN_FILE_LONG.mp3` | Supplied by the channel (ElevenLabs voice) | Channel's own ElevenLabs licence. Check that your ElevenLabs plan allows commercial use. | Only audio in both exports. Gain, a 60 Hz high-pass and a peak limiter were applied. No other processing. |

There is **no music and there are no sound effects** in the exports, as requested.

## Photographs (all public domain)

| File in project | Original | Author / credit | Licence | On-screen use |
|---|---|---|---|---|
| `photos/usgs_lockwood_1986_lake_nyos.jpg` | [Commons: Lake_Nyos_1986_001.jpg](https://commons.wikimedia.org/wiki/File:Lake_Nyos_1986_001.jpg) (USGS gallery) | Jack Lockwood, U.S. Geological Survey | Public domain (US federal government work) | Aftermath shot (short), archive shot and evidence print (long) |
| `photos/usgs_lockwood_nyos_lake.jpg` | [Commons: Nyos_Lake.jpg](https://commons.wikimedia.org/wiki/File:Nyos_Lake.jpg) (Smithsonian GVP / USGS) | Jack Lockwood, USGS | Public domain | Evidence print (short), aftermath print (long) |
| `photos/usgs_evans_2001_degassing.jpg` | [Commons: Lake_Nyos_2001.jpg](https://commons.wikimedia.org/wiki/File:Lake_Nyos_2001.jpg) (USGS gallery) | William C. Evans, USGS | Public domain | 2001 degassing platform (both videos) |
| `photos/nasa_landsat8_2014_lake_nyos_lrg.jpg` | [NASA Earth Observatory, Image of the Day 86244](https://science.nasa.gov/earth/earth-observatory/lake-nyos-cameroon-86244/) | NASA Earth Observatory image by Jesse Allen, using Landsat data from the U.S. Geological Survey (acquired 18 Dec 2014) | Public domain (NASA/USGS) | "Today" satellite photograph (long) |

Rejected on purpose:
- *Cow killed by Lake Nyos gasses.jpg* (public domain) was left out on respect grounds.
- *Monoun.jpg* (CC BY-SA 4.0) was left out because its share-alike terms would complicate monetised reuse.

No news-agency, stock or social-media imagery was used. No footage from other creators was used.

## Geographic data (used to build original maps and 3D renders)

| Data | Source | Licence / attribution |
|---|---|---|
| Country borders and coastlines | Natural Earth 1:50m via the `world-atlas` npm package | Public domain |
| Outlines of Lake Nyos and Lac Monoun, the Northwest Region, and village positions (Cha, Subum, Fang, Mashi) | OpenStreetMap via Nominatim | © OpenStreetMap contributors, ODbL. **Attribution required:** "Map data © OpenStreetMap contributors" |
| Elevation (DEM) | AWS Terrain Tiles / Mapzen "terrarium" (SRTM and others) | Open data. Attribution: "Elevation: Mapzen Terrain Tiles (SRTM, NASA/USGS and others)" |
| Satellite imagery draped on the 3D terrain | EOX **Sentinel-2 cloudless 2016** | CC BY 4.0. **Attribution required:** "Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)" |

## Fonts (embedded via @fontsource)

| Font | Licence |
|---|---|
| Inter (variable) | SIL Open Font License 1.1 |
| IBM Plex Mono | SIL Open Font License 1.1 |
| Instrument Serif | SIL Open Font License 1.1 |

## Software

| Tool | Licence note |
|---|---|
| Remotion 4 | Free for individuals and companies with up to 3 employees. Larger companies need a Remotion company licence. |
| Three.js, React Three Fiber, d3-geo, topojson-client | MIT / ISC |
| FFmpeg | LGPL/GPL (used as a tool, nothing redistributed) |
| faster-whisper (transcription) | MIT |

## Required on-platform credit line (paste into the YouTube description)

> Archival photographs: J. Lockwood and W. C. Evans / U.S. Geological Survey (public domain). Satellite photograph: NASA Earth Observatory / USGS Landsat (public domain). 3D terrain imagery: Sentinel-2 cloudless – s2maps.eu by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0. Elevation: Mapzen Terrain Tiles (SRTM). Map data © OpenStreetMap contributors (ODbL); Natural Earth. All animation, illustration and 3D reconstruction are original and are not footage of the 1986 event. Gas visualisations are scientific illustrations: carbon dioxide is invisible.

## Factual sources consulted

- USGS Open-File Report 87-97 (1987), initial investigation of the Lake Nyos disaster: https://pubs.usgs.gov/of/1987/0097/report.pdf
- NASA Earth Observatory, *Lake Nyos, Cameroon* (event date, ≈3,500 livestock, degassing 2001 and 2011, Landsat image): https://science.nasa.gov/earth/earth-observatory/lake-nyos-cameroon-86244/
- Smithsonian Global Volcanism Program, SEAN 11:08 report: https://volcano.si.edu/showreport.cfm?doi=10.5479/si.GVP.SEAN198608-224030 (blocked to automated access; cited for completeness)
- Smithsonian Magazine, *Defusing Africa's Killer Lakes* (Monoun 15 Aug 1984 and 37 deaths; Nyos ≈1,700–1,800 deaths; lake depth ≈ 208 m / 682 ft; affected villages; trigger hypotheses; 2001 pipe): https://www.smithsonianmag.com/science-nature/defusing-africas-killer-lakes-88765263/
- On-screen reference values: atmospheric CO₂ ≈ 0.04 % (NOAA); exhaled breath ≈ 4 %; CO₂ above ~10 % can cause loss of consciousness (NIOSH/CDC exposure guidance); CO₂ density ≈ 1.84 kg/m³ vs air ≈ 1.20 kg/m³ at 20 °C and 1 atm; hydrostatic pressure ≈ 1 atm per 10.3 m of water.
