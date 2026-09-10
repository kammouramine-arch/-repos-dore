/* ==========================================================================
   RÉVA — main.js
   Modules indépendants, chacun sans effet si son markup est absent.
   Aucune dépendance externe.
   ========================================================================== */

(function () {
  'use strict';

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var euro = function (n) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n);
  };

  /* ------------------------------------------------------------------ */
  /* 01. Chargement de page                                             */
  /* ------------------------------------------------------------------ */
  window.addEventListener('load', function () {
    document.body.classList.remove('preload');
  });
  // Sécurité : si "load" tarde, on libère les transitions rapidement.
  setTimeout(function () { document.body.classList.remove('preload'); }, 600);

  /* ------------------------------------------------------------------ */
  /* 02. Header — état au scroll                                        */
  /* ------------------------------------------------------------------ */
  (function header() {
    var el = $('[data-header]');
    if (!el) return;

    var onScroll = function () {
      el.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  /* ------------------------------------------------------------------ */
  /* 03. Navigation mobile                                              */
  /* ------------------------------------------------------------------ */
  (function mobileNav() {
    var btn = $('[data-nav-toggle]');
    var nav = $('[data-nav]');
    if (!btn || !nav) return;

    var setState = function (open) {
      btn.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
      document.body.classList.toggle('nav-open', open);
    };

    btn.addEventListener('click', function () {
      setState(!nav.classList.contains('is-open'));
    });

    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () { setState(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) setState(false);
    });
  })();

  /* ------------------------------------------------------------------ */
  /* 04. Panier (drawer + état local)                                   */
  /* ------------------------------------------------------------------ */
  var Cart = (function () {
    var drawer  = $('[data-cart]');
    var overlay = $('[data-overlay]');
    var body    = $('[data-cart-body]');
    var foot    = $('[data-cart-foot]');
    var totalEl = $('[data-cart-total]');
    var countEl = $('[data-cart-count]');
    var items   = [];

    try {
      items = JSON.parse(localStorage.getItem('reva:cart') || '[]');
      if (!Array.isArray(items)) items = [];
    } catch (e) { items = []; }

    var save = function () {
      try { localStorage.setItem('reva:cart', JSON.stringify(items)); } catch (e) {}
    };

    var open = function (state) {
      if (!drawer) return;
      drawer.classList.toggle('is-open', state);
      drawer.setAttribute('aria-hidden', String(!state));
      if (overlay) overlay.classList.toggle('is-open', state);
      document.body.classList.toggle('is-locked', state);
      if (state) {
        var close = $('[data-cart-close]', drawer);
        if (close) close.focus();
      }
    };

    var render = function () {
      var count = items.reduce(function (n, i) { return n + i.qty; }, 0);
      var total = items.reduce(function (n, i) { return n + i.qty * i.price; }, 0);

      if (countEl) {
        countEl.textContent = String(count);
        countEl.hidden = count === 0;
      }
      if (totalEl) totalEl.textContent = euro(total);
      if (foot) foot.hidden = count === 0;
      if (!body) return;

      if (!count) {
        body.innerHTML =
          '<div class="drawer__empty">' +
            '<svg viewBox="0 0 24 24"><path d="M6 8h12l1 12H5z" stroke-linejoin="round"/><path d="M9 10V7a3 3 0 0 1 6 0v3" stroke-linecap="round"/></svg>' +
            '<p>Votre panier est vide.<br><span class="muted">Découvrez la collection RÉVA.</span></p>' +
            '<a class="btn btn--sm" href="index.html#collection">Voir la collection</a>' +
          '</div>';
        return;
      }

      body.innerHTML = items.map(function (i, idx) {
        return '' +
          '<div class="drawer-line">' +
            '<div class="drawer-line__media"><img src="' + i.img + '" alt=""></div>' +
            '<div style="display:flex;flex-direction:column;flex:1;min-width:0">' +
              '<p class="drawer-line__name">' + i.name + '</p>' +
              '<p class="drawer-line__meta">' + (i.variant || '') + ' · Qté ' + i.qty + '</p>' +
              '<p class="drawer-line__price">' + euro(i.price * i.qty) + '</p>' +
            '</div>' +
            '<button class="icon-btn" data-cart-remove="' + idx + '" aria-label="Retirer ' + i.name + '">' +
              '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/></svg>' +
            '</button>' +
          '</div>';
      }).join('');
    };

    var add = function (item) {
      var found = items.filter(function (i) {
        return i.name === item.name && i.variant === item.variant;
      })[0];
      if (found) found.qty += item.qty;
      else items.push(item);
      save();
      render();
      open(true);
    };

    if (body) {
      body.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cart-remove]');
        if (!btn) return;
        items.splice(parseInt(btn.getAttribute('data-cart-remove'), 10), 1);
        save();
        render();
      });
    }

    $$('[data-cart-open]').forEach(function (b) {
      b.addEventListener('click', function () { open(true); });
    });
    $$('[data-cart-close]').forEach(function (b) {
      b.addEventListener('click', function () { open(false); });
    });
    if (overlay) overlay.addEventListener('click', function () { open(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) open(false);
    });

    render();
    return { add: add, open: open };
  })();

  /* ------------------------------------------------------------------ */
  /* 05. Révélations au scroll                                          */
  /* ------------------------------------------------------------------ */
  (function reveals() {
    var els = $$('[data-reveal], .split-lines');
    if (!els.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    els.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------------------------ */
  /* 06. Manifeste — mots qui s’allument                                */
  /* ------------------------------------------------------------------ */
  (function manifesto() {
    var block = $('[data-lit]');
    if (!block) return;
    var words = $$('.word', block);
    if (!words.length) return;

    if (reduced) {
      words.forEach(function (w) { w.classList.add('is-lit'); });
      return;
    }

    var update = function () {
      var rect = block.getBoundingClientRect();
      var start = window.innerHeight * 0.85;
      var end = window.innerHeight * 0.25;
      var progress = (start - rect.top) / (start - end);
      progress = Math.max(0, Math.min(1, progress));
      var lit = Math.round(progress * words.length);
      words.forEach(function (w, i) { w.classList.toggle('is-lit', i < lit); });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  })();

  /* ------------------------------------------------------------------ */
  /* 07. Compteurs chiffrés                                             */
  /* ------------------------------------------------------------------ */
  (function counters() {
    var els = $$('[data-count]');
    if (!els.length) return;

    // La valeur finale est écrite dans le HTML (lisible sans JS) : on repart de 0.
    var run = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      if (reduced) { el.textContent = target.toLocaleString('fr-FR'); return; }
      el.textContent = '0';
      var dur = 1600;
      var t0 = performance.now();
      var tick = function (now) {
        var p = Math.min(1, (now - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('fr-FR');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------------------------ */
  /* 08. Carrousel d’avis                                               */
  /* ------------------------------------------------------------------ */
  (function quotes() {
    var root = $('[data-quotes]');
    if (!root) return;

    var track = $('[data-quotes-track]', root);
    var slides = $$('.quote', track);
    var dotsBox = $('[data-quotes-dots]', root);
    var index = 0;
    var timer = null;

    if (slides.length < 2) return;

    slides.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Avis ' + (i + 1));
      b.addEventListener('click', function () { go(i, true); });
      dotsBox.appendChild(b);
    });
    var dots = $$('button', dotsBox);

    function go(i, stop) {
      index = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      dots.forEach(function (d, n) { d.setAttribute('aria-current', String(n === index)); });
      slides.forEach(function (s, n) { s.setAttribute('aria-hidden', String(n !== index)); });
      if (stop) pause();
    }

    function play() {
      if (reduced) return;
      pause();
      timer = setInterval(function () { go(index + 1); }, 7000);
    }
    function pause() { if (timer) { clearInterval(timer); timer = null; } }

    var prev = $('[data-quotes-prev]', root);
    var next = $('[data-quotes-next]', root);
    if (prev) prev.addEventListener('click', function () { go(index - 1, true); });
    if (next) next.addEventListener('click', function () { go(index + 1, true); });

    root.addEventListener('mouseenter', pause);
    root.addEventListener('mouseleave', play);

    // Swipe tactile
    var x0 = null;
    track.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; pause(); }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });

    go(0);
    play();
  })();

  /* ------------------------------------------------------------------ */
  /* 09. Accordéons                                                     */
  /* ------------------------------------------------------------------ */
  (function accordions() {
    var btns = $$('.accordion__btn');
    if (!btns.length) return;

    btns.forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;

      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      panel.style.height = isOpen ? 'auto' : '0px';

      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        var group = btn.closest('[data-accordion-single]');

        if (!open && group) {
          $$('.accordion__btn[aria-expanded="true"]', group).forEach(function (other) {
            var p = document.getElementById(other.getAttribute('aria-controls'));
            other.setAttribute('aria-expanded', 'false');
            if (p) { p.style.height = p.scrollHeight + 'px'; requestAnimationFrame(function () { p.style.height = '0px'; }); }
          });
        }

        btn.setAttribute('aria-expanded', String(!open));
        if (open) {
          panel.style.height = panel.scrollHeight + 'px';
          requestAnimationFrame(function () { panel.style.height = '0px'; });
        } else {
          panel.style.height = panel.scrollHeight + 'px';
          var done = function () {
            panel.style.height = 'auto';
            panel.removeEventListener('transitionend', done);
          };
          panel.addEventListener('transitionend', done);
        }
      });
    });
  })();

  /* ------------------------------------------------------------------ */
  /* 10. Galerie produit                                                */
  /* ------------------------------------------------------------------ */
  (function gallery() {
    var thumbs = $$('[data-thumb]');
    if (!thumbs.length) return;
    var images = $$('[data-gallery-img]');

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var id = thumb.getAttribute('data-thumb');
        thumbs.forEach(function (t) { t.setAttribute('aria-selected', String(t === thumb)); });
        images.forEach(function (img) {
          img.classList.toggle('is-hidden', img.getAttribute('data-gallery-img') !== id);
        });
      });
    });
  })();

  /* ------------------------------------------------------------------ */
  /* 11. Options produit (couleur / taille)                             */
  /* ------------------------------------------------------------------ */
  (function options() {
    $$('[data-option-group]').forEach(function (group) {
      var out = $('[data-option-value="' + group.getAttribute('data-option-group') + '"]');
      $$('[data-option]', group).forEach(function (btn) {
        btn.addEventListener('click', function () {
          $$('[data-option]', group).forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
          if (out) out.textContent = btn.getAttribute('data-option');
        });
      });
    });
  })();

  /* ------------------------------------------------------------------ */
  /* 12. Quantité                                                       */
  /* ------------------------------------------------------------------ */
  (function quantity() {
    $$('[data-qty]').forEach(function (box) {
      var input = $('input', box);
      var clamp = function (v) { return Math.max(1, Math.min(9, v || 1)); };

      $$('[data-qty-step]', box).forEach(function (btn) {
        btn.addEventListener('click', function () {
          input.value = clamp(parseInt(input.value, 10) + parseInt(btn.getAttribute('data-qty-step'), 10));
        });
      });
      input.addEventListener('change', function () { input.value = clamp(parseInt(input.value, 10)); });
    });
  })();

  /* ------------------------------------------------------------------ */
  /* 13. Ajout au panier                                                */
  /* ------------------------------------------------------------------ */
  (function addToCart() {
    $$('[data-add-to-cart]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var qtyInput = $('[data-qty] input');
        var color = $('[data-option-value="couleur"]');
        var size  = $('[data-option-value="taille"]');
        var variant = [color && color.textContent, size && size.textContent].filter(Boolean).join(' · ');

        Cart.add({
          name: btn.getAttribute('data-name'),
          price: parseFloat(btn.getAttribute('data-price')),
          img: btn.getAttribute('data-img'),
          variant: variant,
          qty: qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1
        });
      });
    });
  })();

  /* ------------------------------------------------------------------ */
  /* 14. Barre d’achat collante                                         */
  /* ------------------------------------------------------------------ */
  (function buybar() {
    var bar = $('[data-buybar]');
    var anchor = $('[data-buybar-anchor]');
    if (!bar || !anchor) return;

    var onScroll = function () {
      var past = anchor.getBoundingClientRect().bottom < 0;
      var atEnd = (window.innerHeight + window.scrollY) > (document.body.scrollHeight - 260);
      bar.classList.toggle('is-visible', past && !atEnd);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  })();

  /* ------------------------------------------------------------------ */
  /* 15. Barres de notation                                             */
  /* ------------------------------------------------------------------ */
  (function ratingBars() {
    var bars = $$('[data-bar]');
    if (!bars.length) return;

    var fill = function (bar) { bar.style.width = bar.getAttribute('data-bar') + '%'; };
    if (!('IntersectionObserver' in window)) { bars.forEach(fill); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        fill(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    bars.forEach(function (b) { io.observe(b); });
  })();

  /* ------------------------------------------------------------------ */
  /* 16. Parallaxe légère                                               */
  /* ------------------------------------------------------------------ */
  (function parallax() {
    var els = $$('[data-parallax]');
    if (!els.length || reduced) return;

    var ticking = false;
    var update = function () {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.05;
        var offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
      ticking = false;
    };

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  })();

  /* ------------------------------------------------------------------ */
  /* 17. FAQ — recherche & catégories                                   */
  /* ------------------------------------------------------------------ */
  (function faq() {
    var input = $('[data-faq-search]');
    var groups = $$('[data-faq-group]');
    if (!groups.length) return;

    var empty = $('[data-faq-empty]');
    var tabs = $$('[data-faq-cat]');
    var current = 'all';

    var norm = function (s) {
      return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };

    var apply = function () {
      var q = norm(input ? input.value.trim() : '');
      var visible = 0;

      groups.forEach(function (group) {
        var shown = 0;
        $$('.accordion__item', group).forEach(function (item) {
          var matchCat = current === 'all' || group.getAttribute('data-faq-group') === current;
          var matchTxt = !q || norm(item.textContent).indexOf(q) !== -1;
          var ok = matchCat && matchTxt;
          item.hidden = !ok;
          if (ok) shown++;
        });
        group.hidden = shown === 0;
        visible += shown;
      });

      if (empty) empty.classList.toggle('is-visible', visible === 0);
    };

    if (input) input.addEventListener('input', apply);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        current = tab.getAttribute('data-faq-cat');
        tabs.forEach(function (t) { t.setAttribute('aria-current', String(t === tab)); });
        apply();
      });
    });

    apply();
  })();

  /* ------------------------------------------------------------------ */
  /* 18. Formulaires (contact + newsletter)                             */
  /* ------------------------------------------------------------------ */
  (function forms() {
    var emailRe = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

    var validate = function (field) {
      var control = $('.input, .textarea, .select', field);
      if (!control) return true;
      var value = control.value.trim();
      var ok = true;

      if (control.hasAttribute('required') && !value) ok = false;
      if (ok && control.type === 'email' && value && !emailRe.test(value)) ok = false;
      if (ok && control.tagName === 'SELECT' && control.hasAttribute('required') && !control.value) ok = false;

      field.classList.toggle('has-error', !ok);
      return ok;
    };

    // Formulaire de contact
    var form = $('[data-contact-form]');
    if (form) {
      var fields = $$('.field', form);

      fields.forEach(function (field) {
        var control = $('.input, .textarea, .select', field);
        if (!control) return;
        control.addEventListener('blur', function () { validate(field); });
        control.addEventListener('input', function () {
          if (field.classList.contains('has-error')) validate(field);
        });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var valid = fields.map(validate).every(Boolean);
        var consent = $('[data-consent]', form);
        if (consent && !consent.checked) {
          consent.closest('.checkbox').style.color = '#B4402F';
          valid = false;
        }
        if (!valid) {
          var first = $('.field.has-error .input, .field.has-error .textarea, .field.has-error .select', form);
          if (first) first.focus();
          return;
        }

        var btn = $('button[type="submit"]', form);
        var label = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Envoi en cours…';

        setTimeout(function () {
          btn.disabled = false;
          btn.textContent = label;
          form.reset();
          var success = $('[data-form-success]');
          if (success) {
            success.classList.add('is-visible');
            success.setAttribute('tabindex', '-1');
            success.focus();
          }
        }, 900);
      });
    }

    // Newsletter
    $$('[data-newsletter]').forEach(function (nl) {
      nl.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = $('.input', nl);
        var btn = $('button', nl);
        if (!emailRe.test(input.value.trim())) {
          input.style.borderColor = '#B4402F';
          input.focus();
          return;
        }
        input.style.borderColor = '';
        btn.textContent = 'Merci';
        btn.disabled = true;
        input.value = '';
        input.placeholder = 'Inscription confirmée';
        setTimeout(function () {
          btn.textContent = 'S’inscrire';
          btn.disabled = false;
          input.placeholder = 'Votre e-mail';
        }, 3200);
      });
    });
  })();

  /* ------------------------------------------------------------------ */
  /* 19. Lien actif dans la navigation                                  */
  /* ------------------------------------------------------------------ */
  (function activeLink() {
    var page = location.pathname.split('/').pop() || 'index.html';
    $$('.nav__link').forEach(function (link) {
      var href = link.getAttribute('href').split('#')[0];
      if (href && href === page) link.setAttribute('aria-current', 'page');
    });
  })();

})();
