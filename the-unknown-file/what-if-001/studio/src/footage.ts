/*
 * Registry of real footage and photographs introduced in V2.
 * Every entry names its source and licence; the same data is listed in deliverables/LICENSE_REGISTER.md.
 * `credit` is the short on-screen credit line. `what` is the honest on-screen description of the image.
 */
export type Lic = "PD-NOAA" | "PD-NASA" | "PD-USGOV" | "CC BY 4.0" | "CC BY 3.0" | "CC BY 2.0" | "CC BY 2.5" | "CC0";
export type ClipInfo = { file: string; kind: "video" | "photo"; credit: string; lic: Lic; what: string; w: number; h: number };

const NOAA_REEF = "NOAA Fisheries / FGBNMS · public domain";
const FGB = "NOAA Flower Garden Banks NMS · E. Hickerson · public domain";
const DESI = "DESI Collaboration/DOE/KPNO/NOIRLab/NSF/AURA/M. Sargent (Berkeley Lab) · CC BY 4.0";
const NASA_JSC = "NASA · public domain";

export const CLIPS: Record<string, ClipInfo> = {
  // ── coral reefs, daytime (NOAA Fisheries B-roll "Coral Reefs, Coral Spawning, and Fish")
  reef_open: { file: "footage/reef_open.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL REEF · GULF OF MEXICO", w: 1280, h: 720 },
  reef_school: { file: "footage/reef_school.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL REEF · GULF OF MEXICO", w: 1280, h: 720 },
  reef_carib: { file: "footage/reef_carib.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL REEF", w: 1280, h: 720 },
  reef_polyps: { file: "footage/reef_polyps.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL POLYPS", w: 1280, h: 720 },
  reef_tangs: { file: "footage/reef_tangs.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "REEF FISH", w: 1280, h: 720 },
  reef_pacific: { file: "footage/reef_pacific.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL REEF · PACIFIC", w: 1280, h: 720 },
  reef_ledge: { file: "footage/reef_ledge.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "FISH SHELTERING UNDER CORAL", w: 1280, h: 720 },
  reef_sparse: { file: "footage/reef_sparse.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "A SPARSER REEF AREA", w: 1280, h: 720 },
  // ── coral spawning at night
  spawn_setting: { file: "footage/spawn_setting.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL READY TO SPAWN · BUNDLES AT THE POLYPS", w: 1280, h: 720 },
  spawn_close: { file: "footage/spawn_close.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL SPAWNING", w: 1280, h: 720 },
  spawn_release: { file: "footage/spawn_release.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL SPAWNING · BUNDLES RELEASED", w: 1280, h: 720 },
  spawn_cloud: { file: "footage/spawn_cloud.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL SPAWNING · BUNDLES IN THE WATER", w: 1280, h: 720 },
  fgb_plume: { file: "footage/fgb_plume.mp4", kind: "video", credit: FGB, lic: "PD-NOAA", what: "CORAL SPAWNING · FLOWER GARDEN BANKS", w: 1920, h: 800 },
  fgb_brain: { file: "footage/fgb_brain.mp4", kind: "video", credit: FGB, lic: "PD-NOAA", what: "BRAIN CORAL AT NIGHT", w: 1920, h: 800 },
  fgb_release: { file: "footage/fgb_release.mp4", kind: "video", credit: FGB, lic: "PD-NOAA", what: "CORAL SPAWNING · FLOWER GARDEN BANKS", w: 1920, h: 800 },
  fgb_brain_lit: { file: "footage/fgb_brain_lit.mp4", kind: "video", credit: FGB, lic: "PD-NOAA", what: "BRAIN CORAL AT NIGHT", w: 1920, h: 800 },
  fgb_cloud: { file: "footage/fgb_cloud.mp4", kind: "video", credit: FGB, lic: "PD-NOAA", what: "CORAL SPAWNING · FLOWER GARDEN BANKS", w: 1920, h: 800 },
  // ── astronomers and control rooms (dramatized use: real people at work, not this event)
  mayall_scope: { file: "footage/mayall_scope.mp4", kind: "video", credit: DESI, lic: "CC BY 4.0", what: "MAYALL 4-M TELESCOPE", w: 1920, h: 1080 },
  mayall_operator: { file: "footage/mayall_operator.mp4", kind: "video", credit: "KPNO/NOIRLab/NSF/AURA/T. Matsopoulos · CC BY 4.0", lic: "CC BY 4.0", what: "TELESCOPE OPERATOR", w: 1920, h: 1080 },
  blanco_monitors: { file: "footage/blanco_monitors.mp4", kind: "video", credit: "CTIO/NOIRLab/NSF/AURA/T. Matsopoulos · CC BY 4.0", lic: "CC BY 4.0", what: "OBSERVATORY CONTROL ROOM", w: 1920, h: 1080 },
  jsc_headset: { file: "footage/jsc_headset.mp4", kind: "video", credit: NASA_JSC, lic: "PD-NASA", what: "SCIENTISTS AT WORK", w: 1920, h: 1080 },
  jsc_screens: { file: "footage/jsc_screens.mp4", kind: "video", credit: NASA_JSC, lic: "PD-NASA", what: "SCIENTISTS AT WORK", w: 1920, h: 1080 },
  // ── beaches & tides (V2)
  ca_pacific: { file: "footage/ca_pacific.mp4", kind: "video", credit: "TJ DeGroat / Flickr · CC BY 2.0", lic: "CC BY 2.0", what: "PACIFIC BEACH, SAN DIEGO", w: 1920, h: 1080 },
  swash_fan: { file: "footage/swash_fan.mp4", kind: "video", credit: "Eve Harms / Flickr · CC0", lic: "CC0", what: "WAVES WASHING UP A CALIFORNIA BEACH", w: 1920, h: 1080 },
  beach_tripod: { file: "footage/beach_tripod.mp4", kind: "video", credit: "Sparkus Design / Flickr · CC BY 2.0", lic: "CC BY 2.0", what: "WAVES ON A SANDY BEACH", w: 1920, h: 1080 },
  ca_sunset: { file: "footage/ca_sunset.mp4", kind: "video", credit: "Damian Gadal / Flickr · CC BY 2.0", lic: "CC BY 2.0", what: "HENDRY'S BEACH, SANTA BARBARA", w: 1280, h: 720 },
  ca_lowtide: { file: "footage/ca_lowtide.mp4", kind: "video", credit: "Damian Gadal / Flickr · CC BY 2.0", lic: "CC BY 2.0", what: "LOW TIDE, SANTA BARBARA COAST", w: 1280, h: 720 },
  // ── research & reefs (V2)
  reef_bleached: { file: "footage/reef_bleached.mp4", kind: "video", credit: "NOAA Fisheries · public domain", lic: "PD-NOAA", what: "BLEACHED, DAMAGED REEF · AMERICAN SAMOA", w: 1280, h: 720 },
  divers_survey: { file: "footage/divers_survey.mp4", kind: "video", credit: "NOAA Fisheries · public domain", lic: "PD-NOAA", what: "SCIENTIFIC DIVERS SURVEYING A REEF", w: 1280, h: 720 },
  ship_lab: { file: "footage/ship_lab.mp4", kind: "video", credit: "NOAA Fisheries · public domain", lic: "PD-NOAA", what: "SCIENTISTS ABOARD NOAA SHIP REUBEN LASKER", w: 1280, h: 720 },
  eso_domes: { file: "footage/eso_domes.mp4", kind: "video", credit: "ESO/José Francisco Salgado · CC BY 4.0", lic: "CC BY 4.0", what: "VERY LARGE TELESCOPE DOMES AT NIGHT", w: 1280, h: 720 },
  eso_domes2: { file: "footage/eso_domes2.mp4", kind: "video", credit: "ESO/José Francisco Salgado · CC BY 4.0", lic: "CC BY 4.0", what: "TELESCOPE DOMES TURNING AT NIGHT", w: 1280, h: 720 },
  night_predator: { file: "footage/night_predator.mp4", kind: "video", credit: "NPS / T. Lewis, Glacier Bay NP · public domain", lic: "PD-USGOV", what: "WOLF ON A NIGHT TRAIL CAMERA · INFRARED", w: 1920, h: 960 },
  // ── California grunion, real photographs (iNaturalist)
  gr_female_digging: { file: "photos/gr_female_digging.jpg", kind: "photo", credit: "tunicatedreamz / iNaturalist · CC BY 4.0", lic: "CC BY 4.0", what: "FEMALE GRUNION DIGGING IN, TAIL FIRST", w: 2048, h: 1536 },
  gr_eggs_sand: { file: "photos/gr_eggs_sand.jpg", kind: "photo", credit: "Mike Burnett / iNaturalist · CC BY 4.0", lic: "CC BY 4.0", what: "GRUNION EGGS IN THE SAND · SANTA BARBARA", w: 2048, h: 969 },
  gr_eggs_closeup: { file: "photos/gr_eggs_closeup.jpg", kind: "photo", credit: "Cypress Hansen / iNaturalist · CC BY 4.0", lic: "CC BY 4.0", what: "GRUNION EGGS · LA JOLLA SHORES", w: 2048, h: 1536 },
  gr_egg_clump: { file: "photos/gr_egg_clump.jpg", kind: "photo", credit: "George Williams / iNaturalist · CC BY 4.0", lic: "CC BY 4.0", what: "A CLUTCH OF GRUNION EGGS", w: 2048, h: 1536 },
  gr_mass: { file: "photos/gr_mass.jpg", kind: "photo", credit: "Cypress Hansen / iNaturalist · CC BY 4.0", lic: "CC BY 4.0", what: "GRUNION RUN · LA JOLLA SHORES", w: 2048, h: 1536 },
  gr_run_night: { file: "photos/gr_run_night.jpg", kind: "photo", credit: "Lisa Biasillo / iNaturalist · CC BY 4.0", lic: "CC BY 4.0", what: "GRUNION RUN · PACIFIC BEACH", w: 2048, h: 1536 },
  gr_run_surf: { file: "photos/gr_run_surf.jpg", kind: "photo", credit: "Jess Mullins / iNaturalist · CC BY 4.0", lic: "CC BY 4.0", what: "GRUNION IN THE SWASH · SAN DIEGO", w: 2048, h: 1536 },
  gr_run_waterline: { file: "photos/gr_run_waterline.jpg", kind: "photo", credit: "sdash / iNaturalist · CC BY 4.0", lic: "CC BY 4.0", what: "GRUNION AT THE WATERLINE · DEL MAR", w: 2048, h: 1542 },
  gr_run_pier: { file: "photos/gr_run_pier.jpg", kind: "photo", credit: "Jess Mullins / iNaturalist · CC BY 4.0", lic: "CC BY 4.0", what: "GRUNION RUN · SCRIPPS BEACH", w: 2048, h: 1536 },
  gr_underwater: { file: "photos/gr_underwater.jpg", kind: "photo", credit: "Henrik Kibak / iNaturalist · CC BY 4.0", lic: "CC BY 4.0", what: "GRUNION IN THE SEA · LA JOLLA", w: 2048, h: 1536 },
  beach_night_waves: { file: "photos/beach_night_waves.jpg", kind: "photo", credit: "Gavin Skeen / iNaturalist · CC BY 4.0", lic: "CC BY 4.0", what: "NIGHT SURF · DANA POINT, CALIFORNIA", w: 2048, h: 1536 },
  tide_gauge: { file: "photos/tide_gauge_scripps.jpg", kind: "photo", credit: "NOAA CO-OPS · public domain", lic: "PD-NOAA", what: "NOAA TIDE GAUGE · SCRIPPS PIER, LA JOLLA", w: 640, h: 853 },
};

export const clip = (id: string): ClipInfo => {
  const c = CLIPS[id];
  if (!c) throw new Error(`unknown clip ${id}`);
  return c;
};
