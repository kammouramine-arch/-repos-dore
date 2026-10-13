import type { UserPosition } from '../entities/geo';
export type IncidentCategory = 'accident' | 'hazard' | 'closure' | 'police';
export interface IncidentReporter {
  isConfigured(): boolean;
  submit(category: IncidentCategory, observation: UserPosition): Promise<void>;
}
