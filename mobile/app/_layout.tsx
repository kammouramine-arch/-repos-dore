import * as React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/components/toast';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

/** Aiguillage entre l'espace authentifié et les écrans de connexion. */
function RootNavigator() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (status === 'chargement') return;
    void SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';
    if (status === 'deconnecte' && !inAuthGroup) {
      router.replace('/(auth)/connexion');
    } else if (status === 'connecte' && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [status, segments, router]);

  if (status === 'chargement') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen
        name="devis/nouveau"
        options={{ presentation: 'modal', headerShown: true, title: 'Nouveau devis' }}
      />
      <Stack.Screen name="devis/[id]" options={{ headerShown: true, title: 'Devis' }} />
      <Stack.Screen name="abonnement" options={{ headerShown: true, title: 'Abonnement' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
