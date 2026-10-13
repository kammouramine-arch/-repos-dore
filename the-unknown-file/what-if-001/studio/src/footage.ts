/*
 * Registry of real footage and photographs introduced in V2.
 * Every entry names its source and licence; the same data is listed in deliverables/LICENSE_REGISTER.md.
 * `credit` is the short on-screen credit line. `what` is the honest on-screen description of the image.
 */
export type Lic = "PD-NOAA" | "PD-NASA" | "PD-USGOV" | "CC BY 4.0" | "CC BY 3.0" | "CC BY 2.0" | "CC BY 2.5" | "CC0";
export type ClipInfo = { file: string; kind: "video" | "photo"; credit: string; lic: Lic; what: string; w: number; h: number };

const NOAA_REEF = "NOAA Fisheries / FGBNMS · public domain";
const FGB = "NOAA Flower Garden Banks NMS · E. Hickerson · public domain";
const DESI = "DESI Collaboration/DOE/KPNO/NOIRLab/NSF/AURA/M. Sargent · CC BY 4.0";
const NASA_JSC = "NASA · public domain";

export const CLIPS: Record<string, ClipInfo> = {
  // ── coral reefs, daytime (NOAA Fisheries B-roll "Coral Reefs, Coral Spawning, and Fish")
  reef_open: { file: "footage/reef_open.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL REEF · GULF OF MEXICO", w: 1280, h: 720 },
  reef_school: { file: "footage/reef_school.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL REEF · GULF OF MEXICO", w: 1280, h: 720 },
  reef_carib: { file: "footage/reef_carib.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL REEF", w: 1280, h: 720 },
  reef_staghorn: { file: "footage/reef_staghorn.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "STAGHORN CORAL", w: 1280, h: 720 },
  reef_polyps: { file: "footage/reef_polyps.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL POLYPS", w: 1280, h: 720 },
  reef_yellow: { file: "footage/reef_yellow.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL COLONIES", w: 1280, h: 720 },
  reef_tangs: { file: "footage/reef_tangs.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "REEF FISH", w: 1280, h: 720 },
  reef_pacific: { file: "footage/reef_pacific.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "CORAL REEF · PACIFIC", w: 1280, h: 720 },
  reef_fish: { file: "footage/reef_fish.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "REEF FISH", w: 1280, h: 720 },
  reef_fish2: { file: "footage/reef_fish2.mp4", kind: "video", credit: NOAA_REEF, lic: "PD-NOAA", what: "REEF FISH", w: 1280, h: 720 },
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
  kpno_dusk: { file: "footage/kpno_dusk.mp4", kind: "video", credit: DESI, lic: "CC BY 4.0", what: "KITT PEAK NATIONAL OBSERVATORY", w: 1920, h: 1080 },
  mayall_scope: { file: "footage/mayall_scope.mp4", kind: "video", credit: DESI, lic: "CC BY 4.0", what: "MAYALL 4-M TELESCOPE", w: 1920, h: 1080 },
  desi_control: { file: "footage/desi_control.mp4", kind: "video", credit: DESI, lic: "CC BY 4.0", what: "TELESCOPE CONTROL ROOM", w: 1920, h: 1080 },
  mayall_operator: { file: "footage/mayall_operator.mp4", kind: "video", credit: "KPNO/NOIRLab/NSF/AURA/T. Matsopoulos · CC BY 4.0", lic: "CC BY 4.0", what: "TELESCOPE OPERATOR", w: 1920, h: 1080 },
  blanco_monitors: { file: "footage/blanco_monitors.mp4", kind: "video", credit: "CTIO/NOIRLab/NSF/AURA · CC BY 4.0", lic: "CC BY 4.0", what: "OBSERVATORY CONTROL ROOM", w: 1920, h: 1080 },
  jsc_dim: { file: "footage/jsc_dim.mp4", kind: "video", credit: NASA_JSC, lic: "PD-NASA", what: "SCIENTISTS AT WORK", w: 1920, h: 1080 },
  jsc_headset: { file: "footage/jsc_headset.mp4", kind: "video", credit: NASA_JSC, lic: "PD-NASA", what: "SCIENTISTS AT WORK", w: 1920, h: 1080 },
  jsc_screens: { file: "footage/jsc_screens.mp4", kind: "video", credit: NASA_JSC, lic: "PD-NASA", what: "SCIENTISTS AT WORK", w: 1920, h: 1080 },
};

export const clip = (id: string): ClipInfo => {
  const c = CLIPS[id];
  if (!c) throw new Error(`unknown clip ${id}`);
  return c;
};
