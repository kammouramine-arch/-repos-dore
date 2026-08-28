/* ══════════════════════════════════════════════════════════════
   ONDÉE — JavaScript
   Modules indépendants. Chacun sort sans rien casser si son
   markup est absent. Aucune dépendance externe.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Format ─────────────────────────────────────────────── */
  var euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
  var nb1  = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var nb2  = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function dateFr (iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  /* ── 1. Année du copyright ──────────────────────────────── */
  $$('[data-annee]').forEach(function (e) { e.textContent = new Date().getFullYear(); });

  /* ── 2. Header collé ────────────────────────────────────── */
  (function () {
    var h = $('[data-header]');
    if (!h) return;
    var maj = function () { h.classList.toggle('est-colle', window.scrollY > 8); };
    maj();
    window.addEventListener('scroll', maj, { passive: true });
  })();

  /* ── 3. Navigation mobile ───────────────────────────────── */
  (function () {
    var b = $('[data-nav-toggle]'), n = $('[data-nav]');
    if (!b || !n) return;
    var bascule = function (ouvrir) {
      var o = ouvrir === undefined ? !document.body.classList.contains('nav-ouverte') : ouvrir;
      document.body.classList.toggle('nav-ouverte', o);
      b.setAttribute('aria-expanded', String(o));
      b.setAttribute('aria-label', o ? 'Fermer le menu' : 'Ouvrir le menu');
    };
    b.addEventListener('click', function () { bascule(); });
    $$('a', n).forEach(function (a) { a.addEventListener('click', function () { bascule(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') bascule(false); });
  })();

  /* ── 4. Révélations au scroll ───────────────────────────── */
  (function () {
    var els = $$('.rev');
    if (!els.length) return;
    if (reduit || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('est-vu'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en, i) {
        if (!en.isIntersecting) return;
        var el = en.target;
        setTimeout(function () { el.classList.add('est-vu'); }, Math.min(i * 70, 350));
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  })();

  /* ── 5. Accordéons (FAQ + fiche produit) ────────────────── */
  function accordeon (racine, selI, selQ, selR) {
    $$(selI, racine).forEach(function (item) {
      var q = $(selQ, item), r = $(selR, item);
      if (!q || !r) return;
      q.addEventListener('click', function () {
        var ouvert = item.hasAttribute('data-ouvert');
        if (ouvert) {
          r.style.height = r.scrollHeight + 'px';
          requestAnimationFrame(function () { r.style.height = '0px'; });
          item.removeAttribute('data-ouvert');
          q.setAttribute('aria-expanded', 'false');
        } else {
          item.setAttribute('data-ouvert', '');
          q.setAttribute('aria-expanded', 'true');
          r.style.height = r.scrollHeight + 'px';
          var fin = function () { r.style.height = 'auto'; r.removeEventListener('transitionend', fin); };
          if (reduit) fin(); else r.addEventListener('transitionend', fin);
        }
      });
    });
  }
  $$('[data-faq]').forEach(function (f) { accordeon(f, '.faq__i', '.faq__q', '.faq__r'); });
  $$('[data-accord]').forEach(function (f) { accordeon(f, '.accord__i', '.accord__q', '.accord__r'); });

  /* ── 6. Notification légère ─────────────────────────────── */
  var toast = (function () {
    var el = $('[data-toast]'), t;
    return function (msg) {
      if (!el) return;
      el.textContent = msg;
      el.classList.add('est-visible');
      clearTimeout(t);
      t = setTimeout(function () { el.classList.remove('est-visible'); }, 2600);
    };
  })();

  /* ── 7. Panier ───────────────────────────────────────────
     Deux modes :
       · Shopify  → API AJAX /cart/*.js (window.ONDEE présent)
       · Statique → localStorage (prévisualisation hors Shopify)
     -------------------------------------------------------- */
  var SHOPIFY = !!(window.ONDEE && window.ONDEE.routes);

  function prixCts (centimes) {
    return (centimes / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }

  var Panier = (function () {
    var CLE = 'ondee.panier.v1';
    var items = [];
    if (!SHOPIFY) {
      try { items = JSON.parse(localStorage.getItem(CLE)) || []; } catch (e) { items = []; }
    }
    function sauver () { try { localStorage.setItem(CLE, JSON.stringify(items)); } catch (e) {} }
    function total () { return items.reduce(function (s, i) { return s + i.prix * i.qte; }, 0); }
    function nombre () { return items.reduce(function (s, i) { return s + i.qte; }, 0); }
    function majCompteur (n) {
      $$('[data-panier-n]').forEach(function (e) { e.textContent = n; e.hidden = n === 0; });
    }

    /* Barre de progression vers le port offert.
       Le seuil vient des réglages du thème : il doit correspondre
       exactement au profil d'expédition Shopify, sinon on ment. */
    function majPortOffert (totalCents) {
      var zone = $('[data-port-offert]');
      if (!zone) return;
      var seuil = (window.ONDEE && window.ONDEE.portOffertCents) || 4900;
      if (!totalCents) { zone.hidden = true; return; }
      zone.hidden = false;
      var reste = seuil - totalCents;
      var pct = Math.max(0, Math.min(100, (totalCents / seuil) * 100));
      var txt = $('[data-port-offert-txt]', zone);
      var jauge = $('[data-port-offert-jauge]', zone);
      if (reste > 0) {
        zone.classList.remove('port-offert--atteint');
        if (txt) txt.innerHTML = 'Plus que <b>' + prixCts(reste) + '</b> pour la livraison offerte';
      } else {
        zone.classList.add('port-offert--atteint');
        if (txt) txt.innerHTML = '<b>Livraison offerte</b> — c\'est acquis';
      }
      if (jauge) jauge.style.width = pct + '%';
    }

    function rendreStatique () {
      majCompteur(nombre());
      majPortOffert(Math.round(total() * 100));
      $$('[data-panier-total]').forEach(function (e) { e.textContent = euro.format(total()); });
      var corps = $('[data-panier-corps]');
      if (!corps) return;
      if (!items.length) { corps.innerHTML = '<p class="tiroir__vide">Votre panier est vide.</p>'; return; }
      corps.innerHTML = items.map(function (i, idx) {
        return '<div class="ligne">' +
          '<div class="ligne__v"><img src="' + (i.img || 'assets/img/pommeau.svg') + '" alt="" width="56" height="56"></div>' +
          '<div><div class="ligne__t">' + i.titre + '</div>' +
          (i.opt ? '<div class="ligne__o">' + i.opt + '</div>' : '') +
          '<div class="ligne__o">Quantité : ' + i.qte + '</div>' +
          '<button class="ligne__sup" type="button" data-sup="' + idx + '">Retirer</button></div>' +
          '<div class="ligne__p">' + euro.format(i.prix * i.qte) + '</div></div>';
      }).join('');
      $$('[data-sup]', corps).forEach(function (b) {
        b.addEventListener('click', function () {
          items.splice(parseInt(b.getAttribute('data-sup'), 10), 1);
          sauver(); rendreStatique();
        });
      });
    }

    function rendreShopify (panier) {
      majCompteur(panier.item_count);
      majPortOffert(panier.total_price);
      $$('[data-panier-total]').forEach(function (e) { e.textContent = prixCts(panier.total_price); });
      var corps = $('[data-panier-corps]');
      if (!corps) return;
      if (!panier.item_count) { corps.innerHTML = '<p class="tiroir__vide">Votre panier est vide.</p>'; return; }
      corps.innerHTML = panier.items.map(function (i, idx) {
        var opt = (i.variant_title && i.variant_title.indexOf('Default') === -1) ? i.variant_title : '';
        return '<div class="ligne">' +
          '<div class="ligne__v">' + (i.image ? '<img src="' + i.image + '" alt="" width="56" height="56" loading="lazy">' : '') + '</div>' +
          '<div><div class="ligne__t">' + i.product_title + '</div>' +
          (opt ? '<div class="ligne__o">' + opt + '</div>' : '') +
          '<div class="ligne__o">Quantité : ' + i.quantity + '</div>' +
          '<button class="ligne__sup" type="button" data-sup-ligne="' + (idx + 1) + '">Retirer</button></div>' +
          '<div class="ligne__p">' + prixCts(i.final_line_price) + '</div></div>';
      }).join('');
      $$('[data-sup-ligne]', corps).forEach(function (b) {
        b.addEventListener('click', function () { majLigne(parseInt(b.getAttribute('data-sup-ligne'), 10), 0); });
      });
    }

    function rafraichir () {
      if (!SHOPIFY) { rendreStatique(); return Promise.resolve(); }
      return fetch(window.ONDEE.routes.cart, { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json(); }).then(rendreShopify).catch(function () {});
    }

    function majLigne (ligne, qte) {
      return fetch(window.ONDEE.routes.cart_change, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ line: ligne, quantity: qte })
      }).then(function (r) { return r.json(); }).then(rendreShopify);
    }

    function ouvrir (o) {
      var v = o === undefined ? !document.body.classList.contains('panier-ouvert') : o;
      document.body.classList.toggle('panier-ouvert', v);
      var t = $('[data-panier]');
      if (t) t.setAttribute('aria-hidden', String(!v));
    }

    function ajouter (item) {
      if (SHOPIFY) {
        if (!item.variantId) { toast('Variante indisponible.'); return Promise.resolve(); }
        return fetch(window.ONDEE.routes.cart_add, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ items: [{ id: item.variantId, quantity: item.qte || 1 }] })
        })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (res) {
            if (!res.ok) { toast(res.d.description || res.d.message || 'Ajout impossible.'); return; }
            return rafraichir().then(function () {
              ouvrir(true);
              toast(item.titre + ' ajouté au panier');
            });
          })
          .catch(function () { toast('Ajout impossible. Réessayez.'); });
      }
      var e = items.filter(function (i) { return i.ref === item.ref && i.opt === item.opt; })[0];
      if (e) e.qte += item.qte; else items.push(item);
      sauver(); rendreStatique(); ouvrir(true);
      toast(item.titre + ' ajouté au panier');
      return Promise.resolve();
    }

    return { ajouter: ajouter, rendre: rafraichir, ouvrir: ouvrir, majLigne: majLigne, estShopify: SHOPIFY };
  })();
  Panier.rendre();

  $$('[data-panier-ouvrir]').forEach(function (b) { b.addEventListener('click', function () { Panier.ouvrir(true); }); });
  $$('[data-panier-fermer],[data-voile]').forEach(function (b) { b.addEventListener('click', function () { Panier.ouvrir(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') Panier.ouvrir(false); });

  var chk = $('[data-checkout]');
  if (chk && !SHOPIFY) chk.addEventListener('click', function (e) {
    e.preventDefault();
    toast('Démo statique : branchez le panier Shopify pour finaliser.');
  });

  /* Boutons « ajouter » génériques (hors packs de l'accueil) */
  $$('[data-ajout]').forEach(function (b) {
    b.addEventListener('click', function () {
      Panier.ajouter({
        variantId: b.getAttribute('data-variant-id'),
        ref:   b.getAttribute('data-ref'),
        titre: b.getAttribute('data-titre'),
        opt:   b.getAttribute('data-opt') || '',
        prix:  parseFloat(b.getAttribute('data-prix')),
        qte:   1,
        img:   b.getAttribute('data-img') || 'assets/img/pommeau.svg'
      });
    });
  });

  /* Packs de la page d'accueil : la sélection ne met RIEN au panier.
     Un seul bouton d'ajout, sous la grille, lit la formule sélectionnée. */
  (function () {
    var grille = $('[data-packs-accueil]');
    var bouton = $('[data-ajout-packs]');
    if (!grille || !bouton) return;
    var packs = $$('.pack', grille);
    var prixLabel = $('[data-prix-packs]', bouton);

    function selection() {
      return packs.filter(function (p) { return p.getAttribute('aria-checked') === 'true'; })[0] || packs[0];
    }
    function peindre(actif) {
      packs.forEach(function (p) {
        var on = p === actif;
        p.setAttribute('aria-checked', String(on));
        p.setAttribute('aria-pressed', String(on));
      });
      if (prixLabel) prixLabel.textContent = actif.getAttribute('data-prix-affiche') || '';
    }
    packs.forEach(function (p) {
      p.addEventListener('click', function () { peindre(p); });
      p.addEventListener('keydown', function (e) {
        var i = packs.indexOf(p), n = packs.length, j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   j = (i - 1 + n) % n;
        if (j === null) return;
        e.preventDefault(); packs[j].focus(); peindre(packs[j]);
      });
    });
    peindre(selection());

    bouton.addEventListener('click', function () {
      var b = selection();
      if (!b || b.hasAttribute('disabled')) return;
      Panier.ajouter({
        variantId: b.getAttribute('data-variant-id'),
        ref:   b.getAttribute('data-ref'),
        titre: b.getAttribute('data-titre'),
        opt:   b.getAttribute('data-opt') || '',
        prix:  parseFloat(b.getAttribute('data-prix')),
        qte:   1,
        img:   b.getAttribute('data-img') || 'assets/img/pommeau.svg'
      });
    });
  }());

  /* Quantité sur la page panier Shopify */
  $$('[data-qte-panier]').forEach(function (g) {
    var input = $('input', g);
    $$('button', g).forEach(function (b) {
      b.addEventListener('click', function () {
        var ligne = parseInt(b.getAttribute('data-ligne'), 10);
        var d = b.getAttribute('data-qte-pas') === '+' ? 1 : -1;
        var q = Math.max(0, (parseInt(input.value, 10) || 1) + d);
        input.value = q;
        if (SHOPIFY) Panier.majLigne(ligne, q).then(function () { window.location.reload(); });
      });
    });
  });
  /* ── 8. LE RAPPORT D'EAU — API Hub'Eau + geo.api.gouv.fr ──
     Deux API publiques françaises, sans clé, avec CORS ouvert.
       · geo.api.gouv.fr        → commune / code postal → code INSEE
       · hubeau.eaufrance.fr    → relevés SISE-Eaux du ministère de la Santé
     ------------------------------------------------------------------- */
  (function () {
    var input = $('#commune');
    if (!input) return;

    var sugg    = $('#sugg');
    var etat    = $('[data-rapport-etat]');
    var fiche   = $('[data-rapport-fiche]');
    var verdict = $('[data-rapport-verdict]');
    var lancer  = $('[data-rapport-lancer]');
    var repos   = $('[data-rapport-repos]');

    var API_GEO = 'https://geo.api.gouv.fr/communes';
    var API_EAU = 'https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/resultats_dis';
    var PARAMS  = 'TH,CL2LIB,CL2TOT,THM4';

    var timer, choix = null, communes = [], curseur = -1;

    function dire (msg) { if (etat) etat.textContent = msg || ''; }

    /* — autocomplétion — */
    function chercher (q) {
      var estCP = /^\d{2,5}$/.test(q);
      var url = estCP
        ? API_GEO + '?codePostal=' + encodeURIComponent(q) + '&fields=nom,code,codesPostaux,population&limit=8'
        : API_GEO + '?nom=' + encodeURIComponent(q) + '&fields=nom,code,codesPostaux,population&boost=population&limit=8';

      fetch(url)
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (d) {
          communes = Array.isArray(d) ? d : [];
          curseur = -1;
          if (!sugg) return;
          sugg.innerHTML = communes.map(function (c, i) {
            return '<li role="option" id="sugg-' + i + '" data-i="' + i + '">' +
                   '<span style="font-family:inherit;color:inherit">' + c.nom + '</span>' +
                   '<span>' + ((c.codesPostaux && c.codesPostaux[0]) || c.code) + '</span></li>';
          }).join('');
          input.setAttribute('aria-expanded', String(communes.length > 0));
          $$('li', sugg).forEach(function (li) {
            li.addEventListener('click', function () { choisir(communes[parseInt(li.getAttribute('data-i'), 10)]); });
          });
        })
        .catch(function () { dire('Recherche de commune indisponible pour le moment.'); });
    }

    function choisir (c) {
      if (!c) return;
      choix = c;
      input.value = c.nom;
      if (sugg) sugg.innerHTML = '';
      input.setAttribute('aria-expanded', 'false');
      analyser(c);
    }

    input.addEventListener('input', function () {
      choix = null;
      var q = input.value.trim();
      clearTimeout(timer);
      if (q.length < 2) { if (sugg) sugg.innerHTML = ''; return; }
      timer = setTimeout(function () { chercher(q); }, 220);
    });

    input.addEventListener('keydown', function (e) {
      if (!sugg || !communes.length) {
        if (e.key === 'Enter') { e.preventDefault(); if (lancer) lancer.click(); }
        return;
      }
      var lis = $$('li', sugg);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        curseur = e.key === 'ArrowDown'
          ? Math.min(curseur + 1, lis.length - 1)
          : Math.max(curseur - 1, 0);
        lis.forEach(function (li, i) { li.setAttribute('aria-selected', String(i === curseur)); });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        choisir(communes[curseur >= 0 ? curseur : 0]);
      } else if (e.key === 'Escape') {
        sugg.innerHTML = '';
      }
    });

    if (lancer) lancer.addEventListener('click', function () {
      if (choix) return analyser(choix);
      var q = input.value.trim();
      if (q.length < 2) { dire('Entrez le nom de votre commune ou votre code postal.'); return; }
      dire('Recherche de la commune…');
      var estCP = /^\d{2,5}$/.test(q);
      fetch(API_GEO + (estCP ? '?codePostal=' : '?nom=') + encodeURIComponent(q) +
            '&fields=nom,code&boost=population&limit=1')
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.length) choisir(d[0]);
          else dire('Commune introuvable. Vérifiez l\'orthographe ou essayez le code postal.');
        })
        .catch(function () { dire('Service momentanément indisponible. Réessayez dans un instant.'); });
    });

    /* — interrogation Hub'Eau — */
    function analyser (c) {
      dire('Lecture des relevés officiels pour ' + c.nom + '…');
      if (fiche)   fiche.hidden = true;
      if (verdict) verdict.hidden = true;
      if (repos)   repos.hidden = true;

      var url = API_EAU + '?code_commune=' + encodeURIComponent(c.code) +
                '&code_parametre_se=' + PARAMS +
                '&size=60&sort=desc' +
                '&fields=code_parametre_se,libelle_parametre,resultat_numerique,libelle_unite,' +
                'date_prelevement,nom_distributeur,conclusion_conformite_prelevement';

      fetch(url)
        .then(function (r) {
          if (!r.ok && r.status !== 206) throw new Error('http');
          return r.json();
        })
        .then(function (d) { afficher(c, (d && d.data) || []); })
        .catch(function () {
          dire('Impossible de joindre l\'API Hub\'Eau pour le moment. Réessayez dans quelques minutes.');
        });
    }

    /* moyenne des N relevés les plus récents d'un paramètre */
    function agreger (lignes, code, n) {
      var v = lignes
        .filter(function (l) { return l.code_parametre_se === code && typeof l.resultat_numerique === 'number'; })
        .slice(0, n || 6);
      if (!v.length) return null;
      var s = v.reduce(function (a, l) { return a + l.resultat_numerique; }, 0);
      return {
        moy:   s / v.length,
        n:     v.length,
        unite: v[0].libelle_unite || '',
        date:  v[0].date_prelevement
      };
    }

    function classerDurete (th) {
      if (th < 8)  return { txt: 'Très douce',        cls: 'puce--ok' };
      if (th < 15) return { txt: 'Douce',             cls: 'puce--ok' };
      if (th < 25) return { txt: 'Moyennement dure',  cls: 'puce--attention' };
      if (th < 35) return { txt: 'Dure',              cls: 'puce--attention' };
      return               { txt: 'Très dure',        cls: 'puce--alerte' };
    }

    function ligne (dt, dd, sous) {
      return '<div class="fiche__l"><dt>' + dt + '</dt><dd>' + dd +
             (sous ? '<small>' + sous + '</small>' : '') + '</dd></div>';
    }

    function afficher (c, lignes) {
      if (!lignes.length) {
        if (repos) repos.hidden = false;
        dire('Aucun relevé publié pour ' + c.nom + ' sur les paramètres suivis. Cela arrive pour les très petites communes rattachées à une unité de distribution voisine.');
        return;
      }

      var th   = agreger(lignes, 'TH');
      var cl   = agreger(lignes, 'CL2LIB');
      var clt  = agreger(lignes, 'CL2TOT');
      var thm  = agreger(lignes, 'THM4');
      var dist = (lignes.filter(function (l) { return l.nom_distributeur; })[0] || {}).nom_distributeur;
      var conf = (lignes.filter(function (l) { return l.conclusion_conformite_prelevement; })[0] || {}).conclusion_conformite_prelevement;
      var dern = lignes[0] && lignes[0].date_prelevement;

      var html = '';
      html += ligne('Commune', c.nom, dist ? 'Distributeur : ' + dist : '');
      html += ligne('Dernier prélèvement publié', dateFr(dern), 'Contrôle sanitaire ARS');

      if (th) {
        var k = classerDurete(th.moy);
        html += ligne('Dureté (TH)',
          nb1.format(th.moy) + ' °f <span class="puce ' + k.cls + '">' + k.txt + '</span>',
          'Moyenne des ' + th.n + ' derniers relevés');
      }
      if (cl) {
        html += ligne('Chlore libre',
          nb2.format(cl.moy) + ' mg/L',
          'Moyenne des ' + cl.n + ' derniers relevés');
      }
      if (clt) {
        html += ligne('Chlore total',
          nb2.format(clt.moy) + ' mg/L',
          'Libre + combiné (chloramines)');
      }
      if (thm) {
        html += ligne('Trihalométhanes',
          nb1.format(thm.moy) + ' µg/L',
          'Sous-produits de chloration · limite réglementaire 100 µg/L');
      }
      if (conf) {
        /* Les conclusions de l'ARS distinguent deux niveaux :
           · « limites de qualité »    → seuils sanitaires opposables
           · « références de qualité » → indicateurs de confort (turbidité,
             équilibre calco-carbonique…) sans portée sanitaire directe.
           Nous affichons les trois cas distinctement plutôt que de tout
           réduire à « conforme / non conforme ». */
        var c = conf.replace(/\u2019/g, "'").toLowerCase();
        var limitesKO = /non conforme aux limites/.test(c);
        var refsKO    = /(non conforme aux r\u00e9f\u00e9rences|non satisfaisante \u00e0 la r\u00e9f\u00e9rence)/.test(c);
        var etat, cls, sous;
        if (limitesKO) {
          etat = 'Non conforme'; cls = 'puce--alerte';
          sous = 'Un seuil sanitaire est d\u00e9pass\u00e9 \u2014 renseignez-vous aupr\u00e8s de votre ARS';
        } else if (refsKO) {
          etat = 'Conforme'; cls = 'puce--attention';
          sous = 'Seuils sanitaires respect\u00e9s ; un indicateur de confort (turbidit\u00e9, \u00e9quilibre calco-carbonique\u2026) est hors r\u00e9f\u00e9rence';
        } else {
          etat = 'Conforme'; cls = 'puce--ok';
          sous = 'Sur l\'ensemble des param\u00e8tres mesur\u00e9s';
        }
        html += ligne('Conformit\u00e9 r\u00e9glementaire',
          '<span class="puce ' + cls + '">' + etat + '</span>', sous);
      }

      if (fiche) { fiche.innerHTML = html; fiche.hidden = false; }

      /* ── verdict honnête ── */
      var ico = {
        oui: '<svg viewBox="0 0 24 24"><path d="m4 12 6 6L20 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        non: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/></svg>'
      };
      var v = '';
      var chlore = cl ? cl.moy : (clt ? clt.moy : null);

      var achatUtile = false;
      if (chlore !== null && chlore >= 0.10) {
        achatUtile = true;
        v += '<div class="verdict__b verdict__oui">' + ico.oui +
             '<span><b>Ce qu\'ONDÉE vise chez vous</b>Votre réseau est chloré à ' + nb2.format(chlore) +
             ' mg/L en moyenne sur les derniers relevés. C\'est la cible du KDF-55 et du sulfite de calcium. Les deux bandelettes livrées dans la boîte vous diront, chez vous et sur votre eau, ce que le filtre change réellement.</span></div>';
      } else if (chlore !== null && chlore >= 0.05) {
        achatUtile = true;
        v += '<div class="verdict__b verdict__oui">' + ico.oui +
             '<span><b>Chlore présent, mais modéré</b>Les relevés donnent ' + nb2.format(chlore) +
             ' mg/L. Il y a du chlore à réduire, mais nous sommes assez près du seuil où la bandelette de test devient difficile à lire. Commandez si l\'odeur de chlore vous gêne&nbsp;; sinon, rien ne presse.</span></div>';
      } else if (chlore !== null) {
        v += '<div class="verdict__b verdict__non">' + ico.non +
             '<span><b>Votre eau est très peu chlorée</b>Les derniers relevés donnent ' + nb2.format(chlore) +
             ' mg/L, une valeur basse. Le gain d\'un filtre à chlore sera faible chez vous. Nous préférons vous le dire&nbsp;: gardez votre argent, ou testez d\'abord avec des bandelettes vendues quelques euros en pharmacie.</span></div>';
      }

      if (th && th.moy >= 15) {
        v += '<div class="verdict__b verdict__non">' + ico.non +
             '<span><b>Ce qu\'ONDÉE ne retire pas</b>Votre eau titre ' + nb1.format(th.moy) +
             ' °f, elle est ' + classerDurete(th.moy).txt.toLowerCase() +
             '. ONDÉE n\'y changera rien, et aucun pommeau filtrant ne le fera&nbsp;: les ions calcium et magnésium traversent tous les médias filtrants. Pour agir sur le calcaire, il faut un adoucisseur à résine sur l\'arrivée d\'eau du logement.</span></div>';
      } else if (th) {
        v += '<div class="verdict__b verdict__non">' + ico.non +
             '<span><b>Le calcaire n\'est pas votre sujet</b>Votre eau titre ' + nb1.format(th.moy) +
             ' °f : elle est déjà douce. Inutile d\'investir dans un adoucisseur — et inutile d\'acheter ONDÉE en espérant un effet anti-calcaire, il n\'en a aucun. Chez vous, le seul intérêt du filtre est le chlore.</span></div>';
      }

      /* Un verdict favorable est le pic d'intention : on propose l'achat.
         Un verdict défavorable ne vend rien — c'est tout l'intérêt de l'outil. */
      if (achatUtile) {
        v += '<div class="verdict__achat">' +
             '<a class="btn btn--primaire" href="/products/ondee-filtre-de-douche">Filtrer ce chlore — set complet 79 €</a>' +
             '<p class="notes">90 jours pour changer d\'avis · bandelettes de test dans la boîte · retour à notre charge</p>' +
             '</div>';
      }

      if (verdict) { verdict.innerHTML = v; verdict.hidden = !v; }
      dire('Relevés officiels — source SISE-Eaux via Hub\'Eau, consultés à l\'instant.');
    }
  })();

  /* ── 9. Galerie produit ─────────────────────────────────── */
  (function () {
    var gal = $('[data-galerie]');
    if (!gal) return;
    var vues = $$('figure', gal), puces = $$('[data-vue]');
    function aller (i) {
      vues.forEach(function (f, k) { if (k === i) f.setAttribute('data-actif', ''); else f.removeAttribute('data-actif'); });
      puces.forEach(function (b, k) { b.setAttribute('aria-current', String(k === i)); });
    }
    puces.forEach(function (b, i) { b.addEventListener('click', function () { aller(i); }); });
    aller(0);
  })();

  /* ── 10. Sélecteurs d'options ───────────────────────────── */
  $$('[data-groupe-opt]').forEach(function (g) {
    var sortie = $('[data-opt-valeur="' + g.getAttribute('data-groupe-opt') + '"]');
    $$('.opt', g).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.opt', g).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        if (sortie) sortie.textContent = b.textContent.trim();
      });
    });
  });

  /* ── 11. Sélecteur de pack (page produit) ───────────────── */
  (function () {
    var zone = $('[data-packs]');
    if (!zone) return;
    var packs = $$('.pack', zone);
    function choisir (p) {
      packs.forEach(function (o) { o.setAttribute('aria-pressed', String(o === p)); });
      var prix = parseFloat(p.getAttribute('data-prix'));
      var barre = parseFloat(p.getAttribute('data-barre') || '0');
      $$('[data-prix-actuel]').forEach(function (e) { e.textContent = euro.format(prix); });
      $$('[data-prix-barre]').forEach(function (e) {
        if (barre > prix) { e.textContent = euro.format(barre); e.hidden = false; }
        else e.hidden = true;
      });
      $$('[data-eco]').forEach(function (e) {
        if (barre > prix) { e.textContent = '− ' + Math.round((1 - prix / barre) * 100) + ' %'; e.hidden = false; }
        else e.hidden = true;
      });

      /* Shopify : on répercute la variante choisie dans le formulaire,
         et on affiche le prix formaté par Liquid plutôt que le nôtre. */
      var vid = p.getAttribute('data-variant-id');
      if (vid) {
        $$('[data-champ-variante]').forEach(function (c) { c.value = vid; });
        var pf = p.getAttribute('data-prix-fmt'), bf = p.getAttribute('data-barre-fmt');
        if (pf) $$('[data-prix-actuel]').forEach(function (e) { e.textContent = pf; });
        if (bf && barre > prix) $$('[data-prix-barre]').forEach(function (e) { e.textContent = bf; });
      }

      /* Bouton d'ajout désactivé si la variante est en rupture */
      var dispo = p.getAttribute('data-dispo');
      if (dispo !== null) {
        var ko = dispo === 'false';
        $$('[data-pp-ajout],[data-pp-acheter]').forEach(function (b) { b.disabled = ko; });
      }
    }
    packs.forEach(function (p) { p.addEventListener('click', function () { choisir(p); }); });
    choisir(packs.filter(function (p) { return p.getAttribute('aria-pressed') === 'true'; })[0] || packs[0]);
  })();

  /* ── 12. Quantité ───────────────────────────────────────── */
  $$('[data-qte]').forEach(function (g) {
    var i = $('input', g);
    $$('button', g).forEach(function (b) {
      b.addEventListener('click', function () {
        var d = b.getAttribute('data-pas') === '+' ? 1 : -1;
        i.value = Math.max(1, Math.min(20, (parseInt(i.value, 10) || 1) + d));
      });
    });
  });

  /* ── 13. Formulaire produit ─────────────────────────────── */
  (function () {
    var form = $('[data-form-produit]');

    function variantePack () {
      var zone = $('[data-packs]');
      if (!zone) return null;
      return $$('.pack', zone).filter(function (p) { return p.getAttribute('aria-pressed') === 'true'; })[0] || null;
    }
    function qteChoisie () {
      var i = $('[data-qte] input');
      return Math.max(1, parseInt(i && i.value, 10) || 1);
    }

    function ajouter () {
      var actif = variantePack();
      var vid = (form && $('[data-champ-variante]', form) || {}).value ||
                (actif && actif.getAttribute('data-variant-id'));
      return Panier.ajouter({
        variantId: vid,
        ref:   actif ? actif.getAttribute('data-ref') : '',
        titre: (actif && actif.getAttribute('data-titre')) || document.title,
        opt:   actif ? (actif.getAttribute('data-opt') || '') : '',
        prix:  actif ? parseFloat(actif.getAttribute('data-prix')) : 0,
        qte:   qteChoisie(),
        img:   'assets/img/pommeau.svg'
      });
    }

    /* Ajout au panier — on intercepte la soumission pour rester sur la page */
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        ajouter();
      });
    }
    $$('[data-pp-ajout]').forEach(function (b) {
      if (form && form.contains(b)) return;   // déjà géré par le submit
      b.addEventListener('click', function (e) { e.preventDefault(); ajouter(); });
    });

    /* Acheter maintenant — ajout puis redirection vers le paiement */
    $$('[data-pp-acheter]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var r = ajouter();
        if (r && r.then && Panier.estShopify) {
          r.then(function () { window.location = window.ONDEE.routes.checkout; });
        }
      });
    });
  })();

  /* ── 14. Barre d'achat collante (mobile) ────────────────── */
  (function () {
    var barre = $('[data-barre]'), repere = $('[data-barre-repere]');
    if (!barre || !repere) return;
    if (!('IntersectionObserver' in window)) { barre.classList.add('est-visible'); return; }
    new IntersectionObserver(function (e) {
      barre.classList.toggle('est-visible', !e[0].isIntersecting);
    }, { rootMargin: '-120px 0px 0px 0px' }).observe(repere);
  })();

})();
