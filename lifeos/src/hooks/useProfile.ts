import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cacheKeys } from '@/lib/cache';
import { fetchPreferences, fetchProfile, updatePreferences, updateProfile } from '@/services/profile';
import type { Profile, UserPreferences } from '@/types/database';
import { useCachedQuery } from './useCachedQuery';

export function useProfile() {
  return useCachedQuery(['profile'], cacheKeys.profile, fetchProfile);
}

export function usePreferences() {
  return useCachedQuery(['preferences'], cacheKeys.preferences, fetchPreferences);
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Profile>) => updateProfile(patch),
    onSuccess: () => client.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useUpdatePreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<UserPreferences>) => updatePreferences(patch),
    onSuccess: () => client.invalidateQueries({ queryKey: ['preferences'] }),
  });
}
