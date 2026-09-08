import * as React from 'react';
import { Stack } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { Pressable, Text, View, type ColorValue } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { hasSeenOnboarding } from '@/lib/onboarding';
import { hasLaunchedBefore, markLaunched } from '@/lib/launch-memory';
import { claimLaunch } from '@/lib/launch-timing';
import { ToastProvider } from '@/components/toast';
import { LaunchOverlay } from '@/components/launch';
import { HeaderBack } from '@/components/header-back';
import { Logo } from '@/components/logo';
import { Ionicons } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import { BRAND_TOP } from '@/theme/gradient';
import { recordDiagnostic } from '@/lib/diagnostics';
import { localizeText, useMobileLocale, copy } from '@/lib/i18n';

// L'écran natif reste affiché tant que la séquence de lancement n'a pas
// peint sa première image : c'est elle qui le retire (voir LaunchOverlay).
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 180, fade: true });

/**
 * Écran de panne au démarrage.
 *
 * Deux situations distinctes recevaient le même message : l'absence de
 * réseau et un serveur qui répond 500. La première se règle en changeant de
 * réseau, la seconde ne dépend pas de l'artisan — et sa référence permet au
 * support de retrouver la ligne de journal. Les données locales restent en
 * place dans les deux cas.
 */
function StartupFailure({ outage, reference, onRetry }: { outage: 'network' | 'server'; reference: string | null; onRetry: () => void }) {
  const locale = useMobileLocale();
  const [retrying, setRetrying] = React.useState(false);
  const server = outage === 'server';
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, padding: spacing['3xl'], gap: spacing.md }}>
      <View style={{ width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.warningSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
        <Ionicons name={server ? 'server-outline' : 'cloud-offline-outline'} size={26} color={colors.warning} />
      </View>
      <Text style={[typography.heading, { color: colors.ink, textAlign: 'center' }]}>
        {localizeText(locale, server ? 'Service indisponible' : 'Connexion indisponible')}
      </Text>
      <Text style={[typography.body, { color: colors.muted, textAlign: 'center' }]}>
        {localizeText(
          locale,
          server
            ? 'Le service ne répond pas correctement. Vos devis et vos clients sont en sécurité. Réessayez dans un instant.'
            : 'Vos devis et vos clients sont en sécurité. Vérifiez votre réseau, puis réessayez.',
        )}
      </Text>
      {server && reference ? (
        <Text style={[typography.caption, { color: colors.subtle, textAlign: 'center' }]}>{`${copy(locale, 'reference')} : ${reference}`}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={retrying}
        onPress={() => {
          setRetrying(true);
          Promise.resolve(onRetry()).finally(() => setRetrying(false));
        }}
        style={({ pressed }) => ({
          marginTop: spacing.lg,
          paddingVertical: 14,
          paddingHorizontal: spacing['3xl'],
          borderRadius: radius.md,
          backgroundColor: colors.accent,
          opacity: pressed || retrying ? 0.85 : 1,
        })}
      >
        <Text style={[typography.bodyStrong, { color: colors.white }]}>{copy(locale, 'retry')}</Text>
      </Pressable>
      <View style={{ position: 'absolute', bottom: spacing['4xl'] }}>
        <Logo size={22} />
      </View>
    </View>
  );
}

/**
 * Aiguillage de l'application.
 *
 * Les routes sont gardées plutôt que redirigées après coup : tant que la
 * session n'est pas déterminée, aucun écran applicatif n'est monté, donc
 * aucune requête authentifiée n'est émise. Trois espaces s'excluent — la
 * découverte, l'authentification, l'application.
 */
function Navigation({ seenOnboarding }: { seenOnboarding: boolean }) {
  const { status, session, outage, outageReference, refresh } = useAuth();
  const locale = useMobileLocale();
  const connected = status === 'connecte';
  // Entitlement state is computed by the server. The fallback keeps cached
  // sessions from older builds safe while the first refresh is in flight.
  const needsPlan = connected && !!session && session.user.emailVerified && (
    session.nextStep === 'subscription' ||
    (!session.nextStep && !session.access?.canWrite)
  );
  const back = locale === 'en' ? 'Back' : 'Retour';

  /*
   * En-tête commun. Constaté sur iPhone : le bouton retour natif se dessinait
   * vide (une capsule sans chevron ni texte) sur « Mon compte » et
   * « Abonnement ». Le contrôle est donc fourni par l'application, avec un
   * libellé qui n'est jamais le nom d'une route.
   */
  const headerChrome = {
    headerTintColor: colors.accent,
    headerTitleAlign: 'center' as const,
    headerTitleStyle: { color: colors.ink, fontWeight: '600' as const, fontSize: 17 },
    headerStyle: { backgroundColor: colors.canvas },
    headerShadowVisible: false,
    headerBackVisible: false,
    headerLeft: ({ canGoBack, tintColor }: { canGoBack?: boolean; tintColor?: ColorValue }) =>
      canGoBack ? <HeaderBack tint={tintColor ?? colors.accent} /> : null,
  };

  // Session existante mais serveur injoignable ou en panne : on ne déconnecte
  // pas l'artisan, son jeton reste dans le trousseau.
  if (outage && !connected) {
    return <StartupFailure outage={outage} reference={outageReference} onRetry={() => void refresh()} />;
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
         * ici, une fois, plutôt qu'écran par écran.
         */
        headerBackTitle: back,
        ...headerChrome,
      }}
    >
      <Stack.Protected guard={!connected && !seenOnboarding}>
        <Stack.Screen name="(public)" />
      </Stack.Protected>

      <Stack.Protected guard={!connected}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={connected && !session?.user.emailVerified}>
        <Stack.Screen name="verification" />
      </Stack.Protected>
      <Stack.Protected guard={connected && !!session?.user.emailVerified}>
        <Stack.Protected guard={!needsPlan}>
          <Stack.Screen name="(app)" options={{ headerShown: false, title: 'DEVISERA' }} />
          <Stack.Screen name="devis/nouveau" options={{ presentation: 'modal', headerShown: true, title: locale === 'en' ? 'New quote' : 'Nouveau devis', headerBackTitle: back }} />
          <Stack.Screen name="devis/[id]" options={{ headerShown: true, title: locale === 'en' ? 'Quote' : 'Devis', headerBackTitle: back }} />
          <Stack.Screen name="clients/[id]" options={{ headerShown: true, title: locale === 'en' ? 'Client profile' : 'Fiche client', headerBackTitle: back }} />
        </Stack.Protected>
        <Stack.Screen name="abonnement" options={{ headerShown: true, title: locale === 'en' ? 'Subscription' : 'Abonnement', headerBackTitle: back }} />
        <Stack.Screen name="presentation" options={{ headerShown: false }} />
        <Stack.Screen name="paiements" options={{ headerShown: true, title: copy(locale, 'invoices'), headerBackTitle: back }} />
        <Stack.Screen name="catalogue" options={{ headerShown: true, title: locale === 'en' ? 'Price book' : 'Catalogue de prix', headerBackTitle: back }} />
        <Stack.Screen name="entreprise" options={{ headerShown: true, title: locale === 'en' ? 'My business' : 'Mon entreprise', headerBackTitle: back }} />
        <Stack.Screen name="analytique" options={{ headerShown: true, title: locale === 'en' ? 'Activity' : 'Activité', headerBackTitle: back }} />
      </Stack.Protected>
      <Stack.Protected guard={connected}>
        <Stack.Screen name="compte" options={{ headerShown: true, title: locale === 'en' ? 'My account' : 'Mon compte', headerBackTitle: back }} />
        <Stack.Screen name="suppression" options={{ headerShown: true, title: copy(locale, 'deleteAccount'), headerBackTitle: back }} />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * Racine : l'application se monte dès qu'elle sait quoi afficher, et la
 * séquence de lancement la recouvre pendant ce temps — puis s'ouvre dessus.
 *
 * L'ancienne racine affichait l'écran de lancement *à la place* de
 * l'application tant que la session n'était pas décidée, et retirait l'écran
 * natif au premier rendu. Comme la décision arrive en quelques dizaines de
 * millisecondes (trousseau et instantané locaux), l'animation était déjà
 * finie ou démontée quand l'écran natif disparaissait : l'artisan ne voyait
 * rien. Ici la séquence tient un minimum perçu, couvre le démarrage réel, et
 * n'est jouée qu'une fois par processus — jamais au retour d'une autre
 * application.
 */
function RootNavigator() {
  const { status, offline, outage } = useAuth();
  const [seenOnboarding, setSeenOnboarding] = React.useState<boolean | null>(null);
  const [launching, setLaunching] = React.useState(() => claimLaunch());
  const [repeat, setRepeat] = React.useState(false);
  const startupAt = React.useRef<number | null>(null);
  const startupRecorded = React.useRef(false);

  React.useEffect(() => {
    startupAt.current ??= Date.now();
    void hasSeenOnboarding().then(setSeenOnboarding).catch(() => setSeenOnboarding(false));
    void hasLaunchedBefore().then((seen) => {
      setRepeat(seen);
      if (!seen) void markLaunched();
    });
  }, []);

  const decided = status !== 'chargement' && seenOnboarding !== null;
  // Une panne sans session locale est aussi une décision : l'écran de panne
  // est prêt derrière la séquence, qui s'ouvre dessus au lieu d'attendre.
  const ready = decided || (offline && seenOnboarding !== null);

  React.useEffect(() => {
    if (ready && !startupRecorded.current) {
      startupRecorded.current = true;
      recordDiagnostic({ area: 'startup', durationMs: Date.now() - (startupAt.current ?? Date.now()), code: outage ? `ROOT_DECIDED_${outage.toUpperCase()}` : 'ROOT_DECIDED', category: 'startup' });
    }
  }, [ready, outage]);

  // Sans séquence (rechargement à chaud en développement), l'écran natif est
  // retiré ici pour ne jamais rester bloqué.
  React.useEffect(() => {
    if (!launching) {
      setStatusBarStyle('dark');
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [launching]);

  const finishLaunch = React.useCallback(() => setLaunching(false), []);

  return (
    <View style={{ flex: 1, backgroundColor: ready ? colors.surface : BRAND_TOP }}>
      {ready ? <Navigation seenOnboarding={seenOnboarding ?? false} /> : null}
      {launching ? <LaunchOverlay ready={ready} repeat={repeat} onFinished={finishLaunch} /> : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <RootNavigator />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
