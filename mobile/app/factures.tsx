import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui';
import { InvoiceBoard, useInvoiceBoard } from '@/components/invoice-board';
import { useThemeScheme } from '@/theme';

/**
 * Route `/factures`.
 *
 * Conservée telle quelle : c'est la cible d'un lien profond et de l'écran de
 * signature, qui arrive avec `?devis=` pour facturer aussitôt. La liste
 * elle-même est celle de l'onglet Documents, au mot près.
 */
export default function FacturesScreen() {
  // Re-rendu à chaque bascule d'apparence, sans démontage : la navigation
  // et la position de défilement survivent au changement de thème.
  useThemeScheme();
  const { devis } = useLocalSearchParams<{ devis?: string }>();
  const board = useInvoiceBoard({ claimQuoteId: devis });
  return (
    <Screen refreshControl={board.refreshControl}>
      <InvoiceBoard {...board} />
    </Screen>
  );
}
