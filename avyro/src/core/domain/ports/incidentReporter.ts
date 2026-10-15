import type { UserPosition } from '../entities/geo';
export type IncidentCategory = 'accident' | 'hazard' | 'closure' | 'police' | 'traffic' | 'blocked-lane' | 'weather' | 'map-issue';
export interface ReviewedIncident { id: string; category: IncidentCategory; latitude: number; longitude: number; observed: number; expires: number; heading?: number | null; status?: 'approved' | 'community' }
export interface IncidentReporter {
  isConfigured(): boolean;
  subscribe?(listener: () => void): () => void;
  submit(category: IncidentCategory, observation: UserPosition): Promise<void>;
  feedback?(id: string, decision: 'confirmed' | 'not-seen' | 'withdraw', observation: UserPosition): Promise<void>;
  list?(signal: AbortSignal): Promise<ReviewedIncident[]>;
}
