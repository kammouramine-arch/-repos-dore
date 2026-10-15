import type { Coordinates, UserPosition } from '../entities/geo';

export interface RoadAlert {
  id: string;
  kind: 'stop' | 'yield' | 'traffic-light' | 'traffic-light-warning' | 'limited-access' | 'ramp' | 'numbered-road';
  coordinate: Coordinates;
  label?: string;
  source: 'TomTom map data';
}
export interface RoadAheadEvidence { source: 'TomTom map data'; alerts: RoadAlert[]; segments?: { geometry: Coordinates[]; speedLimit: NonNullable<RoadEvidence['speedLimit']> }[]; expiresAt: number }

export interface RoadEvidence {
  source: 'TomTom map data';
  capturedAt: number;
  expiresAt: number;
  speedLimit: { value: number; unit: 'km/h' | 'mph'; source?: 'municipal-order'; authority?: 'wattignies-23-405' } | null;
  recentSegmentSigns?: { type: string }[];
  position: UserPosition;
}

export interface RoadDataProvider {
  isConfigured(): boolean;
  lookup(fixes: readonly UserPosition[], signal: AbortSignal): Promise<RoadEvidence>;
  lookupAhead?(geometry: readonly Coordinates[], signal: AbortSignal): Promise<RoadAheadEvidence>;
}
