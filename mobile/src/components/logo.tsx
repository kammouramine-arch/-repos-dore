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
  // Le trait s'épaissit avec la taille : à 96 px, un trait de 1.9 disparaît.
  const stroke = Math.max(1.6, 32 * 0.06);
  const nameColor = tone === 'ink' ? colors.ink : colors.white;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.33 }}>
      <LogoMark size={size} inverse={tone === 'inverse'} stroke={stroke} />
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

/** Monogramme seul. La géométrie est reprise à l'identique par l'écran natif. */
export function LogoMark({ size, inverse = false, stroke = 1.92 }: { size: number; inverse?: boolean; stroke?: number }) {
  const fill = inverse ? colors.white : colors.accent;
  const ink = inverse ? colors.accent : colors.white;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect width={32} height={32} rx={9} fill={fill} />
      <Path
        d="M10.75 9.75h6.6c3.6 0 5.9 2.5 5.9 6.25s-2.3 6.25-5.9 6.25h-6.6"
        stroke={ink}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M8.5 16h6.2" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  );
}
