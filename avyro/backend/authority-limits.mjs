// Regulatory facts transcribed from the signed municipal order, not community votes.
// Checked 2026-10-15 against both pages and the tester's report of current signs.
// Exact municipality/country/name scope prevents this from becoming a France-wide default.
export const WATTIGNIES_ORDER = {
  id: 'wattignies-23-405', date: '2023-03-24', checked: '2026-10-15',
  reviewBy: '2027-01-13T00:00:00Z',
  url: 'https://api-politique.pappers.fr/territoire/document/d994d3ace92aad23202ec2c6ffa383de/pdf',
};
const names = [
  'Rue du Blanc Riez', 'Rue Charles Péguy', 'Rue du Docteur Laennec', 'Rue Fleming',
  'Rue Charles Lindberg', 'Rue Jean Mermoz', 'Rue Mermoz', 'Rue Roland Garros',
  'Allée des Eglantines', 'Avenue Denis Cordonnier', 'Rue Mouchotte', 'Rue Louise de Bettignies',
  'Rue Louis Blériot', 'Rue Nungesser', 'Rue Lionel Terray', 'Rue Clément Ader',
  'Rue Charles Gounod', 'Rue Henri Matisse', 'Rue Jules Ferry',
  'Rue du Petit Bois', 'Rue Pierre et Marie Curie', 'Rue du Docteur Schweitzer',
  'Rue Henri Dunant', 'Rue Claude Bernard', 'Rue Charcot', 'Rue Honoré de Balzac',
  'Rue Romain Rolland', 'Rue Anatole France', 'Rue Van der Meersch', 'Rue Gagarine',
  'Avenue des Sports', 'Rue Saint-Exupéry', 'Rue Verlaine', 'Rue Alfred de Musset',
  'Allée George Sand', 'Rue Molière', 'Allée Ambroise Paré', 'Rue Racine',
  'Allée Gérard Philippe', 'Rue Carpeaux', 'Rue Cézanne', 'Allée Rodin', 'Rue Massenet',
  'Rue Antoine Watteau', 'Allée Bizet', 'Allée Lalo', 'Rue Rimbaud', 'Allée Millet',
  'Allée Jules Verne', 'Rue Baudelaire', 'Allée Messager', 'Résidence Guillain',
];
const normalize = text => typeof text === 'string' ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : '';
const roads = new Set(names.map(normalize));
export function authoritativeLimit(address, mapped, now) {
  if (address?.countryCode !== 'FRA' || normalize(address.municipality) !== 'wattignies' || !roads.has(normalize(address.roadName))) return mapped;
  // An expired known correction never revives a known higher conflicting value.
  if (now >= Date.parse(WATTIGNIES_ORDER.reviewBy)) return null;
  if (mapped && mapped.value * (mapped.unit === 'mph' ? 1.609344 : 1) <= 30) return mapped;
  return { value: 30, unit: 'km/h', source: 'municipal-order', authority: WATTIGNIES_ORDER.id };
}
