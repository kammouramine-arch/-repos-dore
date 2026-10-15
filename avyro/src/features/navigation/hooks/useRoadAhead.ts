import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useServices } from '@/app/runtime/AppRuntime';
import { useLocationStore, useNavigationStore, usePreferencesStore } from '@/app/stores/hooks';
import type { RoadAheadEvidence } from '@/core/domain/ports/roadDataProvider';
import type { Coordinates } from '@/core/domain/entities/geo';
import { roadLookahead } from '@/core/navigation/roadLookahead';
import { locateOnRoute } from '@/core/conversation/detour';
import { distanceBetween } from '@/utils/geo';

/** Static mapped signs on the selected route. No camera detection or live signal phases. */
export function useRoadAhead() {
  const { roadDataProvider } = useServices();
  const index = useNavigationStore(s => s.routeIndex);
  const progress = useNavigationStore(s => s.progress);
  const consent = usePreferencesStore(s => s.preferences.roadInformation);
  const fix = useLocationStore(s => s.position);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [now, setNow] = useState(Date.now);
  const [evidence, setEvidence] = useState<{ route: typeof index; value: RoadAheadEvidence } | null>(null);
  const pending = useRef<AbortController | null>(null);
  const requested = useRef<{ route: typeof index; position: Coordinates; at: number } | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { setActive(state === 'active'); if (state !== 'active') pending.current?.abort(); });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { subscription.remove(); clearInterval(timer); pending.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!active || !consent || !index || !progress || !fix || now - fix.timestamp > 10000 || !roadDataProvider.lookupAhead || !roadDataProvider.isConfigured()) return;
    if (pending.current || (evidence?.route === index && evidence.value.expiresAt > now && requested.current?.route === index && now - requested.current.at < 240000 && distanceBetween(requested.current.position, progress.snappedPosition) < 400)) return;
    // Retry failures at most once per minute, including when the free allowance ends.
    if (requested.current?.route === index && now - requested.current.at < 60000) return;
    const geometry = roadLookahead(index, progress.segmentIndex, progress.snappedPosition);
    if (geometry.length < 2) return;
    const controller = new AbortController(); pending.current = controller;
    requested.current = { route: index, position: progress.snappedPosition, at: now };
    void roadDataProvider.lookupAhead(geometry, controller.signal).then(value => { if (!controller.signal.aborted) setEvidence({ route: index, value }); }).catch(() => { if (!controller.signal.aborted) setEvidence(null); }).finally(() => { if (pending.current === controller) pending.current = null; });
  }, [active, consent, index, progress, roadDataProvider, now, fix, evidence]);
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, [index, consent]);
  return useMemo(() => {
    if (!active || !consent || !index || !progress || !fix || now - fix.timestamp > 10000 || evidence?.route !== index || evidence.value.expiresAt <= now) return [];
    const driven = locateOnRoute(index, progress.snappedPosition)?.travelledMeters ?? 0;
    return evidence.value.alerts.flatMap(alert => {
      const at = locateOnRoute(index, alert.coordinate);
      const ahead = at ? at.travelledMeters - driven : -1;
      return at && at.lateralMeters <= 15 && ahead > 5 && ahead <= 1000 ? [{ alert, aheadMeters: ahead }] : [];
    }).sort((a,b) => a.aheadMeters - b.aheadMeters);
  }, [active, consent, index, progress, fix, evidence, now]);
}
