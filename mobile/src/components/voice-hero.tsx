import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from '@/theme';
import { useReducedMotion } from './motion';

/**
 * Le geste central de DEVISERA : appuyer, parler, obtenir un devis.
 *
 * L'accueil posait autrefois six compteurs devant un artisan qui voulait
 * chiffrer un chantier. Le micro est maintenant la première chose que l'on
 * voit et la plus grande cible de l'écran ; la saisie manuelle reste
 * disponible, en dessous, comme un recours et non comme un concurrent.
 *
 * Honnêteté des animations : la forme d'onde bouge quand le moteur détecte
 * réellement de la parole (`hearing`) et se repose quand il n'entend rien.
 * Aucune barre ne prétend mesurer un niveau sonore — iOS n'en expose pas — et
 * rien ne s'agite pendant qu'il ne se passe rien.
 */

export type VoiceHeroState = 'idle' | 'starting' | 'listening' | 'thinking';

const BAR_COUNT = 7;
/** Hauteurs relatives au repos : une onde lisible plutôt qu'un égaliseur. */
const BAR_SHAPE = [0.34, 0.58, 0.86, 1, 0.86, 0.58, 0.34];

function Bar({
  index,
  active,
  hearing,
  reduced,
  color,
}: {
  index: number;
  active: boolean;
  hearing: boolean;
  reduced: boolean;
  color: string;
}) {
  const scale = useSharedValue(0.22);

  React.useEffect(() => {
    cancelAnimation(scale);
    if (!active || reduced) {
      scale.set(withTiming(0.22, { duration: 220 }));
      return;
    }
    if (!hearing) {
      // Micro ouvert mais silence : une respiration lente et régulière, qui
      // dit « j'écoute » sans simuler une voix qui n'existe pas.
      scale.set(
        withRepeat(
          withSequence(
            withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.2, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        ),
      );
      return;
    }
    const peak = BAR_SHAPE[index] ?? 0.6;
    scale.set(
      withDelay(
        index * 55,
        withRepeat(
          withSequence(
            withTiming(peak, { duration: 260 + index * 22, easing: Easing.out(Easing.quad) }),
            withTiming(peak * 0.38, { duration: 300 + index * 18, easing: Easing.in(Easing.quad) }),
          ),
          -1,
          false,
        ),
      ),
    );
  }, [active, hearing, index, reduced, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.get() }] }));
  return (
    <Animated.View
      style={[
        { width: 5, height: 56, borderRadius: 3, backgroundColor: color },
        style,
      ]}
    />
  );
}

/** Forme d'onde : sept barres, animées seulement quand il se passe quelque chose. */
export function VoiceWave({
  active,
  hearing,
  color = colors.white,
}: {
  active: boolean;
  hearing: boolean;
  color?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 56 }}
    >
      {Array.from({ length: BAR_COUNT }).map((_, index) => (
        <Bar key={index} index={index} active={active} hearing={hearing} reduced={reduced} color={color} />
      ))}
    </View>
  );
}

/** Minuterie d'enregistrement, en chiffres à chasse fixe pour ne pas sautiller. */
export function RecordingTimer({ elapsedMs, color = colors.white }: { elapsedMs: number; color?: string }) {
  const total = Math.floor(elapsedMs / 1000);
  const label = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  return (
    <Text
      accessibilityLabel={`${total} secondes`}
      style={{ fontSize: 15, fontWeight: '600', color, fontVariant: ['tabular-nums'], letterSpacing: 0.4 }}
    >
      {label}
    </Text>
  );
}

/**
 * Bouton micro de l'accueil.
 *
 * Une seule cible, très grande, avec un halo qui ne s'allume qu'à l'écoute.
 * Le retour haptique marque le départ et l'arrêt : sur un chantier bruyant,
 * c'est souvent le seul signal perceptible.
 */
