# AMYN — site public (amyn.agency)

Site vitrine d'AMYN Agency : sites web, applications et outils digitaux
conçus autour de la façon dont chaque entreprise fonctionne.

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. Aucune
dépendance d'exécution en dehors de Next et React : pas de bibliothèque
d'animation, pas d'analytics, pas de script tiers.

## Commandes

```bash
npm install
npm run dev           # http://localhost:3000
npm run build         # build de production
npm run lint
npm run typecheck
npm test              # tests unitaires (node --test)
npm run check:launch  # échoue tant que les mentions légales sont incomplètes
```

## Où modifier quoi

| Sujet | Fichier |
|---|---|
| Nom, e-mail, navigation, réseaux sociaux | `src/lib/site.ts` |
| Les sept services et le contenu de leurs pages | `src/lib/services.ts` |
| Prix (devis / à partir de / fixe) | `pricing` de chaque service, formats dans `src/lib/pricing.ts` |
| Réalisations (et leur nature : concept, client…) | `src/lib/projects.ts` |
| FAQ de l'accueil | `src/lib/faq.ts` |
| Méthode et engagements | `src/lib/method.ts` |
| Mentions légales, conditions, durées de conservation | `src/lib/legal.ts` |
| Inventaire des cookies et traceurs | `src/lib/trackers.ts` |
| Couleurs, typographie, animations | `src/app/globals.css` |

### Changer un prix

Chaque service porte un objet `pricing`. Au lancement, tous sont
`{ mode: "quote", visible: true }` et affichent « Sur devis ». Pour
afficher « À partir de 1 200 € HT » :

```ts
pricing: { mode: "startingFrom", amount: 1200, taxLabel: "HT", visible: true },
```

Aucune page n'est à retoucher.

### Publier une réalisation client

Ajouter un objet à `projects` avec `kind: "client"` — uniquement avec
l'accord du client, et sans résultat chiffré non vérifié.

## Règles de contenu

- Aucun faux client, témoignage, avis, logo, chiffre ou résultat.
- Aucune promesse de classement Google, de trafic, d'avis ou
  d'acceptation sur les stores. Les tests (`tests/content.test.mts`)
  échouent si ces formulations apparaissent.
- Les projets conceptuels sont toujours présentés comme tels.

## Cookies

Le site ne dépose aucun cookie et ne charge aucune ressource tierce
(vérifié en navigateur). Tout ajout d'outil de mesure ou de contenu
externe doit être déclaré dans `src/lib/trackers.ts` et, s'il n'est pas
strictement nécessaire, ne se charger qu'après consentement (accepter /
refuser / personnaliser, et un lien « Gérer mes cookies » permanent).

## Formulaires

`/premier-apercu` → `POST /api/premier-apercu` · `/contact` → `POST /api/projet`.
Remise à la boîte contact@amyn.agency par le serveur d'envoi OVHcloud, côté serveur uniquement (voir `DEPLOIEMENT.md`).
Sans `RESEND_API_KEY` : la demande est écrite dans la console en
développement ; en production, le formulaire affiche un message invitant
à écrire à contact@amyn.agency.

Liens de campagne : `/premier-apercu?source=outreach` signale qu'on arrive
d'un message d'AMYN ; `&business=Nom` pré-remplit l'entreprise ;
`&besoin=<slug de service>` pré-coche le besoin. Ne jamais placer de
donnée personnelle dans une adresse.
