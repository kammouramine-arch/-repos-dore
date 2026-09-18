/**
 * La préférence d'apparence, et la migration de ce qui existait avant.
 *
 * ## Deux valeurs, plus trois
 *
 * DEVISERA ne propose plus que **Clair** et **Sombre**. « Automatique » a été
 * retiré : c'était le réglage qui coûtait le plus cher à comprendre, pour le
 * plus petit bénéfice — et il portait toute la complexité du système, puisque
 * lui seul obligeait l'application à lire l'apparence de l'iPhone en continu,
 * et donc à distinguer ce qu'elle observait de ce qu'elle imposait elle-même.
 *
 * Ce qui disparaît avec lui : la surcharge relue comme une entrée, la
 * résolution qui dépendait de deux sources, et l'écart entre « ce que
 * l'utilisateur a choisi » et « ce qui s'affiche ». Il ne reste qu'une valeur,
 * et elle est ce qui s'affiche.
 *
 * ## L'iPhone sert encore une fois, une seule
 *
 * Au tout premier lancement, et une seule fois, l'apparence du téléphone donne
 * la valeur de départ : quelqu'un qui vit en sombre ne doit pas recevoir une
 * application blanche parce qu'on n'a pas su quoi choisir. Après quoi la
 * préférence est à l'utilisateur, et l'iPhone n'a plus voix au chapitre.
 *
 * Ce fichier n'importe volontairement rien de React Native : la règle se
 * vérifie sans appareil ni simulateur.
 */

export type ThemePreference = 'light' | 'dark';

/*
 * Le type est redéclaré plutôt qu'importé de `@/theme/palette` : ce fichier
 * doit rester lisible par le vérificateur de types du site, qui ne connaît pas
 * l'alias `@/` de l'application mobile. Les deux déclarations sont
 * structurellement identiques, donc interchangeables pour TypeScript.
 */
export type ColorScheme = 'light' | 'dark';

export function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark';
}

/**
 * Ce qu'il faut retenir de ce qui était enregistré.
 *
 * Trois cas, un seul résultat possible à chaque fois :
 *
 * - une préférence valide (`light`, `dark`) : on la garde telle quelle ;
 * - l'héritage d'« automatique » (`system`, `automatic`, et les variantes
 *   qu'on a pu écrire) : on le **résout une fois** contre l'apparence actuelle
 *   de l'iPhone, et c'est ce résultat qu'on enregistre. L'utilisateur garde
 *   donc exactement le thème qu'il avait sous les yeux, mais il devient
 *   explicite et ne bougera plus tout seul ;
 * - rien, ou quoi que ce soit d'inattendu : même traitement que l'héritage,
 *   ce qui est aussi le premier lancement.
 *
 * Aucun état ancien ne peut donc survivre et produire un comportement
 * imprévisible : la fonction est totale, elle rend toujours `light` ou `dark`.
 */
export function migratePreference(stored: unknown, system: ColorScheme): ThemePreference {
  return isPreference(stored) ? stored : system;
}

/**
 * Le thème appliqué.
 *
 * Il n'y a plus rien à résoudre — c'est la préférence. La fonction reste pour
 * que l'intention soit lisible au point d'usage, et pour que le jour où l'on
 * voudrait y ajouter quelque chose (un thème à fort contraste, par exemple),
 * il y ait un endroit évident où le faire.
 */
export function resolveScheme(preference: ThemePreference): ColorScheme {
  return preference;
}
