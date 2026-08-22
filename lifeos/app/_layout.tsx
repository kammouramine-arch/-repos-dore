import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '@/theme';
import { AuthProvider } from '@/state/AuthProvider';
import { QueryProvider } from '@/state/QueryProvider';
import { ConnectivityProvider } from '@/state/ConnectivityProvider';
import { track } from '@/services/analytics';
import { initPurchases } from '@/services/purchases';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigator() {
  const theme = useTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
    SplashScreen.hideAsync().catch(() => {});
  }, [theme.colors.background]);

  useEffect(() => {
    track('app_opened');
    // Connects to StoreKit / Play Billing in a build that has them; a no-op elsewhere.
    void initPurchases();
  }, []);

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: theme.reduceMotion ? 'none' : 'default',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="daily-reset" options={{ presentation: 'modal' }} />
        <Stack.Screen name="life-reset" options={{ presentation: 'modal' }} />
        <Stack.Screen name="briefing" options={{ presentation: 'modal' }} />
        <Stack.Screen name="weekly-review" options={{ presentation: 'modal' }} />
        <Stack.Screen name="agent/[key]" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <ConnectivityProvider>
                <Navigator />
              </ConnectivityProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
