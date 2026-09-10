import { SafeAreaView } from 'react-native-safe-area-context';
import CreateQuote from '../devis/nouveau';
import { colors } from '@/theme';
export { RouteError as ErrorBoundary } from '@/components/route-error';

/** Render a real scene: never leave a redirect-only tab blank behind a modal. */
export default function NouveauTab() {
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}><CreateQuote /></SafeAreaView>;
}
