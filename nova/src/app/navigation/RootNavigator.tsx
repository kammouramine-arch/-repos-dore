import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuthStore, useOnboardingStore } from '@/app/stores/hooks';
import { LoginScreen } from '@/features/auth/ui/LoginScreen';
import { RegisterScreen } from '@/features/auth/ui/RegisterScreen';
import { HomeScreen } from '@/features/home/ui/HomeScreen';
import { GuidanceScreen } from '@/features/navigation/ui/GuidanceScreen';
import { OnboardingScreen } from '@/features/onboarding/ui/OnboardingScreen';
import { RoutePreviewScreen } from '@/features/route/ui/RoutePreviewScreen';
import { SearchScreen } from '@/features/search/ui/SearchScreen';
import { SettingsScreen } from '@/features/settings/ui/SettingsScreen';
import { colors } from '@/ui/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * One stack, three mutually exclusive groups.
 *
 * Which group is mounted follows from state — onboarding seen, session
 * restored — so signing in or out is a state change, never an imperative
 * `reset()` that has to be kept in sync from a dozen call sites.
 */
export const RootNavigator = () => {
  const authStatus = useAuthStore((state) => state.status);
  const hasOnboarded = useOnboardingStore((state) => state.completed);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {!hasOnboarded ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ animation: 'fade' }}
        />
      ) : authStatus !== 'authenticated' ? (
        <Stack.Group screenOptions={{ animation: 'fade' }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="RoutePreview" component={RoutePreviewScreen} />
          <Stack.Screen
            name="Guidance"
            component={GuidanceScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};
