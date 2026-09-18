/**
 * La résolution du thème, seule et entière.
 *
 * Deux concepts distincts : ce que l'utilisateur a **choisi** et ce qui est
 * **appliqué**. « Automatique » est un choix, pas un thème ; il se résout
 * contre l'apparence du système, et contre rien d'autre — surtout pas contre
 * le thème courant de l'application.
 *
 * Ce fichier n'importe volontairement rien de React Native. C'est ce qui rend
 * la règle vérifiable sans appareil ni simulateur : le défaut corrigé au build
 * 60 — « Automatique » donnait le contraire du mode précédent — venait
 * précisément de ce que cette règle n'existait nulle part comme fonction, mais
 * se trouvait dispersée entre un effet, une mémorisation et une surcharge
 * native que l'application relisait après l'avoir écrite.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

/*
 * Le type est redéclaré plutôt qu'importé de `@/theme/palette` : ce fichier
 * doit rester lisible par le vérificateur de types du site, qui ne connaît pas
 * l'alias `@/` de l'application mobile. C'est le prix, minime, d'une règle
 * qu'on peut tester des deux côtés. Les deux déclarations sont structurellement
 * identiques, donc interchangeables pour TypeScript.
 */
export type ColorScheme = 'light' | 'dark';

export function resolveScheme(preference: ThemePreference, system: ColorScheme): ColorScheme {
  return preference === 'system' ? system : preference;
}
