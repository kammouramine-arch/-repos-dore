/**
 * Accès SQL à une base Supabase par l'API de gestion.
 *
 * Évite d'avoir à faire circuler le mot de passe PostgreSQL de production :
 * un jeton d'accès suffit, et il ne quitte jamais l'environnement.
 */
const API = 'https://api.supabase.com/v1';

export function jetonRequis() {
  const jeton = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!jeton) {
    console.error('\n✖ SUPABASE_ACCESS_TOKEN est absent.');
    console.error('\n  `supabase login`, ou https://supabase.com/dashboard/account/tokens\n');
    process.exit(1);
  }
  return jeton;
}

export function echec(message, indice) {
  console.error(`\n✖ ${message}`);
  if (indice) console.error(`\n  ${indice}\n`);
  process.exit(1);
}

export function client(jeton) {
  async function appel(chemin, options = {}) {
    const reponse = await fetch(`${API}${chemin}`, {
      ...options,
      headers: { Authorization: `Bearer ${jeton}`, 'content-type': 'application/json', ...(options.headers ?? {}) },
    });
    const texte = await reponse.text();
    let corps = null;
    try {
      corps = JSON.parse(texte);
    } catch {
      /* réponse non JSON : le texte brut sert au message d'erreur */
    }
    // On ne rend que le statut : une trace complète pourrait porter le jeton.
    if (!reponse.ok) echec(`L'API Supabase a répondu ${reponse.status} sur ${chemin}.`, corps?.message ?? texte.slice(0, 200));
    return corps;
  }

  return {
    projets: () => appel('/projects'),
    sql: (ref, requete) =>
      appel(`/projects/${ref}/database/query`, { method: 'POST', body: JSON.stringify({ query: requete }) }),
  };
}

/** Résout le projet ciblé, en refusant de deviner s'il y en a plusieurs. */
export async function projetCible(api, ref) {
  const projets = await api.projets();
  if (!Array.isArray(projets) || projets.length === 0) echec('Aucun projet accessible avec ce jeton.');
  console.info('\nProjets accessibles :');
  for (const p of projets) console.info(`  ${p.id}  ${p.name}  (${p.region}, ${p.status})`);
  const projet = ref ? projets.find((p) => p.id === ref) : projets.length === 1 ? projets[0] : null;
  if (!projet) {
    echec(
      ref ? `Projet « ${ref} » introuvable.` : 'Plusieurs projets accessibles : précisez lequel.',
      '--projet <ref>',
    );
  }
  console.info(`\nProjet ciblé : ${projet.name} (${projet.id})\n`);
  return projet;
}

/** Lit l'argument qui suit un drapeau, sans confondre son absence avec l'index 0. */
export function argument(drapeau) {
  const i = process.argv.indexOf(drapeau);
  return i === -1 ? undefined : process.argv[i + 1];
}
