import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export interface AvyroMarkProps { size?: number; ring?: boolean }
/** Original twin-bend roadway monogram. Internal export retained for compatibility. */
export const AvyroMark = ({ size = 72 }: AvyroMarkProps) => <Svg width={size} height={size} viewBox="0 0 100 100">
  <Defs><LinearGradient id="meepmeep-mark" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#67EDC1" /><Stop offset="1" stopColor="#2A9DB1" /></LinearGradient></Defs>
  <Path d="M16 78V30L28 18L50 45L72 18L84 30V78H68V46L50 68L32 46V78Z" fill="url(#meepmeep-mark)" />
  <Path d="M50 45L72 18L84 30V78H68V46L50 68Z" fill="white" opacity={.22} />
</Svg>;
