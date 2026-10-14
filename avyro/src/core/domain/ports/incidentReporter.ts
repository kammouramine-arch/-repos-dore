import type { UserPosition } from '../entities/geo';
export type IncidentCategory = 'accident' | 'hazard' | 'closure' | 'police' | 'traffic' | 'blocked-lane' | 'weather' | 'map-issue';
export interface ReviewedIncident { id: string; category: IncidentCategory; latitude: number; longitude: number; observed: number; expires: number }
export interface IncidentReporter {
  isConfigured(): boolean;
  submit(category: IncidentCategory, observation: UserPosition): Promise<void>;
  list?(signal: AbortSignal): Promise<ReviewedIncident[]>;
}
