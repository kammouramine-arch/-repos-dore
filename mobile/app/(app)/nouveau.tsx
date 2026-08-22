import { Redirect } from 'expo-router';

/** Onglet central : ouvre directement la création de devis. */
export default function NouveauTab() {
  return <Redirect href="/devis/nouveau" />;
}
