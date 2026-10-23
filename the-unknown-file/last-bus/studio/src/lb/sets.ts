/** Set measurements mirrored from blender/build_sets.py (metres, bus-local frame: +x = front). */
export const BUS = { x0: -5.6, x1: 5.6, w: 2.5, h: 2.25, winLo: 0.88, winHi: 1.86, doorMid: [0.55, 1.75], doorFront: [4.35, 5.45] } as const;
export const HX = -1.95; // his row (kerb side, 4th row)
export const CUSH_TOP = 0.45;
export const WIN_Y = -0.955; // window seat centre (kerb side)
export const AISLE_Y = -0.525; // aisle seat centre
export const SEAT_EDGE_X = HX + 0.23; // front edge of the cushion
export const AISLE_C = 0.0; // aisle centre line
export const CORD_Z = BUS.winHi + 0.06;
export const DRIVER_SEAT: [number, number] = [4.85, 0.72];
export const STATION_BUS = [6.9, 4.4]; // bus centre in the station street (front door at the shelter)
export const BLDG_BUS = [3.15, 4.4]; // bus centre in his street (middle door at the shelter)
/** bus-local → street-world for a bus parked at `c` facing -x (rotated 180°), floor 0.35 m up */
export const busToStreet = (c: readonly number[], p: [number, number, number]): [number, number, number] => [c[0] - p[0], c[1] - p[1], p[2] + 0.35];
