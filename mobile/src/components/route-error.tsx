import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { recordDiagnostic } from '@/lib/diagnostics';
import { useRouter } from 'expo-router';
import { Button, Heading, Muted, Screen } from './ui';

/** Do not put exception messages or customer data in the recovery screen. */
export function RouteError({ retry }: ErrorBoundaryProps) {
  useEffect(() => { recordDiagnostic({ area: 'screen', durationMs: 0, code: 'RENDER_FAILURE' }); }, []);
  const router = useRouter();
  return <Screen>
    <Heading>Cet écran n’a pas pu s’ouvrir</Heading>
    <Muted>Réessayez. Si le problème persiste, revenez à votre atelier.</Muted>
    <Button title="Réessayer" onPress={() => void retry()} />
    <Button title="Retour à mon atelier" variant="secondary" onPress={() => router.replace('/(app)')} />
  </Screen>;
}
