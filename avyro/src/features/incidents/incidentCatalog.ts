import type { IncidentCategory } from '@/core/domain/ports/incidentReporter';
import type { IconName } from '@/ui/components/Icon';

export const INCIDENT_CATALOG: { category: IncidentCategory; title: string; icon: IconName; color: string }[] = [
  { category: 'traffic', title: 'Traffic', icon: 'car-sport-outline', color: '#8B5BB0' },
  { category: 'police', title: 'Police', icon: 'shield-outline', color: '#376EA8' },
  { category: 'accident', title: 'Crash', icon: 'car-outline', color: '#C83F49' },
  { category: 'hazard', title: 'Hazard', icon: 'warning-outline', color: '#AC731A' },
  { category: 'closure', title: 'Closure', icon: 'remove-circle-outline', color: '#C83F49' },
  { category: 'blocked-lane', title: 'Blocked lane', icon: 'arrow-up-outline', color: '#AC731A' },
  { category: 'weather', title: 'Weather', icon: 'cloudy-outline', color: '#526D87' },
  { category: 'map-issue', title: 'Map issue', icon: 'map-outline', color: '#087F83' },
];
