# ONDÉE — audit de pré-lancement

Audit conduit avant l'engagement de 1 500 € de publicité. 66 constats
(24 critiques, 36 majeurs, 6 mineurs) sur neuf dimensions : conformité
juridique, véracité des allégations, conversion, mobile, panier et
paiement, expédition et fiscalité, SEO et métadonnées, performance,
qualité du thème.

Ce document consigne ce qui a été corrigé, ce qui reste à vérifier et ce
qui bloque le lancement. Il est volontairement séparé du dossier
commercial : on ne mélange pas ce qu'on espère et ce qu'on a constaté.

---

## 1. Allégations — corrigé

| Ce qui était publié | Pourquoi c'était un problème | Ce qui est publié maintenant |
|---|---|---|
| « Mesure réalisée sur un réseau à 0,32 mg/L de chlore libre, à 38 °C, sur cartouche neuve » | **Aucune mesure n'a jamais été réalisée.** Allégation de fait fausse sur un site marchand (art. L.121-2 code de la consommation) | Un schéma de principe, plus l'aveu explicite qu'aucun essai n'a encore été mené et que les valeurs seront publiées le jour où il le sera |
| Bandelettes avant/après portant « 0,32 mg/L » et « < 0,02 mg/L » | Mêmes valeurs inventées, présentées comme un relevé | « AMBRE » / « CLAIRE » — la couleur, pas un chiffre |
| Implication d'une conformité NSF/ANSI 177 | Norme invoquée pour un produit non certifié | « Notre produit n'est pas certifié NSF/ANSI 177 et nous ne le prétendons pas » |
| « environ 15 000 litres » | Démenti par les hypothèses du site lui-même (5 000 à 10 000 L) | Retiré. Aucune capacité en litres tant qu'elle n'est pas mesurée |
| « ONDÉE **retire** le chlore » (accueil, héros, fiche, SEO) | Annonce une élimination totale ; le produit ne peut revendiquer qu'une réduction | « ONDÉE **réduit** le chlore » partout |
| « L'odeur de chlore disparaît dès la première douche » | Donné comme une certitude systématique | « en général le premier changement perçu, dès les premières douches » |
| Bandeau chiffres : « +60 % des foyers reçoivent une eau dure », « 34,4 °f en Hauts-de-France » | Promet un bénéfice anti-calcaire que le produit ne délivre pas — en 2ᵉ position de la page d'accueil, trois écrans avant le démenti | Deux chiffres qui portent sur le chlore et la preuve : « 2 bandelettes de test dans chaque boîte », « 0 € — le rapport d'eau est gratuit » |
| « les utilisateurs rapportent moins de ternissement » | La boutique n'a jamais vendu | « le bénéfice le plus souvent cité par les utilisateurs de filtres à chlore en général — pas par les nôtres, nous n'en avons pas encore » |
| « nous avons conçu le produit autour du problème » | Le produit est un article de catalogue pris en marque blanche | « Nous avons retenu un format à section de passage large plutôt qu'une cartouche compacte » |
| Fiche technique : billes minérales, 4 à 80 °C, pression 1 à 6 bar, tamis 5 µm | Cinq spécifications sans source, dont des billes minérales que la page d'accueil dénonce chez les concurrents | « Caractéristiques annoncées par le fabricant », billes minérales retirées, plages non sourcées remplacées par « selon les indications du fabricant, à confirmer sur l'échantillon » |
| « Les performances de filtration doivent être confirmées par le rapport d'essai du fabricant avant toute publication commerciale » | Note de travail interne **publiée sur la fiche produit** | Reformulée en engagement client : « Nous ferons analyser une cartouche par un laboratoire indépendant et nous publierons le rapport, quel qu'en soit le résultat » |
| « environ 12 centimes par douche, puis 6 » | Faux d'un facteur deux | « environ 25 centimes la première année, puis environ 11 », calcul détaillé |
| Chiffres Jolie / Hello Klean | Repris sans attribution ni date | « Chiffres communiqués par ces sociétés et relayés par la presse spécialisée en 2024-2025 ; nous ne les avons pas audités » |
| Six avis clients avec badge « Achat vérifié » dans les fichiers de prévisualisation | Faux avis — pratique commerciale trompeuse (directive Omnibus, art. L.121-4 11°) | Supprimés partout. Remplacés par une section « Nous n'avons pas encore d'avis clients » qui l'assume et explique ce qu'on met à la place |

## 2. Conformité — corrigé

