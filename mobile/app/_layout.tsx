import * as React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
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
  const { status, offline, refresh } = useAuth();
  const connected = status === 'connecte';

  React.useEffect(() => {
    if (status !== 'chargement' || offline) void SplashScreen.hideAsync();
  }, [status, offline]);

  // Session existante mais serveur injoignable : on ne déconnecte pas l'artisan,
  // on lui propose de réessayer. Son jeton reste dans le trousseau.
  if (offline) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.canvas,
          padding: 32,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink, textAlign: 'center' }}>
          Connexion indisponible
        </Text>
        <Text style={{ fontSize: 14, color: colors.subtle, textAlign: 'center' }}>
          Vos données sont en sécurité. Vérifiez votre réseau, puis réessayez.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void refresh()}
          style={({ pressed }) => ({
            marginTop: 8,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            backgroundColor: colors.accent,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: colors.white, fontWeight: '600', fontSize: 15 }}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

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
