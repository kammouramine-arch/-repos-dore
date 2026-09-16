import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { LogoMark } from '@/components/logo';
import { useAuth } from '@/lib/auth';
import { clearWorkshopReady } from '@/lib/first-run';
import { useMobileLocale } from '@/lib/i18n';
import { useReducedMotion } from '@/components/motion';
import { colors, radius, shadows, spacing } from '@/theme';

/**
 * « Votre atelier est prêt. »
 *
 * Le moment qui manquait. Jusqu'ici, la configuration terminée déposait
 * l'artisan sur un accueil vide, sans lui dire par où commencer ni pourquoi
 * il avait installé cette application plutôt qu'une autre. Cet écran répond
 * aux deux : il nomme la promesse — on parle, le devis se prépare — et il
 * offre exactement deux chemins.
 *
 * Deux, pas trois. Une page de fin de configuration qui propose cinq
 * destinations ne décide rien et renvoie le choix à quelqu'un qui n'a pas
 * encore assez d'éléments pour le faire.
 */

/**
 * Le fond.
 *
 * La surface de marque ordinaire descend du bleu vers le blanc : elle sert
 * d'en-tête, sous lequel le contenu clair reprend. Ici l'écran est entier et
 * sombre du haut au bas — un bouton blanc doit ressortir aussi bien en haut
 * qu'en bas. Le dégradé reste donc dans les bleus profonds, avec une seule
 * éclaircie derrière la marque.
 */
function Backdrop() {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <SvgLinearGradient id="pret-fond" x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor="#14245A" />
          <Stop offset="0.45" stopColor="#1E3A9E" />
          <Stop offset="1" stopColor="#0C1739" />
        </SvgLinearGradient>
        <RadialGradient id="pret-halo" cx="0.5" cy="0.34" r="0.55">
          <Stop offset="0" stopColor="#6F8CFF" stopOpacity="0.38" />
          <Stop offset="0.6" stopColor="#6F8CFF" stopOpacity="0.1" />
          <Stop offset="1" stopColor="#6F8CFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#pret-fond)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#pret-halo)" />
    </Svg>
  );
}

/** Apparition en cascade, pilotée par des valeurs partagées. */
function Rise({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  React.useEffect(() => {
    if (reduced) { progress.value = 1; return; }
    progress.value = withDelay(delay, withTiming(1, { duration: 520 }));
  }, [delay, progress, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 16 }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function PretScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const en = useMobileLocale() === 'en';
  const reduced = useReducedMotion();
  const halo = useSharedValue(reduced ? 1 : 0.7);

  const business = session?.organization.name?.trim();

  React.useEffect(() => {
    // Une réussite se fête une fois, discrètement.
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    if (!reduced) halo.value = withSpring(1, { damping: 12, stiffness: 120, mass: 0.9 });
  }, [halo, reduced]);

  const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: halo.value }], opacity: halo.value }));

  /**
   * Quel que soit le chemin choisi, l'écran ne revient pas.
   *
   * `replace` et non `push` : rien derrière, donc aucun retour possible vers
   * un écran de félicitations dont le moment est passé. Le chemin vocal pose
   * l'accueil sous la pile, puis ouvre l'écran de devis en dictée — revenir
   * en arrière ramène donc à l'atelier, pas ici.
   */
  const leave = (voice: boolean) => {
    if (session?.user.id) clearWorkshopReady(session.user.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    router.replace('/(app)');
    if (voice) router.push('/devis/nouveau?dicter=1');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.accentDeep }}>
      <Backdrop />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between', paddingBottom: spacing.xl }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.xl }}>
            <Animated.View style={haloStyle}>
              <View
                style={{
                  width: 108,
                  height: 108,
                  borderRadius: 54,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LogoMark size={46} inverse />
              </View>
            </Animated.View>

            <Rise delay={160}>
              <Text
                accessibilityRole="header"
                style={{ fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1.1, color: colors.white, textAlign: 'center' }}
              >
                {en ? 'Your workshop is ready.' : 'Votre atelier est prêt.'}
              </Text>
            </Rise>

            <Rise delay={260}>
              <Text style={{ fontSize: 16.5, lineHeight: 25, color: 'rgba(255,255,255,0.82)', textAlign: 'center', paddingHorizontal: spacing.md }}>
                {business
                  ? (en
                    ? `${business} is set up. The quickest way to start is to describe a job out loud — DEVISERA writes it up.`
                    : `${business} est configurée. Le plus simple pour commencer : décrivez un chantier à voix haute, DEVISERA le met en forme.`)
                  : (en
                    ? 'The quickest way to start is to describe a job out loud — DEVISERA writes it up.'
                    : 'Le plus simple pour commencer : décrivez un chantier à voix haute, DEVISERA le met en forme.')}
              </Text>
            </Rise>
          </View>

          <View style={{ gap: spacing.md }}>
            <Rise delay={380}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={en ? 'Create my first quote by voice' : 'Créer mon premier devis à la voix'}
                onPress={() => leave(true)}
                style={({ pressed }) => ({
                  minHeight: 58,
                  borderRadius: radius.lg,
                  backgroundColor: pressed ? colors.surface : colors.white,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.md,
                  paddingHorizontal: spacing.lg,
                  ...shadows.floating,
                })}
              >
                <Ionicons name="mic" size={21} color={colors.accent} />
                <Text style={{ fontSize: 16.5, fontWeight: '700', color: colors.accent, textAlign: 'center' }}>
                  {en ? 'Create my first quote by voice' : 'Créer mon premier devis à la voix'}
                </Text>
              </Pressable>
            </Rise>

            <Rise delay={460}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={en ? 'Explore DEVISERA' : 'Explorer DEVISERA'}
                onPress={() => leave(false)}
                style={({ pressed }) => ({
                  minHeight: 52,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                  {en ? 'Explore DEVISERA' : 'Explorer DEVISERA'}
                </Text>
              </Pressable>
            </Rise>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
