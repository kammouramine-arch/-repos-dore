import * as React from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { setStatusBarStyle } from 'expo-status-bar';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LogoMark } from '@/components/logo';
import { colors, typography } from '@/theme';
import { BRAND_TOP } from '@/theme/gradient';
import { recordDiagnostic } from '@/lib/diagnostics';
import { useMobileLocale } from '@/lib/i18n';
import { LAUNCH, holdFor, revealDurationFor, shouldShowWaitingHint } from '@/lib/launch-timing';

/** Taille du monogramme, identique à `imageWidth` de l'écran natif (app.config.ts). */
export const LAUNCH_MARK_SIZE = 96;

/**
 * Séquence de lancement.
 *
 * Elle se superpose à l'application déjà montée et ne la remplace pas : le
 * démarrage réel (trousseau, session, préférences) se fait derrière. L'écran
 * natif est bleu avec le même monogramme au même endroit ; il n'est masqué
 * qu'une fois cette vue peinte, pour qu'aucune image blanche ne s'intercale.
 *
 * 1. la marque se pose — léger ressort, halo qui s'ouvre ;
 * 2. le nom puis la promesse apparaissent sous le monogramme ;
 * 3. quand le démarrage est prêt et le temps minimal écoulé, la surface bleue
 *    se referme en cercle sur le logo et découvre l'application, dont le haut
 *    est du même bleu : la surface devient l'en-tête.
 */
