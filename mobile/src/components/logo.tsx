import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';

/** Marque DEVISIA : monogramme + nom, identique au web. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Svg width={30} height={30} viewBox="0 0 32 32">
        <Rect width={32} height={32} rx={9} fill={colors.accent} />
        <Path
          d="M10.75 9.75h6.6c3.6 0 5.9 2.5 5.9 6.25s-2.3 6.25-5.9 6.25h-6.6"
          stroke="#FFFFFF"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path d="M8.5 16h6.2" stroke="#FFFFFF" strokeWidth={1.9} strokeLinecap="round" />
      </Svg>
      {!compact ? (
        <Text style={{ fontSize: 18, fontWeight: '700', letterSpacing: -0.6, color: colors.ink }}>
          DEVISIA
        </Text>
      ) : null}
    </View>
  );
}