- **Encadré de garantie légale** : il était tronqué exactement sur les
  parties favorables au consommateur. Rétabli intégralement (extension de
  6 mois après réparation, renouvellement de 2 ans après remplacement, les
  quatre cas ouvrant droit à réduction du prix ou résolution, résolution
  immédiate si le défaut est grave, suspension pendant l'immobilisation,
  amende civile de l'art. L.241-5, vices cachés).
- **Formulaire type de rétractation** ajouté aux CGV, ainsi que le délai de
  14 jours pour renvoyer le produit après notification.
- **Exception d'hygiène** sur les cartouches descellées (art. L.221-28 3°)
  désormais visible sur la fiche cartouche, pas seulement dans les CGV.
- **Pièces détachées** (art. L.111-4) : engagement de disponibilité 5 ans.
- **Plateforme européenne RLL** : le service a fermé le 20 juillet 2025.
  Les deux renvois sont remplacés par le Centre européen des consommateurs.
- **Formulaire de contact** : mention RGPD complète (finalité, base légale,
  durée de conservation, droits, CNIL).
- **Abonnement** : il n'existait pas techniquement — aucun `sellingPlanGroup`,
  aucune app. Il était pourtant vendu avec un discours de prélèvement
  récurrent, un préavis de 4 jours et une résiliation « en deux clics ».
  La variante C90-ABO est supprimée, l'article 8 des CGV réécrit, les
  encarts et FAQ reformulés en achat unique.
- **Prix barrés** : 155 € et 196 € sur des articles jamais vendus à ce prix.
  Shopify les transforme en pourcentage de réduction, donc en annonce de
  réduction soumise à la règle des 30 jours (directive Omnibus). Les
  `compareAtPrice` sont retirés ; l'économie est désormais énoncée en clair
  (« 38 € de moins que les mêmes articles achetés séparément »).
- **Frais de port** : le site annonçait 7,90 € pour la Belgique, le
  Luxembourg et la Suisse, et 7,90 € pour la Corse. Le paramétrage réel est
  9,90 € pour l'UE, rien du tout pour la Suisse (méthode inactive), et la
  Corse est dans la zone France. Textes alignés sur le paramétrage.
- **Point relais Mondial Relay** : vendu 4,90 € sans sélecteur de point
  relais, donc infulfillable. Méthode supprimée en attendant l'app.

## 3. Conversion — corrigé

- **Rapport d'eau sans issue commerciale.** L'outil consommait l'intention
  au lieu de la convertir. Un appel à l'achat apparaît maintenant après un
  verdict favorable (chlore ≥ 0,05 mg/L) — et **rien** après un verdict
  défavorable, où le site continue de dire de garder son argent. Testé sur
  trois jeux de données : Lille 0,20 → CTA, Nantes 0,07 → CTA, Toulouse
  0,02 → aucun CTA.
- **Packs de la page d'accueil.** Ils ressemblaient à des boutons radio et
  ajoutaient au panier à chaque clic : trois hésitations = trois lignes.
  Sélection et ajout sont découplés, avec un `role="radiogroup"`, la
  navigation au clavier et un unique bouton d'ajout qui affiche le prix de
  la formule choisie. Vérifié en navigateur : 0 ligne au chargement,
  0 ligne après deux changements de sélection, 1 ligne après le clic.
- **Ancrage de prix.** Tout le site ancrait à 59 € alors que le modèle
  repose sur le set à 79 € (35,51 € de marge contre 25,62 €). La fiche
  produit sélectionne désormais le set par défaut, avec le ruban
  « Notre recommandation ».
- **« Le plus choisi »** sur un produit jamais vendu → « Notre recommandation ».
- **Références SKU** affichées dans les sélecteurs → contenu réel de la
  boîte, plus le prix à la cartouche sur les paliers concernés.
- **/pages/mon-eau** — premier item du menu et cible de deux concepts
  publicitaires — ne contenait pas l'outil qu'elle annonce. Template
  `page.mon-eau.json` créé et affecté.
- **Menu principal** : « Le filtre » et « Cartouches » pointaient sur des
  collections intermédiaires qui ré-ancraient le prix à 59 €. Ils pointent
  maintenant sur les fiches produit.
- **Tiroir panier** : le bouton « Passer commande » renvoyait à la page
  panier, pas au paiement. Il va sur `/checkout`, avec un lien secondaire
  « Voir le panier ».
- **Page panier** : ni jauge de port offert, ni réassurance, ni vente
  croisée. Les trois ajoutés (la vente croisée n'affiche que ce qui n'est
  pas déjà au panier).
- **Ordre des sections** : le prix apparaissait après six écrans. La
  section offre remonte en position 6, juste après les étapes.
- **CTA final** : il déconseillait l'achat une septième fois sans jamais
  proposer d'acheter. Il propose maintenant le set à 79 €, en gardant le
  lien vers le rapport d'eau et la phrase sur l'eau peu chlorée.
- **Héros** : visuel animé au chargement (donc invisible les premières
  centaines de millisecondes sur la page d'atterrissage publicitaire) →
  animation retirée. Le H1 nomme désormais le produit.
- **Pied de page** : trois colonnes strictement identiques → trois menus
  distincts. Moyens de paiement annoncés alors qu'aucun n'est actif →
  réglage vidé, à remplir quand Shopify Payments sera activé.
- **Liens morts** : CGV, mentions légales et confidentialité sont en
  brouillon et renvoyaient un 404 depuis le pied de page. Les trois entrées
  sont retirées du menu en attendant la publication des pages.

## 4. Photos produit

Aucune photographie du produit réel n'existe : l'échantillon n'a pas été
commandé, et les visuels du fournisseur sont protégés et portent une marque
tierce. Plutôt que de fabriquer de fausses photos, douze illustrations
techniques ont été produites, sans ambiguïté sur leur nature (mention
« Illustration ONDÉE ») et attachées aux trois produits avec un texte
alternatif complet. Elles ne remplacent pas des photos : elles évitent une
fiche vide et un catalogue publicitaire impossible.

Photos à obtenir dès réception de l'échantillon — la liste est dans le
rapport de session.

## 5. Ce qui n'a pas pu être corrigé depuis cette session

- Politiques de boutique au paiement : le connecteur n'a pas le droit
  `write_legal_policies`.
- Suppression des thèmes périmés : bloquée par la politique de sécurité de
  l'outil. Les thèmes ont été renommés pour lever toute ambiguïté.
- Tout ce qui suppose une entité juridique, un moyen de paiement, une
  adresse e-mail de marque, un médiateur, un identifiant ADEME : ce sont des
  démarches, pas du code.
