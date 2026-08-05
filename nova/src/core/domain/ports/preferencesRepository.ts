import type { Place, RecentDestination } from '../entities/place';
import type { Preferences } from '../entities/preferences';

export interface PreferencesRepository {
  load(): Promise<Preferences>;
  save(preferences: Preferences): Promise<void>;
}

export interface OnboardingRepository {
  hasCompleted(): Promise<boolean>;
  markCompleted(): Promise<void>;
}

export interface RecentDestinationsRepository {
  /** Most recently used first. */
  list(): Promise<RecentDestination[]>;
  add(place: Place): Promise<RecentDestination[]>;
  clear(): Promise<void>;
}
