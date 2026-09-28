/**
 * Photographies utilisées dans les concepts de sites.
 *
 * Toutes proviennent d'Unsplash et sont publiées sous la licence Unsplash
 * (https://unsplash.com/license) : utilisation commerciale autorisée, sans
 * obligation d'attribution. Elles ont été choisies sans visage
 * identifiable. Elles illustrent des concepts : elles ne représentent aucun
 * client d'AMYN.
 */
export const photoCredits: { file: string; source: string }[] = [
  { file: "restaurant-plat.jpg", source: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0" },
  { file: "restaurant-salle.jpg", source: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4" },
  { file: "restaurant-table.jpg", source: "https://images.unsplash.com/photo-1504674900247-0877df9cc836" },
  { file: "barbier-salon.jpg", source: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70" },
  { file: "institut-salon.jpg", source: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f" },
  { file: "institut-calme.jpg", source: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4" },
  { file: "menuiserie-cuisine.jpg", source: "https://images.unsplash.com/photo-1556911220-bff31c812dba" },
  { file: "menuiserie-sejour.jpg", source: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0" },
  { file: "plomberie-reseau.jpg", source: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39" },
  { file: "cabinet-bureaux.jpg", source: "https://images.unsplash.com/photo-1497366811353-6870744d04b2" },
  { file: "cabinet-couloir.jpg", source: "https://images.unsplash.com/photo-1497366216548-37526070297c" },
  { file: "artisan-plans.jpg", source: "https://images.unsplash.com/photo-1581092160562-40aa08e78837" },
];

export const photo = (name: string) => `/photos/${name}.jpg`;
