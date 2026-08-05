import type { IconName } from '@/ui/components/Icon';

export interface OnboardingSlideContent {
  key: string;
  icon: IconName;
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
    body: 'Avyro is the world’s first AI Driving Companion — starting with navigation you can trust, every single day.',
  },
];
