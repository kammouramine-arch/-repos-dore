import * as React from 'react';
import { Animated as RNAnimated, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing, typography } from '@/theme';
import { Enter, useReducedMotion, useTouchMotion } from './motion';

/**
 * Le héros : l'identité posée sur le bleu, et ce qui l'accompagne.
 *
 * ## Ce qu'il remplace
 *
 * L'accueil affichait trois lignes de texte empilées au milieu d'une grande
 * surface bleue — un surtitre, une salutation, une phrase — puis plus rien
 * pendant deux cents points. On ne lisait pas une composition, on lisait « du
 * texte posé sur du bleu ». Mon compte faisait la même chose avec un portrait.
 *
 * Trois pièces remplacent cela, et elles ont chacune un travail :
 *
 * - `HeroIdentity` groupe la marque (ou le portrait) et les mots qui disent
 *   *de qui* et *de quoi* il s'agit, sur **une** rangée. Un bloc, pas trois
 *   lignes indépendantes.
 * - `HeroStatus` transforme la phrase d'état en objet qu'on peut toucher :
 *   « 3 devis attendent une réponse » n'était qu'une constatation, c'est
 *   maintenant le chemin vers les devis concernés.
 * - `HeroLabel` écrit l'intitulé de la section suivante **en blanc, sur le
 *   bleu**, ce qui permet au contenu de commencer immédiatement après plutôt
 *   qu'après un fondu réservé.
 *
 * ## Le mouvement
 *
 * Le héros se replie au défilement : il remonte un peu plus vite que la page,
 * la marque se réduit, l'état s'efface. L'effet cherché n'est pas qu'on
 * remarque une animation, mais que l'écran paraisse se réorganiser de lui-même
 * pour laisser la place au contenu.
 *
 * Tout est lu depuis une valeur partagée sur le fil d'interface : aucune image
 * ne passe par JavaScript, et le défilement n'est jamais ralenti. En
 * mouvement réduit, il ne reste que la mise en page — qui doit tenir seule,
 * c'est la règle : on corrige l'espace d'abord, on anime ensuite.
 */

/** Distance de défilement sur laquelle le héros se replie complètement. */
const RANGE = 170;

/** Ce que le repli retire au plus : quelques points, jamais un saut. */
const LIFT = 16;
const MARK_SCALE = 0.88;

function useFold(scrollY?: SharedValue<number>) {
  const reduced = useReducedMotion();
  const active = !reduced && scrollY != null;

  const block = useAnimatedStyle(() => {
    if (!active || !scrollY) return {};
    const y = Math.max(0, scrollY.value);
    return { transform: [{ translateY: interpolate(y, [0, RANGE], [0, -LIFT], 'clamp') }] };
  });

  const mark = useAnimatedStyle(() => {
    if (!active || !scrollY) return {};
    const y = Math.max(0, scrollY.value);
    return { transform: [{ scale: interpolate(y, [0, RANGE], [1, MARK_SCALE], 'clamp') }] };
  });

  const secondary = useAnimatedStyle(() => {
    if (!active || !scrollY) return {};
    const y = Math.max(0, scrollY.value);
    return { opacity: interpolate(y, [0, RANGE], [1, 0.28], 'clamp') };
  });

  return { block, mark, secondary };
}

export interface HeroIdentityProps {
  /** La position de défilement de l'écran, pour le repli. */
  scrollY?: SharedValue<number>;
  /** La marque, ou le portrait de l'artisan. Rendu à gauche. */
  mark: React.ReactNode;
  /** Surtitre : où l'on est, ou à qui l'on parle. */
  eyebrow?: string | null;
  /** Le nom qui domine : l'atelier sur l'accueil, la personne sur le compte. */
  title: string;
  /** Une seule ligne de plus, au maximum. */
  subtitle?: string | null;
  /** Corps du titre. 26 sur l'accueil, 23 sur le compte, qui est plus dense. */
  titleSize?: number;
  /** Rendu sous l'identité : pastilles d'état, par exemple. */
  children?: React.ReactNode;
}

