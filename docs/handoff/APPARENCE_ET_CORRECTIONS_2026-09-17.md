# Build 56 — apparence, notifications, raccourcis, signature automatique

Passation du 17/09/2026, seconde passe de la journée. Branche
`claude/devisia-saas-build-4wthv7`, reportée sur `integration/devisera-final`.
Build iOS 56, version 1.0.2, envoyé à TestFlight seulement — **pas** à la
revue App Store.

## 1. Les raccourcis de l'accueil ne détournent plus la navigation

« Mes factures » pointait sur `/(app)/devis?onglet=factures` : l'application
basculait sur l'onglet Documents et l'artisan parti de l'accueil se retrouvait
ailleurs, sans retour. Il pousse maintenant `/factures`, avec le bouton retour
iOS habituel ; l'onglet sélectionné reste celui d'où l'on est parti.

Le même audit a révélé un défaut plus grave, au même endroit conceptuel :
l'entrée **Outils → Encaissement en ligne** portait le bon nom et menait à
`/paiements`, c'est-à-dire à l'historique de l'abonnement DEVISERA. C'est la
raison pour laquelle l'encaissement restait introuvable malgré son
implémentation complète au build 55. Elle mène à `/encaissement`.

## 2. Le micro ne s'arme plus tout seul

Appuyer sur « + » ouvrait l'écran de dictée **et démarrait l'enregistrement**.
Ouvrir n'est pas consentir à être écouté — l'écran peut s'ouvrir devant un
client, en réunion, ou par erreur. `?dicter=1` ne fait plus que mettre le micro
en avant : halo entrouvert, invite « Prêt — appuyez pour parler ». Le
consentement IA est demandé au toucher, quand il porte sur quelque chose de
réel.

## 3. Apparence : automatique, clair, sombre

**Compte → L'application → Apparence.** Conservé sur l'appareil, appliqué au
lancement suivant ; « Automatique » suit l'iPhone en direct.

### Comment le thème atteint toute l'application

Soixante-trois fichiers importent `colors` directement. Les convertir en hook
aurait voulu dire toucher chaque écran pour livrer un mode sombre. `colors` est
donc un objet unique dont les champs sont réécrits par `applyScheme`, et le
fournisseur d'apparence remonte l'arbre entier à chaque bascule. Aucun écran ne
peut rester à l'ancienne palette parce qu'il aurait oublié de s'abonner.

**Deux règles à tenir** pour que cela reste vrai :

1. ne jamais capturer une couleur au niveau module
   (`const TONES = { bg: colors.surface }`) ;
2. ne jamais en figer une dans `StyleSheet.create`.

Les deux gèlent la valeur du premier rendu. Cinq tables étaient dans ce cas —
`BADGE_TONES`, `BUTTON_COLORS`, `TONE_COLORS`, `STATUS_TONE`, `TONE` — et c'est
ce qui laissait des pastilles blanches au milieu de l'interface sombre. Elles
sont devenues des fonctions, et un test échoue si une nouvelle apparaît.

### La palette sombre n'est pas l'inverse de la claire

- Le fond est `#0B0F17`, un bleu très sombre : le noir pur fait vibrer le texte
  sur OLED et rend les ombres invisibles.
- Les surfaces **montent** : une carte (`#131924`) est plus claire que la page.
  L'élévation se lit à l'inverse du mode clair.
- Le bleu s'éclaircit (`#5C7CFF`) : `#2F52E8` tombe sous le seuil de lisibilité
  sur fond sombre.
- Le dégradé de marque descend vers la nuit au lieu du blanc, sans jamais
  traverser de zone pâle.
- Les boutons Apple et Google prennent leur déclinaison sombre officielle
  (bouton blanc pour Apple, `#131314` / `#8E918F` / `#E3E3E3` pour Google) —
  c'est une exigence des deux plateformes, pas une préférence.

`userInterfaceStyle` passe à `automatic` : claviers, feuilles de partage et
alertes système suivent désormais l'appareil.

## 4. Notifications

