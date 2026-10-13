import type { UserPosition } from '../entities/geo';

export interface RoadEvidence {
  source: 'TomTom map data';
  capturedAt: number;
  expiresAt: number;
  speedLimit: { value: number; unit: 'km/h' | 'mph' } | null;
  position: UserPosition;
}

export interface RoadDataProvider {
  isConfigured(): boolean;
  lookup(fixes: readonly UserPosition[], signal: AbortSignal): Promise<RoadEvidence>;
}
