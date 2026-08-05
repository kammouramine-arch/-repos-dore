import type { MapStyleElement } from 'react-native-maps';

import { palette } from '@/ui/theme';

/**
 * Google Maps night style (Android; iOS uses Apple Maps' own dark mode).
 *
 * Built to the same rules as the rest of the app: near-black land, one step of
 * lift for roads, labels only where a driver needs them. Points of interest
 * are muted so the route is the brightest thing on screen.
 */
export const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: palette.ink900 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A93A3' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: palette.ink950 }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#2A303C' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#B9C0CC' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6E7686' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#101A16' }],
  },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1F242E' }] },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: palette.ink900 }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9AA2B1' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#262C38' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#333B4A' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#C3CAD6' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },

  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#232936' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7C8494' }],
  },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0B1220' }] },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#41506B' }],
  },
];
