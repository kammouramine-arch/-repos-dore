import * as React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/components/toast';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

/**
 * Aiguillage entre l'espace authentifié et les écrans de connexion.
 *
 * Les routes sont gardées plutôt que redirigées après coup : tant que la
 * session n'est pas déterminée, aucun écran applicatif n'est monté, donc aucune
 * requête authentifiée n'est émise.
 */
function RootNavigator() {
  const { status } = useAuth();
  const connected = status === 'connecte';

  React.useEffect(() => {
    if (status !== 'chargement') void SplashScreen.hideAsync();
  }, [status]);

  if (status === 'chargement') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Protected guard={!connected}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={connected}>
        <Stack.Screen name="(app)" />
        <Stack.Screen
          name="devis/nouveau"
          options={{ presentation: 'modal', headerShown: true, title: 'Nouveau devis' }}
        />
        <Stack.Screen name="devis/[id]" options={{ headerShown: true, title: 'Devis' }} />
        <Stack.Screen name="abonnement" options={{ headerShown: true, title: 'Abonnement' }} />
      </Stack.Protected>
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
