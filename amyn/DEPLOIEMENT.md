# Mise en ligne d'AMYN sur amyn.agency

Le site est prêt à être déployé. Il ne reste que des actions qui demandent
tes identifiants — elles ne peuvent pas être faites depuis l'environnement
de développement.

## Point de départ

| Élément | État constaté |
|---|---|
| Domaine `amyn.agency` | Enregistré, DNS actif |
| Enregistrement A actuel | `213.186.33.5` (parking OVH) |
| HTTPS | Absent — la connexion est refusée |
| Code | Prêt, `build` / `lint` / `tsc` sans erreur |

Le projet Next.js vit dans le **sous-dossier `amyn/`** du dépôt. C'est le
point le plus facile à rater au moment de configurer l'hébergeur.

---

## 1. Créer le projet sur Vercel

1. Ouvre <https://vercel.com/new> et connecte-toi avec ton compte GitHub.
2. Importe le dépôt `kammouramine-arch/-repos-dore`.
3. **Root Directory** : clique sur « Edit » et choisis **`amyn`**.
   Sans ça, Vercel cherche un `package.json` à la racine et le déploiement
   échoue.
4. Framework Preset : `Next.js` (détecté automatiquement).
5. Aucune variable d'environnement n'est nécessaire : le site est
   entièrement statique et ne dépend d'aucun service externe.
6. Branche à déployer : `claude/amyn-official-website-k4cbwx` — ou fusionne
   d'abord cette branche dans `main` et déploie `main`.
7. Clique sur **Deploy**.

Tu obtiens une URL de test en `*.vercel.app`. Vérifie-la avant de brancher
le domaine.

## 2. Brancher amyn.agency

Dans Vercel : **Project → Settings → Domains → Add**, puis saisis
`amyn.agency` et `www.amyn.agency`.

Vercel affiche alors **les valeurs DNS exactes à créer**. Copie-les depuis
cet écran : ce sont elles qui font foi, elles peuvent différer selon le
projet et la région.

## 3. Modifier la zone DNS chez OVH

1. <https://www.ovh.com/manager/> → **Noms de domaine** → `amyn.agency`
   → onglet **Zone DNS**.
2. **Supprime ou modifie l'enregistrement A existant** qui pointe vers
   `213.186.33.5` (le parking OVH). Tant qu'il est là, le domaine continue
   d'aller vers OVH.
3. Crée les enregistrements que Vercel t'a affichés à l'étape 2 :
   - un enregistrement **A** sur le domaine racine (champ « sous-domaine »
     laissé **vide**), avec l'adresse IP donnée par Vercel ;
   - un enregistrement **CNAME** sur le sous-domaine **`www`**, avec la
     cible donnée par Vercel.
4. Si un CNAME `www` existe déjà (parking OVH), remplace-le.

La propagation prend de quelques minutes à quelques heures. Vercel émet le
certificat HTTPS automatiquement dès que les DNS sont corrects — rien à
faire de plus pour le SSL.

> ⚠️ Ne touche à aucun enregistrement **MX** ni **TXT** : ce sont eux qui
> font fonctionner la messagerie et les vérifications de domaine.

## 4. Activer l'envoi du formulaire de contact

Le formulaire (`/contact`) envoie les demandes par l'API HTTP de **Resend**.
Ce choix évite le SMTP, peu fiable depuis une fonction serverless, et
n'ajoute aucune dépendance au projet.

1. Crée un compte sur <https://resend.com> et génère une clé dans **API Keys**.
2. Dans Vercel : **Project → Settings → Environment Variables**, ajoute :

   | Nom | Valeur | Portée |
   |---|---|---|
   | `RESEND_API_KEY` | la clé `re_…` | Production + Preview |
   | `CONTACT_TO_EMAIL` | l'adresse qui reçoit les demandes | Production + Preview |
   | `CONTACT_FROM_EMAIL` | *(laisser vide au départ)* | — |

3. Redéploie pour que les variables soient prises en compte.

Tant qu'aucun domaine n'est vérifié chez Resend, l'expéditeur par défaut
`AMYN <onboarding@resend.dev>` fonctionne — et il n'est visible que dans ta
propre boîte, puisque le **Reply-To porte l'adresse du prospect**.

Pour un expéditeur à ton nom, vérifie un **sous-domaine** chez Resend
(par exemple `send.amyn.agency`) plutôt que le domaine racine : les
enregistrements MX d'OVH restent alors intacts. Renseigne ensuite
`CONTACT_FROM_EMAIL="AMYN <contact@send.amyn.agency>"`.

> Sans `RESEND_API_KEY`, le formulaire ne plante pas : il affiche un message
> clair et invite à écrire directement par e-mail.

## 5. Vérifier l'adresse e-mail

Le site invite à écrire à **contact@amyn.agency**
(défini dans `src/lib/content.ts`). Assure-toi que cette boîte existe et
qu'elle est relevée. Si ton adresse est différente, change la valeur dans
ce fichier — c'est la seule ligne à modifier.

## 6. Avant d'ouvrir au public

- [ ] Confirmer que `CONTACT_TO_EMAIL` reçoit bien (envoi de test depuis
      `/contact` en production).
- [ ] Compléter `src/lib/content.ts` : `instagram`, `linkedin`, `whatsapp`
      (un champ laissé vide n'affiche simplement aucun lien).
- [ ] Compléter les mentions légales et la politique de confidentialité,
      puis retirer le bloc `robots: { index: false }` en haut de
      `src/app/mentions-legales/page.tsx` et
      `src/app/confidentialite/page.tsx`.
- [ ] Déclarer le site dans la Google Search Console et y soumettre
      `https://amyn.agency/sitemap.xml`.

---

## Commandes utiles

```bash
cd amyn
npm install
npm run dev      # développement, http://localhost:3000
npm run build    # build de production
npm run lint     # qualité du code
npx tsc --noEmit # vérification des types
```