export function LaunchOverlay({
  ready,
  repeat,
  onFinished,
}: {
  /** Vrai dès que l'application derrière sait quoi afficher. */
  ready: boolean;
  /** Processus relancé après un premier lancement : séquence plus vive. */
  repeat: boolean;
  onFinished: () => void;
}) {
  const locale = useMobileLocale();
  const { width, height } = useWindowDimensions();
  const [reducedMotion, setReducedMotion] = React.useState<boolean | null>(null);
  const [waiting, setWaiting] = React.useState(false);
  // Posé au premier effet, jamais pendant le rendu : l'écart avec la première
  // image est de l'ordre de la milliseconde.
  const startedAt = React.useRef<number | null>(null);
  const since = React.useCallback(() => (startedAt.current ??= Date.now()), []);
  const painted = React.useRef(false);
  const revealing = React.useRef(false);

  const [markScale] = React.useState(() => new Animated.Value(1));
  const [markOpacity] = React.useState(() => new Animated.Value(1));
  const [haloScale] = React.useState(() => new Animated.Value(0.7));
  const [haloOpacity] = React.useState(() => new Animated.Value(0));
  const [glowOpacity] = React.useState(() => new Animated.Value(0));
  const [wordOpacity] = React.useState(() => new Animated.Value(0));
  const [wordRise] = React.useState(() => new Animated.Value(10));
  const [tagOpacity] = React.useState(() => new Animated.Value(0));
  const [surfaceScale] = React.useState(() => new Animated.Value(1));
  const [overlayOpacity] = React.useState(() => new Animated.Value(1));
  const [hintOpacity] = React.useState(() => new Animated.Value(0));

  // Le cercle couvre l'écran à l'échelle 1 (diagonale + marge) et se referme
  // sur le centre, là où se tient le monogramme.
  const diameter = Math.ceil(Math.hypot(width, height)) + 8;

  React.useEffect(() => {
    since();
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => setReducedMotion(false));
    setStatusBarStyle('light');
  }, [since]);

  // Entrée : jouée une fois le réglage d'accessibilité connu.
  React.useEffect(() => {
    if (reducedMotion === null) return;
    if (reducedMotion) {
      wordOpacity.setValue(1);
      wordRise.setValue(0);
      tagOpacity.setValue(1);
      glowOpacity.setValue(1);
      return;
    }
    const entrance = Animated.parallel([
      Animated.sequence([
        Animated.spring(markScale, { toValue: 1.12, damping: 9, stiffness: 260, mass: 0.6, useNativeDriver: true }),
        Animated.spring(markScale, { toValue: 1, damping: 14, stiffness: 220, mass: 0.6, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(haloOpacity, { toValue: 0.55, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(haloOpacity, { toValue: 0, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(haloScale, { toValue: 2.1, duration: 740, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(wordOpacity, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(wordRise, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(380),
        Animated.timing(tagOpacity, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, [reducedMotion, since, markScale, haloOpacity, haloScale, glowOpacity, wordOpacity, wordRise, tagOpacity]);

  // Indication d'attente si le démarrage réel tarde : jamais d'écran muet.
  React.useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => {
      if (shouldShowWaitingHint(Date.now(), since(), null)) {
        setWaiting(true);
        Animated.timing(hintOpacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      }
    }, LAUNCH.waitingHintMs);
    return () => clearTimeout(timer);
  }, [ready, hintOpacity, since]);

  // Révélation : au plus tard des deux — temps minimal perçu, démarrage prêt.
  React.useEffect(() => {
    if (!ready || reducedMotion === null || revealing.current) return;
    const hold = holdFor({ repeat, reducedMotion });
    const delay = Math.max(0, since() + hold - Date.now());
    const timer = setTimeout(() => {
      revealing.current = true;
      const duration = revealDurationFor({ reducedMotion });
      const finish = () => {
        recordDiagnostic({ area: 'startup', durationMs: Date.now() - since(), code: repeat ? 'LAUNCH_REVEALED_REPEAT' : 'LAUNCH_REVEALED', category: 'startup' });
        onFinished();
      };
      if (reducedMotion) {
        Animated.timing(overlayOpacity, { toValue: 0, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(finish);
        return;
      }
      Animated.parallel([
        Animated.timing(surfaceScale, { toValue: 0, duration, easing: Easing.bezier(0.7, 0, 0.3, 1), useNativeDriver: true }),
        Animated.timing(wordOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(tagOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(hintOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(Math.round(duration * 0.35)),
          Animated.parallel([
            Animated.timing(markScale, { toValue: 0.6, duration: Math.round(duration * 0.65), easing: Easing.in(Easing.cubic), useNativeDriver: true }),
            Animated.timing(markOpacity, { toValue: 0, duration: Math.round(duration * 0.55), easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        ]),
      ]).start(finish);
    }, delay);
    return () => clearTimeout(timer);
  }, [ready, repeat, reducedMotion, onFinished, since, surfaceScale, wordOpacity, tagOpacity, hintOpacity, markScale, markOpacity, overlayOpacity]);

  // L'écran natif n'est retiré qu'après la première peinture de cette vue.
  const onLayout = React.useCallback(() => {
    if (painted.current) return;
    since();
    painted.current = true;
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => undefined);
      recordDiagnostic({ area: 'startup', durationMs: Date.now() - since(), code: 'NATIVE_SPLASH_RELEASED', category: 'startup' });
    });
  }, [since]);

  const english = locale === 'en';

  return (
    <Animated.View pointerEvents="none" onLayout={onLayout} style={[StyleSheet.absoluteFill, styles.root, { opacity: overlayOpacity }]}>
      <Animated.View
        style={{
          position: 'absolute',
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          left: (width - diameter) / 2,
          top: (height - diameter) / 2,
          backgroundColor: BRAND_TOP,
          overflow: 'hidden',
          transform: [{ scale: surfaceScale }],
        }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <Defs>
              <RadialGradient id="devisera-launch-glow" cx="50" cy="46" r="42" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#5C79F0" stopOpacity="1" />
                <Stop offset="0.6" stopColor={BRAND_TOP} stopOpacity="1" />
                <Stop offset="1" stopColor="#2646D6" stopOpacity="1" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="80" fill="url(#devisera-launch-glow)" />
          </Svg>
        </Animated.View>
      </Animated.View>

      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Animated.View
          style={{
            position: 'absolute',
            width: LAUNCH_MARK_SIZE * 1.9,
            height: LAUNCH_MARK_SIZE * 1.9,
            borderRadius: LAUNCH_MARK_SIZE * 0.95,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.9)',
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          }}
        />
        <Animated.View style={{ opacity: markOpacity, transform: [{ scale: markScale }] }}>
          <LogoMark size={LAUNCH_MARK_SIZE} inverse stroke={1.92} />
        </Animated.View>
        <View style={{ position: 'absolute', top: '50%', marginTop: LAUNCH_MARK_SIZE / 2 + 22, alignItems: 'center', gap: 8 }}>
          <Animated.Text style={[styles.word, { opacity: wordOpacity, transform: [{ translateY: wordRise }] }]}>DEVISERA</Animated.Text>
          <Animated.Text style={[typography.small, styles.tagline, { opacity: tagOpacity }]}>
            {english ? 'AI-powered quotes for your business' : 'L’IA qui transforme votre travail en devis'}
          </Animated.Text>
          {waiting ? (
            <Animated.Text style={[typography.caption, styles.hint, { opacity: hintOpacity }]}>
              {english ? 'Loading your workspace…' : 'Chargement de votre atelier…'}
            </Animated.Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: 'transparent', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  word: { color: colors.white, fontSize: 26, fontWeight: '700', letterSpacing: -0.6 },
  tagline: { color: 'rgba(255,255,255,0.86)', letterSpacing: 0.1 },
  hint: { color: 'rgba(255,255,255,0.7)', marginTop: 18, letterSpacing: 0.2, fontWeight: '500' },
});