export function VoiceButton({
  state,
  hearing,
  onPress,
  size = 96,
  disabled,
}: {
  state: VoiceHeroState;
  hearing: boolean;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
}) {
  const reduced = useReducedMotion();
  const listening = state === 'listening';
  const busy = state === 'starting' || state === 'thinking';
  const press = useSharedValue(1);
  const halo = useSharedValue(0);

  React.useEffect(() => {
    cancelAnimation(halo);
    if (!listening || reduced) {
      halo.set(withTiming(0, { duration: 240 }));
      return;
    }
    halo.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
  }, [halo, listening, reduced]);

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.get() }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: (1 - halo.get()) * 0.4,
    transform: [{ scale: 1 + halo.get() * 0.5 }],
  }));

  const label = listening ? 'Arrêter la dictée' : 'Décrire le chantier à la voix';

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {listening && !reduced ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.white,
            },
            haloStyle,
          ]}
        />
      ) : null}
      <Animated.View style={buttonStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ busy, disabled: Boolean(disabled) }}
          disabled={disabled || busy}
          hitSlop={12}
          onPressIn={() => press.set(withSpring(0.94, { damping: 20, stiffness: 400, mass: 0.6 }))}
          onPressOut={() => press.set(withSpring(1, { damping: 18, stiffness: 320, mass: 0.6 }))}
          onPress={() => {
            void Haptics.impactAsync(
              listening ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
            ).catch(() => undefined);
            onPress();
          }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: listening ? colors.white : colors.accentDeep,
            borderWidth: listening ? 0 : 2,
            borderColor: 'rgba(255,255,255,0.35)',
            opacity: disabled ? 0.5 : 1,
            // Ombre portée douce : le bouton se détache du fond de marque.
            shadowColor: '#0B1220',
            shadowOpacity: 0.28,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          }}
        >
          {hearing && listening ? (
            <VoiceWave active hearing color={colors.accentDeep} />
          ) : (
            <Ionicons
              name={listening ? 'stop' : 'mic'}
              size={listening ? 30 : 38}
              color={listening ? colors.accentDeep : colors.white}
            />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * Bloc complet posé en haut de l'accueil : la question, le micro, l'état.
 *
 * Les états sont explicites et nommés — aucun écran mort, aucune animation
 * qui tourne pendant qu'il ne se passe rien.
 */
export function VoiceHero({
  state,
  hearing,
  elapsedMs,
  partial,
  onToggle,
  onCancel,
  onManual,
  en,
  disabled,
}: {
  state: VoiceHeroState;
  hearing: boolean;
  elapsedMs: number;
  partial: string;
  onToggle: () => void;
  onCancel: () => void;
  onManual: () => void;
  en: boolean;
  disabled?: boolean;
}) {
  const listening = state === 'listening';
  const thinking = state === 'thinking';

  const prompt = en ? 'What are we quoting today?' : 'Que voulez-vous chiffrer aujourd’hui ?';
  const hint = en ? 'Just describe the job out loud.' : 'Décrivez simplement le chantier.';

  const statusLine = thinking
    ? en
      ? 'Preparing your quote…'
      : 'Préparation de votre devis…'
    : listening
      ? hearing
        ? en
          ? 'I’m listening.'
          : 'Je vous écoute.'
        : en
          ? 'Go ahead, I’m recording.'
          : 'Allez-y, j’enregistre.'
      : state === 'starting'
        ? en
          ? 'Opening the microphone…'
          : 'Ouverture du micro…'
        : hint;

  return (
    <View style={{ alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.lg }}>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 26,
          lineHeight: 32,
          fontWeight: '700',
          letterSpacing: -0.8,
          color: colors.white,
          textAlign: 'center',
          maxWidth: 320,
        }}
      >
        {prompt}
      </Text>

      <VoiceButton state={state} hearing={hearing} onPress={onToggle} disabled={disabled} />

      <View style={{ alignItems: 'center', gap: 8, minHeight: 46 }}>
        {listening ? <RecordingTimer elapsedMs={elapsedMs} /> : null}
        <Text
          style={{
            fontSize: 15,
            lineHeight: 21,
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            maxWidth: 300,
          }}
        >
          {statusLine}
        </Text>
      </View>

      {/* Le texte reconnu s'affiche pendant que l'artisan parle : c'est la
          preuve immédiate qu'il est entendu, et l'occasion de se corriger. */}
      {listening && partial ? (
        <View
          style={{
            alignSelf: 'stretch',
            backgroundColor: 'rgba(255,255,255,0.16)',
            borderRadius: radius.lg,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          }}
        >
          <Text numberOfLines={4} style={{ fontSize: 15, lineHeight: 22, color: colors.white }}>
            {partial}
          </Text>
        </View>
      ) : null}

      {listening ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={en ? 'Cancel dictation' : 'Annuler la dictée'}
          onPress={() => {
            void Haptics.selectionAsync().catch(() => undefined);
            onCancel();
          }}
          hitSlop={10}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.86)' }}>
            {en ? 'Cancel' : 'Annuler'}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={en ? 'Create a quote manually' : 'Créer un devis manuellement'}
          onPress={onManual}
          disabled={thinking}
          hitSlop={10}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: thinking ? 0.5 : 1 }}
        >
          <Ionicons name="create-outline" size={17} color="rgba(255,255,255,0.86)" />
          <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.86)' }}>
            {en ? 'Create manually' : 'Créer manuellement'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
