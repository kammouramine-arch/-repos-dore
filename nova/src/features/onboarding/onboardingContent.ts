import type { Ionicons } from '@expo/vector-icons';

export interface OnboardingSlideContent {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

/** Three screens: what it does, what it feels like, where it is going. */
export const ONBOARDING_SLIDES: readonly OnboardingSlideContent[] = [
  {
    key: 'guidance',
    icon: 'navigate',
    title: 'Guidance built for the road',
    body: 'Turn-by-turn navigation on a map designed for night driving, with a voice that speaks only when it matters.',
  },
  {
    key: 'search',
    icon: 'search',
    title: 'Anywhere, in two taps',
    body: 'Search millions of places, compare the routes side by side, and see the whole trip before you pull away.',
  },
  {
    key: 'companion',
    icon: 'sparkles',
    title: 'A companion, not a GPS',
    body: 'Nova is built to ride with you — starting with navigation you can trust, every single day.',
  },
];