**Compte → L'application → Notifications.** Deux choses distinctes, affichées
comme telles : l'autorisation iOS d'abord, les catégories ensuite. Si iOS a
refusé, aucune application ne peut le rétablir de l'intérieur ; l'écran le dit
et ouvre les Réglages.

Sept catégories, chacune adossée à des notifications réellement émises par le
serveur (`tests/unit/build56-polish.test.ts` le vérifie en relisant les appels
à `notify`). Le tri se fait **avant l'envoi**, appareil par appareil : couper
une catégorie coupe la bannière, pas seulement son affichage. La notification
reste consignée dans l'activité — couper une alerte n'est pas effacer ce qui
s'est passé.

« Facture en retard » figurait dans la demande sans exister côté serveur. Plutôt
qu'un interrupteur décoratif, la notification a été écrite :
`notifyOverdueInvoices()` tourne avec la tâche planifiée des relances et ne
prévient qu'une fois par facture.

## 5. Barre d'onglets

Chaque onglet avait son propre ressort, démarré par un effet React : trois
animations désynchronisées partaient en même temps que la capsule, et l'on
voyait un clignotement plutôt qu'un déplacement. Une seule valeur partagée mène
désormais tout — l'icône s'allume à mesure que le verre la recouvre. La capsule
s'étire dans le sens de sa course, d'un facteur déduit de la distance restante,
donc de la vitesse réelle ; enchaîner les onglets la fait suivre au lieu
d'empiler des animations. Elle est une `GlassSurface` quand l'appareil en a une.

## 6. Le bandeau bleu se comprime

Il glissait vers le haut ; un rectangle qui glisse reste un rectangle. Il se
referme maintenant depuis son bord supérieur, dégradé compris : la zone de fondu
remonte dans le cadre pendant que le contenu clair monte dans la scène.

La compression est calée sur `facteur = 1 − y / hauteur`, ce qui fait reculer le
bord bas **au moins aussi vite que le contenu**. C'est ce qui rend impossible le
défaut du build 54 — un intitulé gris au milieu du bleu. Une parallaxe plus
lente serait plus jolie et casserait cette garantie.

## 7. Signature

Elle vivait dans un coin de Ma marque, entre la couleur et le pied de page.
Elle a son écran (`/signature`), accessible depuis l'accueil et depuis Outils ;
Ma marque n'en garde qu'un renvoi. Tracé, remplacement, suppression, aperçu du
tracé enregistré avec le nom et la date.

La consigne « tendez le téléphone à votre client » ne s'affiche plus quand c'est
l'artisan qui signe : la feuille de tracé a deux libellés selon qui signe.

## 8. La signature s'applique seule, et l'histoire ne bouge plus

Le rendu lisait la signature **vivante** du profil. Un artisan qui remplaçait la
sienne changeait donc, sans le savoir, l'apparence de devis déjà reçus par ses
clients — un document dont le tracé change après coup n'est plus un document.

`Quote` et `Invoice` portent maintenant `issuerSignaturePath`,
`issuerSignatureName`, `issuerSignatureAt`. L'instantané est pris à chaque envoi
explicite, et le rendu le préfère toujours à la signature courante. Un brouillon
n'en a pas et suit le profil : il n'est parti nulle part.

`tests/integration/signature-entreprise.test.ts` vérifie la chaîne complète :
enregistrement, gel à l'envoi, remplacement qui ne touche pas au document déjà
parti, nouveau document qui prend la nouvelle signature, et présence dans les
octets réellement produits — sur une seule page.

## 9. Connexion Google — ce qui existe et ce qui manque

**Tout le code est écrit et n'a pas été touché par cette passe** :

- `src/server/auth/providers/google.ts` vérifie le jeton d'identité avec les
  clés publiques de Google et contrôle l'audience ;
- `src/app/api/auth/google/route.ts` ouvre la session ;
- `src/server/services/identityService.ts` gère le rattachement : une identité
  Google dont l'adresse vérifiée correspond à un compte DEVISERA vérifié est
  rattachée à **ce** compte. Aucun doublon n'est créé, et deux comptes existants
  ne sont jamais fusionnés ;
