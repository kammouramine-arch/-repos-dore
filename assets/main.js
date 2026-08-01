/* ==========================================================================
   RÉVA — main.js
   Thème Shopify OS 2.0. Modules indépendants, sans dépendance externe.
   Chaque module est sans effet si son markup est absent, et se réinitialise
   quand l'éditeur de thème recharge une section (shopify:section:load).
   ========================================================================== */

(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var theme = window.RevaTheme || {};
  var routes = theme.routes || {};
  var strings = theme.strings || {};
  var animations = theme.animations !== false;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !animations;
  var locale = theme.locale || 'fr';

  /* ------------------------------------------------------------------ */
  /* 00. Utilitaires                                                     */
  /* ------------------------------------------------------------------ */

  // Formatage monétaire d'après le format de la boutique (shop.money_format).
  function formatMoney(cents, format) {
    var value = (cents || 0) / 100;
    var pattern = format || theme.moneyFormat || '{{amount}}';
    var placeholder = (pattern.match(/\{\{\s*(\w+)\s*\}\}/) || [])[1] || 'amount';

    var decimals = 2;
    var thousands = ',';
    var decimal = '.';

    if (placeholder.indexOf('no_decimals') !== -1) decimals = 0;
    if (placeholder.indexOf('comma_separator') !== -1) { thousands = '.'; decimal = ','; }
    else if (placeholder.indexOf('space_separator') !== -1) { thousands = ' '; decimal = ','; }
    else if (placeholder.indexOf('apostrophe_separator') !== -1) { thousands = "'"; decimal = '.'; }

    var fixed = Math.abs(value).toFixed(decimals);
    var parts = fixed.split('.');
    var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    var amount = parts[1] ? whole + decimal + parts[1] : whole;
    if (value < 0) amount = '-' + amount;

    return pattern.replace(/\{\{\s*\w+\s*\}\}/, amount);
  }

  function post(url, data) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) { return r.json(); });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ------------------------------------------------------------------ */
  /* 01. Chargement de page                                             */
  /* ------------------------------------------------------------------ */
  window.addEventListener('load', function () { document.body.classList.remove('preload'); });
  setTimeout(function () { document.body.classList.remove('preload'); }, 600);

  /* ------------------------------------------------------------------ */
  /* 02. Header — état au scroll                                        */
  /* ------------------------------------------------------------------ */
  (function header() {
    var onScroll = function () {
      var el = $('[data-header]');
      if (!el) return;
      el.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('shopify:section:load', onScroll);
  })();

  /* ------------------------------------------------------------------ */
  /* 03. Navigation mobile                                              */
  /* ------------------------------------------------------------------ */
  (function mobileNav() {
    var setState = function (open) {
      var btn = $('[data-nav-toggle]');
      var nav = $('[data-nav]');
      if (!btn || !nav) return;
      btn.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? (strings.closeMenu || 'Fermer le menu') : (strings.openMenu || 'Ouvrir le menu'));
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
      document.body.classList.toggle('nav-open', open);
    };

    document.addEventListener('click', function (e) {
      var toggle = e.target.closest('[data-nav-toggle]');
      if (toggle) {
        var nav = $('[data-nav]');
        setState(!(nav && nav.classList.contains('is-open')));
        return;
      }
      var link = e.target.closest('[data-nav] a');
      if (link) setState(false);
    });

    document.addEventListener('keydown', function (e) {
      var nav = $('[data-nav]');
      if (e.key === 'Escape' && nav && nav.classList.contains('is-open')) setState(false);
    });
  })();

  /* ------------------------------------------------------------------ */
  /* 04. Panier — API Ajax Shopify                                       */
  /* ------------------------------------------------------------------ */
  var Cart = (function () {
    var useDrawer = theme.cartDrawer !== false;

    var open = function (state) {
      var drawer = $('[data-cart]');
      var overlay = $('[data-overlay]');
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

    var render = function (cart) {
      var body = $('[data-cart-body]');
      var foot = $('[data-cart-foot]');
      var totalEl = $('[data-cart-total]');
      var countEl = $('[data-cart-count]');

      if (countEl) {
        countEl.textContent = String(cart.item_count);
        countEl.hidden = cart.item_count === 0;
      }
      if (totalEl) totalEl.textContent = formatMoney(cart.total_price);
      if (foot) foot.hidden = cart.item_count === 0;
      if (!body) return;

      if (!cart.item_count) {
        body.innerHTML =
          '<div class="drawer__empty">' +
            '<svg viewBox="0 0 24 24"><path d="M6 8h12l1 12H5z" stroke-linejoin="round"/><path d="M9 10V7a3 3 0 0 1 6 0v3" stroke-linecap="round"/></svg>' +
            '<p>' + escapeHtml(strings.cartEmptyTitle || '') + '<br><span class="muted">' + escapeHtml(strings.cartEmptyText || '') + '</span></p>' +
            '<a class="btn btn--sm" href="' + (routes.collections || '/collections/all') + '">' + escapeHtml(strings.cartEmptyLink || '') + '</a>' +
          '</div>';
        return;
      }

      body.innerHTML = cart.items.map(function (item) {
        var image = item.image
          ? '<img src="' + item.image.replace(/(\.[a-z]+)(\?.*)?$/i, '_160x$1') + '" alt="" width="80" height="80" loading="lazy">'
          : '';
        var variant = item.product_has_only_default_variant ? '' : escapeHtml(item.variant_title || '') + ' · ';
        return '' +
          '<div class="drawer-line">' +
            '<div class="drawer-line__media">' + image + '</div>' +
            '<div style="display:flex;flex-direction:column;flex:1;min-width:0">' +
              '<p class="drawer-line__name">' + escapeHtml(item.product_title) + '</p>' +
              '<p class="drawer-line__meta">' + variant + escapeHtml(strings.quantity || 'Qté') + ' ' + item.quantity + '</p>' +
              '<p class="drawer-line__price">' + formatMoney(item.final_line_price) + '</p>' +
            '</div>' +
            '<button class="icon-btn" type="button" data-cart-remove="' + escapeHtml(item.key) + '" aria-label="' + escapeHtml(strings.remove || 'Retirer') + '">' +
              '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/></svg>' +
            '</button>' +
          '</div>';
      }).join('');
    };

    var refresh = function () {
      return fetch((routes.cart || '/cart') + '.js', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (cart) { render(cart); return cart; })
        .catch(function () { return null; });
    };

    var addFromForm = function (form) {
      var button = $('[data-add-to-cart]', form) || $('button[type="submit"]', form);
      var label = button ? button.innerHTML : '';
      if (button) { button.disabled = true; button.classList.add('is-loading'); }

      return fetch(routes.cartAdd || '/cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.data.description || res.data.message);
          return refresh().then(function () { if (useDrawer) open(true); });
        })
        .catch(function (err) {
          if (button) {
            button.innerHTML = escapeHtml(err.message || strings.unavailable || '');
            setTimeout(function () { button.innerHTML = label; }, 2600);
          }
        })
        .then(function () {
          if (button) { button.disabled = false; button.classList.remove('is-loading'); }
        });
    };

    var change = function (key, quantity) {
      return post(routes.cartChange || '/cart/change.js', { id: key, quantity: quantity })
        .then(function (cart) { render(cart); return cart; });
    };

    // Ouverture / fermeture / suppression — délégation, robuste aux rechargements de section.
    document.addEventListener('click', function (e) {
      var openBtn = e.target.closest('[data-cart-open]');
      if (openBtn && useDrawer) {
        e.preventDefault();
        open(true);
        refresh();
        return;
      }
      if (e.target.closest('[data-cart-close]') || e.target.closest('[data-overlay]')) {
        open(false);
        return;
      }
      var removeBtn = e.target.closest('[data-cart-remove]');
      if (removeBtn) {
        e.preventDefault();
        change(removeBtn.getAttribute('data-cart-remove'), 0);
      }
    });

    document.addEventListener('keydown', function (e) {
      var drawer = $('[data-cart]');
      if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) open(false);
    });

    // Soumission du formulaire produit en Ajax.
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form.classList.contains('buy-form')) return;
      if (!useDrawer) return; // sans tiroir, on laisse Shopify rediriger vers /cart
      e.preventDefault();
      addFromForm(form);
    });

    return { open: open, refresh: refresh };
  })();

  /* ------------------------------------------------------------------ */
  /* 05. Révélations au scroll                                          */
  /* ------------------------------------------------------------------ */
  function initReveals(root) {
    var els = $$('[data-reveal], .split-lines', root);
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
  }

  /* ------------------------------------------------------------------ */
  /* 06. Manifeste — mots qui s'allument                                */
  /* ------------------------------------------------------------------ */
  function initManifesto(root) {
    var block = $('[data-lit]', root);
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
  }

  /* ------------------------------------------------------------------ */
  /* 07. Compteurs chiffrés                                             */
  /* ------------------------------------------------------------------ */
  function initCounters(root) {
    var els = $$('[data-count]', root);
    if (!els.length) return;

    // La valeur finale est écrite dans le HTML (lisible sans JS) : on repart de 0.
    var run = function (el) {
      var raw = (el.getAttribute('data-count') || '').replace(/[^\d.,-]/g, '').replace(/\s/g, '').replace(',', '.');
      var target = parseFloat(raw);
      if (isNaN(target)) return;
      if (reduced) { el.textContent = target.toLocaleString(locale); return; }
      el.textContent = '0';
      var dur = 1600;
      var t0 = performance.now();
      var tick = function (now) {
        var p = Math.min(1, (now - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString(locale);
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
  }

  /* ------------------------------------------------------------------ */
  /* 08. Carrousel d'avis                                               */
  /* ------------------------------------------------------------------ */
  function initQuotes(root) {
    $$('[data-quotes]', root).forEach(function (carousel) {
      if (carousel.dataset.quotesReady) return;
      carousel.dataset.quotesReady = '1';

      var track = $('[data-quotes-track]', carousel);
      var slides = $$('.quote', track);
      var dotsBox = $('[data-quotes-dots]', carousel);
      var index = 0;
      var timer = null;

      if (!track || slides.length < 2) return;

      if (dotsBox) {
        dotsBox.innerHTML = '';
        slides.forEach(function (_, i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', String(i + 1));
          b.addEventListener('click', function () { go(i, true); });
          dotsBox.appendChild(b);
        });
      }
      var dots = dotsBox ? $$('button', dotsBox) : [];

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

      var prev = $('[data-quotes-prev]', carousel);
      var next = $('[data-quotes-next]', carousel);
      if (prev) prev.addEventListener('click', function () { go(index - 1, true); });
      if (next) next.addEventListener('click', function () { go(index + 1, true); });

      carousel.addEventListener('mouseenter', pause);
      carousel.addEventListener('mouseleave', play);

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
    });
  }

  /* ------------------------------------------------------------------ */
  /* 09. Accordéons                                                     */
  /* ------------------------------------------------------------------ */
  function initAccordions(root) {
    $$('.accordion__btn', root).forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      panel.style.height = btn.getAttribute('aria-expanded') === 'true' ? 'auto' : '0px';
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.accordion__btn');
    if (!btn) return;
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;

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

  /* ------------------------------------------------------------------ */
  /* 10. Galerie produit                                                */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var thumb = e.target.closest('[data-thumb]');
    if (!thumb) return;
    showMedia(thumb.getAttribute('data-thumb'));
  });

  function showMedia(id) {
    $$('[data-thumb]').forEach(function (t) {
      t.setAttribute('aria-selected', String(t.getAttribute('data-thumb') === String(id)));
    });
    $$('[data-gallery-img]').forEach(function (img) {
      img.classList.toggle('is-hidden', img.getAttribute('data-gallery-img') !== String(id));
    });
  }

  /* ------------------------------------------------------------------ */
  /* 11. Variantes produit                                              */
  /* ------------------------------------------------------------------ */
  function initProductForm(root) {
    var container = $('[data-product-root]', root) || (root.matches && root.matches('[data-product-root]') ? root : null);
    if (!container) return;

    var dataEl = root.querySelector ? root.querySelector('[data-product-json]') : null;
    if (!dataEl) dataEl = $('[data-product-json]');
    if (!dataEl) return;

    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (err) { return; }
    if (!data || !data.variants) return;

    var idInput = $('[data-variant-id]', container);
    var priceEl = $('[data-price]', container);
    var compareEl = $('[data-compare-price]', container);
    var saveEl = $('[data-save]', container);
    var stockEl = $('[data-stock]', container);
    var addBtn = $('[data-add-to-cart]', container);
    var addBtnText = $('[data-add-to-cart-text]', container);
    var buybarAdd = $('[data-buybar-add]');
    var buybarPrice = $('[data-buybar-price]');
    var buybarSuffix = buybarPrice ? (buybarPrice.textContent.split('·')[1] || '') : '';

    function selectedOptions() {
      var values = [];
      $$('[data-option-group]', container).forEach(function (group) {
        var pressed = $('[data-option][aria-pressed="true"]', group);
        var position = parseInt(group.getAttribute('data-option-group'), 10) || 1;
        values[position - 1] = pressed ? pressed.getAttribute('data-option') : null;
      });
      return values;
    }

    function findVariant(values) {
      if (!values.length) return data.variants[0];
      for (var i = 0; i < data.variants.length; i++) {
        var v = data.variants[i];
        var match = true;
        for (var j = 0; j < values.length; j++) {
          if (values[j] != null && v.options[j] !== values[j]) { match = false; break; }
        }
        if (match) return v;
      }
      return null;
    }

    function update() {
      var variant = findVariant(selectedOptions());

      if (!variant) {
        if (addBtn) addBtn.disabled = true;
        if (addBtnText) addBtnText.textContent = strings.unavailable || '';
        if (buybarAdd) buybarAdd.disabled = true;
        return;
      }

      if (idInput) idInput.value = variant.id;
      if (priceEl) priceEl.textContent = variant.price_formatted;

      if (compareEl) {
        var hasCompare = variant.compare_at_price && variant.compare_at_price > variant.price;
        compareEl.hidden = !hasCompare;
        compareEl.textContent = hasCompare ? variant.compare_at_price_formatted : '';
        if (saveEl) {
          saveEl.hidden = !hasCompare;
          saveEl.textContent = hasCompare ? '−' + variant.saving_formatted : '';
        }
      }

      if (stockEl) stockEl.hidden = !variant.available;

      if (addBtn) addBtn.disabled = !variant.available;
      if (addBtnText) {
        addBtnText.textContent = variant.available
          ? (strings.addToCart || '') + ' — ' + variant.price_formatted
          : (strings.soldOut || '');
      }
      if (buybarAdd) buybarAdd.disabled = !variant.available;
      if (buybarPrice) buybarPrice.textContent = variant.price_formatted + (buybarSuffix ? ' ·' + buybarSuffix : '');

      if (variant.featured_media_id) {
        var img = $('[data-media-id="' + variant.featured_media_id + '"]');
        if (img) showMedia(img.getAttribute('data-gallery-img'));
      }

      // URL partageable, sans rechargement.
      try {
        if (window.history && window.history.replaceState) {
          var url = new URL(window.location.href);
          url.searchParams.set('variant', variant.id);
          window.history.replaceState({}, '', url.toString());
        }
      } catch (err) { /* navigateur ancien : on ignore */ }
    }

    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-option]');
      if (!btn) return;
      var group = btn.closest('[data-option-group]');
      if (!group) return;

      $$('[data-option]', group).forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      var out = $('[data-option-value="' + group.getAttribute('data-option-group') + '"]', container);
      if (out) out.textContent = btn.getAttribute('data-option');
      update();
    });
  }

  /* ------------------------------------------------------------------ */
  /* 12. Quantité                                                       */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-qty-step]');
    if (!btn) return;
    var box = btn.closest('[data-qty]');
    var input = box && $('input', box);
    if (!input) return;
    var min = parseInt(input.getAttribute('min'), 10);
    var max = parseInt(input.getAttribute('max'), 10) || 99;
    if (isNaN(min)) min = 1;
    var next = (parseInt(input.value, 10) || min) + parseInt(btn.getAttribute('data-qty-step'), 10);
    input.value = Math.max(min, Math.min(max, next));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input.matches || !input.matches('[data-qty] input')) return;
    var min = parseInt(input.getAttribute('min'), 10);
    var max = parseInt(input.getAttribute('max'), 10) || 99;
    if (isNaN(min)) min = 1;
    input.value = Math.max(min, Math.min(max, parseInt(input.value, 10) || min));
  });

  /* ------------------------------------------------------------------ */
  /* 13. Barre d'achat collante                                         */
  /* ------------------------------------------------------------------ */
  function initBuybar() {
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
  }

  /* ------------------------------------------------------------------ */
  /* 14. Barres de notation                                             */
  /* ------------------------------------------------------------------ */
  function initRatingBars(root) {
    var bars = $$('[data-bar]', root);
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
  }

  /* ------------------------------------------------------------------ */
  /* 15. Parallaxe légère                                               */
  /* ------------------------------------------------------------------ */
  var parallaxEls = [];
  var parallaxTicking = false;

  function updateParallax() {
    var vh = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.05;
      var offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
      el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
    });
    parallaxTicking = false;
  }

  function initParallax() {
    if (reduced) return;
    parallaxEls = $$('[data-parallax]');
    if (!parallaxEls.length) return;
    updateParallax();
  }

  window.addEventListener('scroll', function () {
    if (parallaxTicking || !parallaxEls.length) return;
    parallaxTicking = true;
    requestAnimationFrame(updateParallax);
  }, { passive: true });

  /* ------------------------------------------------------------------ */
  /* 16. FAQ — recherche & catégories                                   */
  /* ------------------------------------------------------------------ */
  function initFaq(root) {
    var groups = $$('[data-faq-group]', root);
    if (!groups.length) return;

    var input = $('[data-faq-search]', root) || $('[data-faq-search]');
    var empty = $('[data-faq-empty]', root) || $('[data-faq-empty]');
    var tabs = $$('[data-faq-cat]', root);
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

    if (input && !input.dataset.faqReady) {
      input.dataset.faqReady = '1';
      input.addEventListener('input', apply);
    }
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        current = tab.getAttribute('data-faq-cat');
        tabs.forEach(function (t) { t.setAttribute('aria-current', String(t === tab)); });
        apply();
      });
    });

    apply();
  }

  /* ------------------------------------------------------------------ */
  /* 17. Formulaires — validation côté client, envoi natif Shopify      */
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

    document.addEventListener('blur', function (e) {
      var field = e.target.closest && e.target.closest('.field');
      if (field) validate(field);
    }, true);

    document.addEventListener('input', function (e) {
      var field = e.target.closest && e.target.closest('.field.has-error');
      if (field) validate(field);
    });

    document.addEventListener('submit', function (e) {
      var form = e.target;
      var fields = $$('.field', form);
      if (!fields.length) return;

      var valid = fields.map(validate).every(Boolean);
      var consent = $('[data-consent]', form);
      if (consent && !consent.checked) {
        var box = consent.closest('.checkbox');
        if (box) box.style.color = '#B4402F';
        valid = false;
      }

      if (!valid) {
        e.preventDefault();
        var first = $('.field.has-error .input, .field.has-error .textarea, .field.has-error .select', form);
        if (first) first.focus();
        return;
      }

      var btn = $('button[type="submit"]', form);
      if (btn && !form.classList.contains('buy-form')) {
        btn.disabled = true;
        btn.textContent = strings.sending || btn.textContent;
        // Réactivation si la navigation est annulée (retour arrière navigateur).
        setTimeout(function () { btn.disabled = false; }, 6000);
      }
    });
  })();

  /* ------------------------------------------------------------------ */
  /* 18. Initialisation & rechargement dans l'éditeur de thème          */
  /* ------------------------------------------------------------------ */
  function initSections(root) {
    var scope = root || document;
    initReveals(scope);
    initManifesto(scope);
    initCounters(scope);
    initQuotes(scope);
    initAccordions(scope);
    initProductForm(scope);
    initRatingBars(scope);
    initFaq(scope);
    initBuybar();
    initParallax();
  }

  initSections(document);

  document.addEventListener('shopify:section:load', function (e) { initSections(e.target); });
  document.addEventListener('shopify:section:select', function () { initParallax(); });
  document.addEventListener('shopify:block:select', function (e) {
    var quote = e.target.closest ? e.target.closest('.quote') : null;
    if (quote) {
      var track = quote.closest('[data-quotes-track]');
      if (track) {
        var index = Array.prototype.indexOf.call(track.children, quote);
        track.style.transform = 'translateX(' + (-index * 100) + '%)';
      }
    }
    var item = e.target.closest ? e.target.closest('.accordion__item') : null;
    if (item) {
      var btn = $('.accordion__btn', item);
      if (btn && btn.getAttribute('aria-expanded') !== 'true') btn.click();
    }
  });
})();