export function HeroIdentity({ scrollY, mark, eyebrow, title, subtitle, titleSize = 26, children }: HeroIdentityProps) {
  const fold = useFold(scrollY);
  return (
    <Animated.View style={[{ gap: spacing.md }, fold.block]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <Animated.View style={fold.mark}>
          <Enter distance={6}>{mark}</Enter>
        </Animated.View>
        <Enter delay={60} distance={8} style={{ flex: 1, gap: 2 }}>
          {eyebrow ? (
            <Animated.Text
              numberOfLines={1}
              style={[typography.caption, { color: 'rgba(255,255,255,0.76)', textTransform: 'uppercase', letterSpacing: 1.1 }, fold.secondary]}
            >
              {eyebrow}
            </Animated.Text>
          ) : null}
          <Text
            numberOfLines={1}
            accessibilityRole="header"
            style={[typography.title, { color: colors.white, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.2), letterSpacing: -0.7 }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Animated.Text numberOfLines={1} style={[typography.body, { color: 'rgba(255,255,255,0.84)', fontSize: 14.5 }, fold.secondary]}>
              {subtitle}
            </Animated.Text>
          ) : null}
        </Enter>
      </View>
      {children}
    </Animated.View>
  );
}

export interface HeroStatusProps {
  scrollY?: SharedValue<number>;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Fourni, la bande devient le chemin vers ce qu'elle annonce. */
  onPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * La bande d'état : ce qui attend l'artisan, et le moyen d'y aller.
 *
 * Une phrase qui constate un retard sans permettre d'agir dessus est un
 * reproche. Celle-ci se touche.
 */
export function HeroStatus({ scrollY, icon, label, onPress, accessibilityLabel }: HeroStatusProps) {
  const fold = useFold(scrollY);
  /*
   * Le ressort de pression vient d'`Animated` de React Native : c'est la
   * bibliothèque de `useTouchMotion`, et on ne mélange pas deux moteurs
   * d'animation dans une même valeur. Le repli, lui, est du Reanimated.
   */
  const touch = useTouchMotion(0.985);
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 11,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.3)',
      }}
    >
      <Ionicons name={icon} size={17} color={colors.white} />
      <Text numberOfLines={2} style={[typography.body, { flex: 1, color: colors.white, fontSize: 14.5, lineHeight: 19, fontWeight: '600' }]}>
        {label}
      </Text>
      {onPress ? <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" /> : null}
    </View>
  );
  return (
    <Animated.View style={fold.secondary}>
      <Enter delay={120} distance={8}>
        {onPress ? (
          <RNAnimated.View style={{ transform: [{ scale: touch.scale }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel ?? label}
              onPressIn={touch.pressIn}
              onPressOut={touch.pressOut}
              onPress={() => { touch.pressOut(); onPress(); }}
            >
              {body}
            </Pressable>
          </RNAnimated.View>
        ) : (
          body
        )}
      </Enter>
    </Animated.View>
  );
}

/**
 * L'intitulé de la section suivante, écrit sur le bleu.
 *
 * C'est la pièce qui permet au contenu de commencer tout de suite : tant que
 * l'intitulé était gris et attendait la couleur de page, il fallait réserver
 * un fondu avant lui. En blanc sur le bleu, il appartient au héros, et la
 * première carte vient juste après.
 */
export function HeroLabel({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <Enter delay={170} distance={6}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase', letterSpacing: 1.1 }]}>{title}</Text>
        {action ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={action.onPress}>
            <Text style={[typography.small, { color: colors.white, fontWeight: '600' }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </Enter>
  );
}

/**
 * La marque DEVISERA en tête d'écran.
 *
 * Elle flottait en haut à droite, détachée de tout, et ne voulait rien dire.
 * Elle est maintenant le point d'appui de l'identité, à gauche, à la place où
 * l'œil commence — ce qui lui donne enfin un rôle : signer l'atelier.
 */
export function HeroMark({ children, size = 52 }: { children: React.ReactNode; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.34),
        backgroundColor: 'rgba(255,255,255,0.17)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}
