import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui';
import { InvoiceBoard, useInvoiceBoard } from '@/components/invoice-board';

/**
 * Route `/factures`.
 *
 * Conservée telle quelle : c'est la cible d'un lien profond et de l'écran de
 * signature, qui arrive avec `?devis=` pour facturer aussitôt. La liste
 * elle-même est celle de l'onglet Documents, au mot près.
 */
export default function FacturesScreen() {
  const { devis } = useLocalSearchParams<{ devis?: string }>();
  const board = useInvoiceBoard({ claimQuoteId: devis });
  return (
    <Screen refreshControl={board.refreshControl}>
      <InvoiceBoard {...board} />
    </Screen>
  );
}
