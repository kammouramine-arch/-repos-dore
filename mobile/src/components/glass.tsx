import * as React from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { colors } from '@/theme';

/**
 * Surfaces en verre.
 *
 * iOS 26 sait faire du vrai verre : `UIGlassEffect` réfracte ce qui passe
 * dessous, épaissit ses bords sur la lumière et fusionne les formes voisines
 * quand elles se rapprochent. `expo-glass-effect` expose exactement cette API
 * native ; c'est elle qu'on utilise quand l'appareil l'a.
 *
 * Trois niveaux, du meilleur au plus sûr :
 *
 * 1. **Verre natif** (iOS 26+) — `GlassView`, avec fusion des formes via
 *    `GlassContainer`.
 * 2. **Flou natif** (iOS plus anciens) — `BlurView`, matériau système. Ce
 *    n'est pas du verre, mais c'est du flou réel, calculé par le système.
 * 3. **Surface opaque** — Android, web, et surtout « Réduire la
 *    transparence ». Là, un fond translucide n'est pas un choix esthétique :
 *    c'est un réglage d'accessibilité qu'on doit respecter.
 *
 * Le troisième niveau n'est pas un pis-aller honteux : un rectangle
 * semi-transparent avec une bordure claire, c'est du faux verre, et c'est
 * précisément ce qu'il ne faut pas faire.
 */

/** L'utilisateur a-t-il demandé « Réduire la transparence » ? */
export function useReducedTransparency(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((value) => { if (alive) setReduced(Boolean(value)); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', (value) => setReduced(Boolean(value)));
    return () => { alive = false; subscription.remove(); };
  }, []);
  return reduced;
}

export type GlassKind = 'liquid' | 'blur' | 'solid';

/**
 * Le meilleur matériau réellement disponible ici et maintenant.
 *
 * `isLiquidGlassAvailable()` interroge le système, pas la version du SDK :
 * un iPhone sous iOS 18 renvoie faux même si l'application est compilée avec
 * le SDK 26.
 */
export function useGlassKind(): GlassKind {
  const reduced = useReducedTransparency();
  return React.useMemo(() => {
    if (reduced || Platform.OS !== 'ios') return 'solid';
    return isLiquidGlassAvailable() ? 'liquid' : 'blur';
  }, [reduced]);
}

export interface GlassSurfaceProps extends ViewProps {
  /** Rayon des coins. Le verre natif le lit sur le style, pas sur une prop. */
  radius?: number;
  /** `clear` laisse passer davantage ; `regular` reste lisible sur tout fond. */
  effect?: 'clear' | 'regular';
  /** Teinte de marque appliquée au verre. Discrète : le verre doit rester du verre. */
  tint?: string;
  /** Réagit au toucher (déformation native du verre). */
  interactive?: boolean;
  /** Couleur de la surface opaque quand ni verre ni flou ne sont disponibles. */
  solidColor?: string;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Une surface flottante en verre.
 *
 * Elle ne dessine jamais de bordure claire simulant un reflet : sur du vrai
 * verre, le système la produit lui-même, et par-dessus elle se verrait.
 */
export function GlassSurface({
  radius = 28,
  effect = 'regular',
  tint,
  interactive = false,
  solidColor = colors.canvas,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const kind = useGlassKind();
  const shape: ViewStyle = { borderRadius: radius, overflow: 'hidden' };

  if (kind === 'liquid') {
    return (
      <GlassView
        {...rest}
        glassEffectStyle={effect}
        tintColor={tint}
        isInteractive={interactive}
        style={[shape, style]}
      >
        {children}
      </GlassView>
    );
  }

  if (kind === 'blur') {
    return (
      <View {...rest} style={[shape, style]}>
        <BlurView
          intensity={effect === 'clear' ? 42 : 68}
          tint="systemChromeMaterialLight"
          style={StyleSheet.absoluteFill}
        />
        {/* Un voile très léger : sans lui, le texte sombre passe mal sur une
            photo claire. Il reste sous le seuil où le flou cesse de se voir. */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.28)' }]} />
        {children}
      </View>
    );
  }

  return (
    <View {...rest} style={[shape, { backgroundColor: solidColor }, style]}>
      {children}
    </View>
  );
}

/**
 * Regroupe plusieurs surfaces de verre.
 *
 * `spacing` est la distance en dessous de laquelle deux formes fusionnent,
 * comme deux gouttes : c'est le mouvement qui donne au verre d'iOS 26 son
 * caractère. Sans verre natif, le conteneur disparaît et ne laisse que ses
 * enfants — aucune imitation.
 */
export function GlassGroup({
  spacing = 20,
  style,
  children,
  ...rest
}: ViewProps & { spacing?: number; style?: ViewStyle | ViewStyle[] }) {
  const kind = useGlassKind();
  if (kind !== 'liquid') return <View {...rest} style={style}>{children}</View>;
  return <GlassContainer {...rest} spacing={spacing} style={style}>{children}</GlassContainer>;
}
