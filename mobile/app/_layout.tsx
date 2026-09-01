import * as React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { hasSeenOnboarding } from '@/lib/onboarding';
import { ToastProvider } from '@/components/toast';
import { LaunchScreen } from '@/components/launch';
import { colors, radius, spacing, typography } from '@/theme';

void SplashScreen.preventAutoHideAsync();

/**
 * Aiguillage de l'application.
 *
 * Les routes sont gardées plutôt que redirigées après coup : tant que la
 * session n'est pas déterminée, aucun écran applicatif n'est monté, donc
 * aucune requête authentifiée n'est émise. Trois espaces s'excluent — la
 * découverte, l'authentification, l'application — et l'écran de lancement
 * couvre le temps de décider lequel s'applique.
 */
function RootNavigator() {
  const { status, offline, refresh } = useAuth();
  const [seenOnboarding, setSeenOnboarding] = React.useState<boolean | null>(null);
  const [launchSettled, setLaunchSettled] = React.useState(false);

  React.useEffect(() => {
    void hasSeenOnboarding().then(setSeenOnboarding);
  }, []);

  const decided = status !== 'chargement' && seenOnboarding !== null;

  React.useEffect(() => {
    // On masque l'écran natif dès que le nôtre peut prendre le relais, pour
    // éviter le clignotement entre les deux.
    void SplashScreen.hideAsync();
  }, []);

  const connected = status === 'connecte';
  const onSettled = React.useCallback(() => setLaunchSettled(true), []);

  // Session existante mais serveur injoignable : on ne déconnecte pas
  // l'artisan, on lui propose de réessayer. Son jeton reste dans le trousseau.
  if (offline) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.canvas,
          padding: spacing['3xl'],
          gap: spacing.md,
        }}
      >
        <Text style={[typography.heading, { color: colors.ink, textAlign: 'center' }]}>
          Connexion indisponible
        </Text>
        <Text style={[typography.body, { color: colors.muted, textAlign: 'center' }]}>
          Vos données sont en sécurité. Vérifiez votre réseau, puis réessayez.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void refresh()}
          style={({ pressed }) => ({
            marginTop: spacing.sm,
            paddingVertical: 13,
            paddingHorizontal: spacing['2xl'],
            borderRadius: radius.md,
            backgroundColor: colors.accent,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={[typography.bodyStrong, { color: colors.white }]}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (!decided || !launchSettled) {
    return <LaunchScreen onSettled={onSettled} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Protected guard={!connected && !seenOnboarding}>
        <Stack.Screen name="(public)" />
      </Stack.Protected>

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
        <Stack.Screen
          name="abonnement"
          options={{ headerShown: true, title: 'Abonnement', headerBackTitle: 'Retour' }}
        />
        <Stack.Screen
          name="catalogue"
          options={{ headerShown: true, title: 'Catalogue de prix', headerBackTitle: 'Retour' }}
        />
        <Stack.Screen
          name="entreprise"
          options={{ headerShown: true, title: 'Mon entreprise', headerBackTitle: 'Retour' }}
        />
        <Stack.Screen
          name="analytique"
          options={{ headerShown: true, title: 'Activité', headerBackTitle: 'Retour' }}
        />
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
