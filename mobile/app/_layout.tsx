import * as React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { hasSeenOnboarding } from '@/lib/onboarding';
import { ToastProvider } from '@/components/toast';
import { LaunchScreen } from '@/components/launch';
import { Logo } from '@/components/logo';
import { Ionicons } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import { recordDiagnostic } from '@/lib/diagnostics';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
  const { status, session, offline, refresh } = useAuth();
  const [seenOnboarding, setSeenOnboarding] = React.useState<boolean | null>(null);
  const startupAt = React.useRef<number | null>(null);
  const startupRecorded = React.useRef(false);

  React.useEffect(() => {
    void hasSeenOnboarding().then(setSeenOnboarding).catch(() => setSeenOnboarding(false));
  }, []);

  const decided = status !== 'chargement' && seenOnboarding !== null;

  React.useEffect(() => {
    if (startupAt.current === null) startupAt.current = Date.now();
  }, []);

  React.useEffect(() => {
    if (decided && !startupRecorded.current) {
      startupRecorded.current = true;
      recordDiagnostic({ area: 'startup', durationMs: Date.now() - (startupAt.current ?? Date.now()), code: offline ? 'ROOT_DECIDED_OFFLINE' : 'ROOT_DECIDED' });
    }
  }, [decided, offline]);

  React.useEffect(() => {
    // On masque l'écran natif dès que le nôtre peut prendre le relais, pour
    // éviter le clignotement entre les deux.
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  const connected = status === 'connecte';
  const needsPlan = Platform.OS === 'ios' && session?.organization.role === 'OWNER' && (!session.subscription || session.subscription.status === 'incomplete');

  // Session existante mais serveur injoignable : on ne déconnecte pas
  // l'artisan, on lui propose de réessayer. Son jeton reste dans le trousseau.
  if (offline && !connected) {
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
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.full,
            backgroundColor: colors.warningSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.sm,
          }}
        >
          <Ionicons name="cloud-offline-outline" size={26} color={colors.warning} />
        </View>
        <Text style={[typography.heading, { color: colors.ink, textAlign: 'center' }]}>
          Connexion indisponible
        </Text>
        <Text style={[typography.body, { color: colors.muted, textAlign: 'center' }]}>
          Vos devis et vos clients sont en sécurité. Vérifiez votre réseau, puis réessayez.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void refresh()}
          style={({ pressed }) => ({
            marginTop: spacing.lg,
            paddingVertical: 14,
            paddingHorizontal: spacing['3xl'],
            borderRadius: radius.md,
            backgroundColor: colors.accent,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={[typography.bodyStrong, { color: colors.white }]}>Réessayer</Text>
        </Pressable>
        <View style={{ position: 'absolute', bottom: spacing['4xl'] }}>
          <Logo size={22} />
        </View>
      </View>
    );
  }

  if (!decided) {
    return <LaunchScreen />;
  }

  // A session is not a verified identity. New mobile accounts receive a code
  // before they can enter quotes, clients, or billing. Keeping this gate at
  // the root also covers an unverified account that later signs in on another
  // device; it cannot be bypassed by navigating directly to a tab.
  if (connected && session && !session.user.emailVerified) {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface },
          animation: 'fade_from_bottom',
          animationDuration: 220,
        }}
      >
        <Stack.Screen name="verification" />
        <Stack.Screen name="compte" options={{ headerShown: true, title: 'Mon compte' }} />
      </Stack>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: 'slide_from_right',
        animationDuration: 260,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animationMatchesGesture: true,
        /*
         * Sans intitulé explicite, iOS reprend le titre de l'écran précédent
         * pour le bouton retour — et quand cet écran est un groupe de routes,
         * il affiche « (app) ». Constaté sur iPhone. Le défaut est donc posé
         * ici, une fois, plutôt qu'écran par écran : un écran ajouté demain
         * hérite du bon libellé sans qu'on y pense.
         */
        headerBackTitle: 'Retour',
        headerBackButtonDisplayMode: 'generic',
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.ink },
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
      }}
    >
      <Stack.Protected guard={!connected && !seenOnboarding}>
        <Stack.Screen name="(public)" />
      </Stack.Protected>

      <Stack.Protected guard={!connected}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={connected}>
        <Stack.Protected guard={!needsPlan}>
        <Stack.Screen name="(app)" options={{ headerShown: false, title: 'DEVISERA' }} />
        <Stack.Screen
          name="devis/nouveau"
          options={{ presentation: 'modal', headerShown: true, title: 'Nouveau devis', headerBackTitle: 'Retour' }}
        />
        <Stack.Screen name="devis/[id]" options={{ headerShown: true, title: 'Devis', headerBackTitle: 'Retour' }} />
        <Stack.Screen name="clients/[id]" options={{ headerShown: true, title: 'Fiche client', headerBackTitle: 'Retour' }} />
        </Stack.Protected>
        <Stack.Screen
          name="abonnement"
          options={{ headerShown: true, title: 'Abonnement' }}
        />
        <Stack.Screen name="presentation" options={{ headerShown: false }} />
        <Stack.Screen name="compte" options={{ headerShown: true, title: 'Mon compte' }} />
        <Stack.Screen
          name="catalogue"
          options={{ headerShown: true, title: 'Catalogue de prix' }}
        />
        <Stack.Screen
          name="entreprise"
          options={{ headerShown: true, title: 'Mon entreprise' }}
        />
        <Stack.Screen
          name="analytique"
          options={{ headerShown: true, title: 'Activité' }}
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
