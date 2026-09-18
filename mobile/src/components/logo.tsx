import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';

/**
 * Marque DEVISERA : monogramme et nom.
 *
 * La taille est un paramètre parce qu'un logo de 30 pixels au centre d'un
 * écran de lancement donne l'impression d'une application inachevée. Le trait
 * s'épaissit avec la taille pour que le monogramme garde le même poids visuel.
 *
 * `inverse` dessine le monogramme en blanc sur bleu : c'est la version posée
 * sur les surfaces de marque (lancement, accueil, authentification), où un
 * carré bleu sur fond bleu disparaissait.
 */
export function Logo({
  size = 30,
  showName = true,
  tone = 'ink',
}: {
  size?: number;
  showName?: boolean;
  tone?: 'ink' | 'white' | 'inverse';
}) {
  const nameColor = tone === 'ink' ? colors.ink : colors.white;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.33 }}>
      <LogoMark size={size} inverse={tone === 'inverse'} />
      {showName ? (
        <Text
          style={{
            fontSize: size * 0.6,
            fontWeight: '700',
            letterSpacing: -size * 0.022,
            color: nameColor,
          }}
        >
          DEVISERA
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Monogramme seul.
 *
 * Même géométrie que l'icône de l'application : une onde vocale à gauche, une
 * page de devis à droite, et les deux ensemble dessinent le D de DEVISERA.
 * Le repère de 32 × 32 reprend celui de l'icône divisé par 32, afin que le
 * dessin à l'écran et celui sur l'écran d'accueil soient le même dessin.
 */
export function LogoMark({ size, inverse = false }: { size: number; inverse?: boolean }) {
  // `inverse` : marque blanche posée sur une surface bleue. Sinon pavé bleu,
  // dessin blanc — comme l'icône.
  const plate = inverse ? colors.white : colors.accent;
  const ink = inverse ? colors.accent : colors.white;
  // Le pli du coin perd son contraste en très petit : il rejoint alors la page.
  const fold = size >= 26 ? (inverse ? '#8FB0FC' : '#8FB0FC') : ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect width={32} height={32} rx={9} fill={plate} />
      {/* Panse du D : la page, coin replié. */}
      <Path d="M 14.1 6.4 H 21 L 26.6 12.1 V 19.1 A 6.4 6.4 0 0 1 20.2 25.4 H 14.1 Z" fill={ink} />
      <Path d="M 21 6.4 L 26.6 12.1 H 21 Z" fill={fold} />
      {/* Hampe du D : l'onde vocale. */}
      <Rect x={4.7} y={13.6} width={1.75} height={4.8} rx={0.9} fill={ink} />
      <Rect x={7.7} y={10.6} width={1.75} height={10.9} rx={0.9} fill={ink} />
      <Rect x={10.7} y={7.7} width={1.75} height={16.6} rx={0.9} fill={ink} />
    </Svg>
  );
}