- côté application, `@react-native-google-signin/google-signin` est installé, le
  bouton officiel est dessiné, et `signInWithGoogle` est branché.

Le bouton n'apparaît pas parce qu'il manque **un identifiant client**, des deux
côtés. C'est délibérément silencieux pour l'utilisateur, et c'était
invérifiable pour l'exploitant : `/api/health` porte désormais un bloc `signIn`
qui compte les audiences acceptées, et le pied du message au support indique si
le binaire embarque un identifiant.

### Ce qu'il reste à faire, hors du dépôt

1. **Google Cloud Console** → un projet DEVISERA → *API et services* →
   *Identifiants* → *Créer des identifiants* → **ID client OAuth** →
   type **iOS**, identifiant de bundle `fr.devisia.app`. Noter l'identifiant
   `…apps.googleusercontent.com`.
2. **Écran de consentement OAuth** : nom d'application DEVISERA, adresse
   d'assistance, lien de politique de confidentialité
   (`devisera.fr/confidentialite`). Publier l'écran.
3. **EAS** : `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` = cet identifiant, sur le profil
   `production` (`mobile/eas.json`). `app.config.ts` en dérive seul le schéma
   d'URL inversé requis par le greffon.
4. **Vercel** : `GOOGLE_SIGN_IN_CLIENT_IDS` = le même identifiant (plusieurs
   séparés par des virgules si un client web s'ajoute un jour). Redéployer.
5. Reconstruire l'application : l'identifiant est figé à la compilation.

Vérification : `/api/health` doit renvoyer `signIn.google.audiences ≥ 1`, et le
bouton apparaît de lui-même au lancement suivant.

## 10. Encaissement — ce qu'il reste à faire chez Stripe

Inchangé depuis le build 55, et toujours à faire :

1. **Webhook Connect** — Stripe → Développeurs → Webhooks → *Ajouter un point de
   terminaison*, en cochant **« Écouter les événements des comptes
   connectés »** : `https://devisia-bice.vercel.app/api/webhooks/stripe-connect`
   Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`,
   `charge.refunded`, `account.updated`.
2. **Vercel** : `STRIPE_CONNECT_WEBHOOK_SECRET` = le secret de signature de ce
   point de terminaison (distinct de `STRIPE_WEBHOOK_SECRET`).

`/api/health` → bloc `payments` : `configured`, `mode`, `subscriptionWebhook`,
`connectWebhook`. Tant que `connectWebhook` est `false`, un client peut payer
sans que la facture passe à « réglée ».

## 11. Tarifs — état d'accès vérifié une fois de plus

Voir `docs/handoff/TARIFS_LANCEMENT.md` pour la procédure. Sur la question
« pouvez-vous les changer vous-même » :

- cette session ne détient aucune clé App Store Connect : zéro variable Apple,
  aucun fichier `.p8`, `~/.app-store` vide, et l'API renvoie 401 sur
  `/v1/apps/6806865251` comme sur `/v1/subscriptionGroups/22361541/subscriptions` ;
- EAS **détient** une clé qui fonctionne : `eas metadata:pull` a bien rapatrié
  la fiche App Store française. Mais cette clé reste sur les serveurs d'Expo —
  elle n'est jamais exposée ici — et `eas metadata` ne couvre que la fiche de
  l'application. Son schéma n'a **aucune** section achat intégré : ni produits,
  ni paliers de prix. Vérifié, pas supposé.

Conclusion : le repricing des trois produits ne peut être fait que depuis App
Store Connect, par une personne ayant les droits. La procédure et les trois
identifiants sont dans le document dédié.

## Vérifications

`tsc` web et mobile, `eslint`, `expo lint`, `next build`, **712 tests**
(96 fichiers), revue visuelle en clair **et** en sombre sur douze écrans à
393 × 852, sans une seule erreur JavaScript. Captures dans
`captures-56-2026-09-17/`, PDF produit dans
`pdf-exemples-2026-09-17/devis-signature-automatique.pdf`.
