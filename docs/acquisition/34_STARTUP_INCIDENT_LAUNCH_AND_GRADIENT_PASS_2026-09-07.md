# Incident « service temporaire », séquence de lancement et dégradé — 7 septembre 2026

Passe unique réalisée sur l'état DEVISERA courant (`codex/devisia-premium-fluidity`, tête `cbf36c5`), sans reprise de l'architecture. Ce document consigne les preuves, pas des intentions.

## 1. Incident de production : « Le service rencontre un problème temporaire »

### Reproduction sur l'alias de production (`https://devisia-bice.vercel.app`)

| Requête | Réponse | Durée |
| --- | --- | --- |
| `GET /api/health` | **503** `{"status":"degraded","database":"unavailable","durationMs":1}` (constant sur 4 appels : 15, 2, 1, 1 ms) | 0,2–2,4 s |
| `GET /api/auth/session` sans jeton | 401 attendu | 0,7 s |
| `GET /api/auth/session` avec un jeton fictif | 401 attendu (aucun appel à la configuration sur ce chemin) | 0,9 s |
| `POST /api/auth/session` mauvais mot de passe | 401 « Email ou mot de passe incorrect. » — **la base répond** | 1,5 s |
| `POST /api/auth/inscription` (charge utile exacte de l'iPhone) | **500** `{"error":{"code":"INTERNAL"}}` | 4,3 s |
| `POST /api/auth/session` avec le mot de passe correct du compte sonde | **500** `{"error":{"code":"INTERNAL"}}` | 4,2 s |

`x-vercel-id` du 500 d'inscription : `iad1::iad1::fwh8b-1788795345544-1c4cabb13eb4`.

### Lecture

- Une base injoignable ne peut pas échouer en 1 ms : `SELECT 1` vers Supabase prend au minimum le temps d'un aller-retour réseau. La sonde de santé enveloppait `env()`, Prisma et le fournisseur email dans un seul `try` et répondait « database: unavailable » quelle que soit l'exception.
- Tous les chemins qui répondent 500 appellent `env()` (`aiCapabilities()` dans la construction de la session, `getEmailProvider()` à l'inscription, la sonde elle-même) ; tous les chemins qui répondent correctement n'y touchent pas (recherche d'utilisateur, comparaison de mot de passe, vérification de jeton).
- `env()` validait le schéma complet d'un bloc : une seule variable optionnelle invalide (fournisseur email, adresse de réponse, indicateur booléen, URL sans schéma…) faisait lever chaque route qui consulte la configuration. Le nom exact de la variable fautive figure dans les journaux Vercel (`Configuration d'environnement invalide — <VARIABLE>: <raison>`), qui n'étaient pas accessibles depuis l'environnement de cette passe ; la sonde le nommera d'elle-même au prochain déploiement.

### Correctifs

- `src/lib/env.ts` : lecture variable par variable. Seule `DATABASE_URL` bloque ; une variable optionnelle invalide est remplacée par sa valeur par défaut, signalée par son nom (jamais sa valeur) dans les journaux et dans `configurationReport()`. `APP_URL` sans schéma est complétée en `https://`.
- `src/app/api/health/route.ts` : composants mesurés séparément — `configuration` (variables manquantes / ignorées), `database` (durée), `email`, `ai`. 503 seulement si la base est réellement injoignable.
- `src/server/api.ts` : chaque erreur non gérée porte une référence courte (`requestId`) dans le corps, l'en-tête `x-request-id` et la ligne de journal `[api] erreur non gérée ref=…`.
- Tests : `tests/unit/env-resilience.test.ts` (6), `tests/unit/api-request-id.test.ts` (2), `tests/integration/health.test.ts` (2, base réelle).

## 2. URL d'API du binaire

`EAS_BUILD=true npx expo config --type prebuild` → `extra.apiUrl = https://devisia-bice.vercel.app`, avec ou sans `EXPO_PUBLIC_API_URL` ; `http://localhost:3000` en développement ; un build distribuable pointant sur `localhost` échoue à la configuration. `devisera.fr` ne répond pas encore (connexion réinitialisée) : l'alias Vercel reste l'origine stable.

## 3. Démarrage mobile

- `mobile/src/lib/auth.tsx` : la panne de revalidation est classée `network` ou `server` (avec référence), avec un second essai après 1,2 s ; un refus 401 n'est jamais réessayé.
- `mobile/app/_layout.tsx` : écran de panne distinct pour « Connexion indisponible » et « Service indisponible (référence) » ; les données locales restent en place.
- `mobile/src/lib/diagnostics.ts` + `packages/shared/src/api-client.ts` : chaque appel consigne chemin anonymisé, statut, famille (`network` / `timeout` / `auth` / `client` / `server`) et référence serveur. Aucun jeton, email, contenu ni paramètre.

## 4. Séquence de lancement

Cause de l'invisibilité précédente : l'écran de lancement était rendu *à la place* de l'application tant que la session n'était pas décidée, et l'écran natif était retiré au premier rendu. La décision arrive en quelques dizaines de millisecondes (trousseau et instantané locaux) : l'animation était démontée avant d'être perçue.

Nouvelle implantation (`mobile/src/components/launch.tsx`, `mobile/src/lib/launch-timing.ts`, `mobile/app/_layout.tsx`, `mobile/app.config.ts`) :

1. écran natif bleu `#2F52E8` avec le monogramme à 96 pt (`assets/splash-mark.png`, même géométrie que le composant) ;
2. superposition JavaScript identique, qui retire l'écran natif après sa première peinture ;
3. ressort du monogramme (1 → 1,12 → 1), halo qui s'ouvre, nom puis promesse ;
4. dès que l'application derrière sait quoi afficher **et** que le minimum perçu est écoulé (1 000 ms au premier lancement, 760 ms ensuite, 560 ms avec « Réduire les animations »), la surface bleue se referme en cercle sur le monogramme en 620 ms (320 ms en fondu si les animations sont réduites) et découvre l'écran, dont le haut est du même bleu ;
5. une seule séquence par processus ; un retour d'arrière-plan ne rejoue rien ; au-delà de 2,8 s d'attente réelle, « Chargement de votre atelier… » s'affiche.

Preuves : `evidence/2026-09-07-lancement-sequence.jpg` (export web, 393 × 852, images toutes les ~100 ms), tests `tests/unit/launch-timing.test.ts` (7). La vérification sur iPhone physique reste à faire.

## 5. Dégradé

`mobile/src/theme/gradient.ts` : dix arrêts, bleu saturé tenu sur 30 % puis dissolution jusqu'au blanc, halo radial discret ; fondu sur 64 % (accueil) et 68 % (authentification) de la hauteur. L'accueil n'a plus d'en-tête en carte : le dégradé est l'arrière-plan de l'écran, sous la barre d'état, et les cartes reposent dessus. L'écran d'authentification perd la couture droite, le titre blanc invisible et l'aplat bleu nuit sous le formulaire. Tests `tests/unit/brand-gradient.test.ts` (5 : ordre, pente maximale, étendue du fondu). Preuves : `evidence/2026-09-07-accueil-degrade-393x852.png`, `evidence/2026-09-07-connexion-degrade-393x852.png`, `evidence/2026-09-07-etats-demarrage.jpg`.

## 6. Actions propriétaire

1. Déployer cette version en production (le déploiement se fait depuis la CLI Vercel authentifiée), puis lire `GET https://devisia-bice.vercel.app/api/health` : `checks.configuration.ignored` nomme la variable à corriger dans Vercel → Settings → Environment Variables. Corriger la valeur, redéployer.
2. Vérifier ensuite `POST /api/auth/session` avec un vrai compte (200 attendu) et supprimer le compte sonde `zz-sonde-devisera-1788795345@example.com` (créé par cette passe, sans données).
3. Lancer **un** build EAS iOS et vérifier sur iPhone : écran natif bleu sans éclair blanc, séquence visible à froid, plus vive au second lancement, absente au retour d'arrière-plan, dégradé continu de l'accueil, barre d'état claire sur l'accueil et l'authentification.

## 7. Après déploiement de `d99e6d2` — vérification en production

`GET /api/health` : `database: ok`, `email: resend, configured: true`, `ai: gemini, generation: true, transcription: false`, `configuration: degraded, ignored: ["EMAIL_REPLY_TO"]`.

### La variable fautive : `EMAIL_REPLY_TO`

Le schéma n'admettait qu'une adresse nue (`z.string().email()`) ; la valeur voulue en production porte un nom d'affichage (`DEVISERA <contact@devisera.fr>`), forme que Resend accepte pour `replyTo` comme pour `from`. Avant `d99e6d2`, cette seule valeur faisait lever `env()` sur toutes les routes (les 500) ; après, elle était classée « ignorée » et remplacée par le défaut. Elle est maintenant normalisée (espaces, guillemets, `mailto:`, `<adresse>`) et l'adresse qu'elle contient est validée. La variable est conservée telle quelle en production : elle est bien utilisée comme Reply-To transactionnel. Tests : `tests/unit/env-resilience.test.ts` (9).

### Transcription `false` : attendu

La dictée iPhone est transcrite sur l'appareil (`@jamsch/expo-speech-recognition`, voir `mobile/src/features/voice.ts`) ; la capacité serveur ne s'active qu'avec `TRANSCRIPTION_PROVIDER=openai` et `TRANSCRIPTION_API_KEY`, et ne sert qu'à `/api/ai/transcribe`. Aucune fonction mobile n'en dépend. La sonde le précise désormais (`transcriptionNote`).

### Les 500 ont disparu

| Requête (alias de production) | Avant | Après |
| --- | --- | --- |
| `POST /api/auth/session`, mot de passe correct | 500 | **200** (4,3 s, jeton + session) |
| `GET /api/auth/session` avec jeton | — | **200** |
| `PATCH /api/auth/compte`, `PATCH /api/auth/langue` | — | **200** |
| `POST /api/auth/inscription`, charge iPhone | 500 | **503 PROVIDER_UNAVAILABLE** « Le code n’a pas pu être envoyé » (compte créé, code refusé par Resend) |
| `GET /api/dashboard`, `/api/customers`, `/api/quotes`, `/api/team`, `/api/leads` avec un compte non vérifié | — | 403 FORBIDDEN de l'API : porte de vérification d'email voulue |

### Deux points restants, hors code applicatif

1. **Resend refuse l'envoi du code** (503 à l'inscription et à `POST /api/auth/code-email`). La raison était perdue : `requestEmailCode` la journalise désormais (`[auth] envoi du code de vérification refusé`, nom/message/statut du fournisseur, jamais le code ni l'adresse) et la sonde publie l'état du domaine d'expédition chez Resend (`checks.email.sendingDomain`). Vérifier dans Resend que `devisera.fr` est **verified** ; sans cela l'inscription mobile reste bloquée à l'étape du code.
2. **Le pare-feu Vercel refuse par intermittence des écritures légitimes** : `x-vercel-mitigated: deny`, corps `{"error":{"code":"403","message":"Forbidden","id":"iad1::…"}}`, sans `x-matched-path` — donc avant l'application. Observé sur `DELETE /api/auth/account`, `DELETE /api/auth/session`, `PATCH /api/auth/code-email` (User-Agent iPhone), `POST /api/customers` (User-Agent CFNetwork), alors que les mêmes requêtes passent quelques secondes plus tard. Le client traduit maintenant ce refus en panne passagère à réessayer, avec l'identifiant de mitigation. À examiner : Vercel → Projet → Firewall (règles personnalisées, jeux de règles gérés, mode défi).

### Comptes sonde

`zz-sonde-devisera-1788795345@example.com` et `zz-sonde-devisera-1788799341@example.com` (organisations « ZZ Sonde Devisera », sans donnée commerciale) ne peuvent pas être supprimés par l'API : un propriétaire doit d'abord transférer son espace (422). Ce refus vaut aussi pour un artisan seul dans son espace — à rapprocher de l'exigence Apple de suppression de compte (point 7 de `16_RELEASE_AND_OWNER_ACTIONS.md`). Suppression à faire côté base : `npm run db:clean:supabase` (préfixe d'organisation « ZZ »).
