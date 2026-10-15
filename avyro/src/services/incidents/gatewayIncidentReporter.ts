import { env } from '@/config';
import type { IncidentReporter, ReviewedIncident } from '@/core/domain/ports/incidentReporter';
import { AppError } from '@/core/domain/errors/appError';
import type { HttpClient } from '@/services/http/httpClient';

export const createGatewayIncidentReporter = ({ http, getAccessToken }: { http: HttpClient; getAccessToken(): Promise<string | null> }): IncidentReporter => {
  const listeners = new Set<() => void>();
  return ({
  subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  isConfigured: () => env.backendUrl.startsWith('https://'),
  async list(signal) {
    const token = await getAccessToken();
    if (!token) throw new AppError('network', 'Community reports unavailable.');
    return http.getJson(`${env.backendUrl}/incidents?community=1`, value => {
      if (!Array.isArray(value) || value.length > 100) throw new AppError('invalid-response', 'Invalid community feed.');
      return value.filter((item): item is ReviewedIncident => item && typeof item.id === 'string' && ['approved', 'community'].includes(item.status) &&
        ['accident','hazard','closure','traffic','blocked-lane','weather','map-issue'].includes(item.category) &&
        Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 && Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180 &&
        Number.isFinite(item.observed) && item.observed <= Date.now() && Number.isFinite(item.expires) && item.expires > Date.now());
    }, { signal, operation: 'incident.feed', headers: { Authorization: `Bearer ${token}` } });
  },
  async feedback(id, decision, observation) {
    const token = await getAccessToken();
    if (!token) throw new AppError('network', 'Community reports unavailable.');
    await http.postJson(`${env.backendUrl}/incidents/feedback`, { id, decision, latitude: observation.coordinates.latitude, longitude: observation.coordinates.longitude, observedAt: observation.timestamp }, value => {
      if (!value || typeof value !== 'object' || !('accepted' in value) || value.accepted !== true) throw new AppError('invalid-response', 'Feedback was not accepted.');
      return null;
    }, { operation: 'incident.feedback', headers: { Authorization: `Bearer ${token}` } });
    listeners.forEach(listener => listener());
  },
  async submit(category, observation) {
    const token = await getAccessToken();
    if (!env.backendUrl || !token) throw new AppError('network', 'Community reports are not connected.');
    await http.postJson(`${env.backendUrl}/incidents`, {
      category,
      latitude: observation.coordinates.latitude,
      longitude: observation.coordinates.longitude,
      observedAt: observation.timestamp,
      heading: observation.speed != null && observation.speed >= 2 ? observation.heading : null,
      consent: true,
      publication: 'community',
    }, (value) => {
      if (!value || typeof value !== 'object' || !('status' in value) || value.status !== 'community') throw new AppError('invalid-response', 'Report was not accepted.');
      return null;
    }, { operation: 'incident.submit', headers: { Authorization: `Bearer ${token}` } });
    listeners.forEach(listener => listener());
  },
});
};
