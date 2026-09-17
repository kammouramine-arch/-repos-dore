import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { BRAND_BOTTOM, BRAND_GRADIENT, BRAND_HEADER_GRADIENT } from '@/theme/gradient';

/**
 * Surface de marque : bleu saturé en haut, qui se dissout jusqu'au blanc.
 *
 * Le composant remplit son conteneur ; c'est l'écran appelant qui décide de
 * la hauteur du fondu (voir `GRADIENT_SPAN`). Un halo radial discret en haut à
 * droite donne de la profondeur au bleu, comme une lumière, sans texture
 * coûteuse. Aucune image : le rendu est identique à toutes les densités.
 */
export function PremiumGradient({
  children,
  style,
  glow = true,
  bottom = BRAND_BOTTOM,
  header = false,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  /**
   * Couleur d'arrivée du fondu.
   *
   * Le dégradé finit en blanc par défaut. Quand l'écran qui le porte repose
   * sur la surface claire plutôt que sur du blanc, il faut lui donner cette
   * couleur : sinon le bas du bandeau s'arrête une nuance au-dessus du fond
   * et dessine une ligne là où il ne devrait rien y avoir.
   */
  bottom?: string;
  /** Bandeau d'en-tête : bleu franc plus longtemps, fondu plus court. */
  header?: boolean;
}) {
  /*
   * Les arrêts sont relus à chaque rendu, jamais mémorisés sur `[bottom,
   * header]` seuls : `BRAND_GRADIENT` change avec le thème, et une liste
   * mémorisée aurait gardé le fondu clair sur un écran passé en sombre.
   */
  const source = header ? BRAND_HEADER_GRADIENT : BRAND_GRADIENT;
  const stops = source.map((stop) => (stop.offset === 1 ? { ...stop, color: bottom } : stop));
  return (
    <View style={[styles.root, { backgroundColor: bottom }, style]}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="devisera-brand" x1="0" y1="0" x2="0" y2="1">
            {stops.map((stop) => (
              <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity="1" />
            ))}
          </SvgLinearGradient>
          <RadialGradient id="devisera-glow" cx="0.82" cy="0.06" r="0.55" fx="0.82" fy="0.06">
            <Stop offset="0" stopColor="#8EA6FF" stopOpacity="0.45" />
            <Stop offset="0.55" stopColor="#8EA6FF" stopOpacity="0.12" />
            <Stop offset="1" stopColor="#8EA6FF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#devisera-brand)" />
        {glow ? <Rect x="0" y="0" width="100%" height="100%" fill="url(#devisera-glow)" /> : null}
      </Svg>
      {children}
    </View>
  );
}

// La couleur de fond ne peut pas vivre ici : `StyleSheet.create` fige la
// valeur du premier rendu, et le bandeau serait resté blanc en mode sombre.
const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
});
