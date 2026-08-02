/* ==========================================================================
   RÉVA — theme behaviour
   Element-scoped modules are registered in `modules` and re-run whenever the
   theme editor injects a section. Every module exits quietly when its markup
   is absent, so removing a section can never break another one.
   Document-level behaviour (drawers, cart, quantity) uses event delegation
   and is bound exactly once.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var on = function (el, evt, fn, opts) { if (el) el.addEventListener(evt, fn, opts); };

  /* Marks an element as initialised so editor re-renders never double-bind. */
  function once(el, key) {
    var flag = 'reva' + key;
    if (el.dataset[flag]) return false;
    el.dataset[flag] = '1';
    return true;
  }

  function trapFocus(container, previous) {
    var selectors = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
    function handle(e) {
      if (e.key !== 'Tab') return;
      var items = $$(selectors, container).filter(function (el) { return el.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener('keydown', handle);
    return function release() {
      container.removeEventListener('keydown', handle);
      if (previous && previous.focus) previous.focus();
    };
  }

  function formatMoney(cents) {
    var format = window.RevaTheme && window.RevaTheme.moneyFormat;
    var value = (cents / 100).toLocaleString(document.documentElement.lang || 'en', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    if (!format) return value;
    return format.replace(/\{\{\s*amount[a-z_]*\s*\}\}/, value);
  }

  /* ======================================================= element modules */

  var modules = [];

  /* 1. Sticky / overlay header ------------------------------------------- */
  modules.push(function header(scope) {
    $$('[data-header]', scope).forEach(function (el) {
      if (!once(el, 'Header')) return;

      function measure() {
        document.documentElement.style.setProperty('--header-h', el.offsetHeight + 'px');
      }
      measure();
      window.addEventListener('resize', measure);

      var overlay = el.classList.contains('header--overlay');
      var ticking = false;
      function update() {
        var threshold = overlay ? Math.max(window.innerHeight * 0.5, 220) : 8;
        el.classList.toggle('is-stuck', window.scrollY > threshold);
        ticking = false;
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
      }, { passive: true });
      update();
    });
  });

  /* 2. Scroll reveal ------------------------------------------------------ */
  modules.push(function reveal(scope) {
    var items = $$('[data-reveal], [data-reveal-lines]', scope).filter(function (el) { return once(el, 'Reveal'); });
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  });

  /* 3. Animated counters -------------------------------------------------- */
  modules.push(function counters(scope) {
    var items = $$('[data-count]', scope).filter(function (el) { return once(el, 'Count'); });
    if (!items.length || reduced || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        var raw = el.getAttribute('data-count');
        var target = parseFloat(raw);
        if (isNaN(target)) return;
        var decimals = (raw.split('.')[1] || '').length;
        var start = performance.now();
        (function step(now) {
          var p = Math.min((now - start) / 1400, 1);
          el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(decimals);
          if (p < 1) window.requestAnimationFrame(step);
        })(start);
      });
    }, { threshold: 0.4 });
    items.forEach(function (el) { io.observe(el); });
  });

  /* 4. Height-animated accordions ---------------------------------------- */
  modules.push(function accordions(scope) {
    $$('[data-accordion]', scope).forEach(function (item) {
      if (!once(item, 'Accordion')) return;
      var panel = $('[data-accordion-panel]', item);
      var summary = $('summary', item);
      var inner = panel && panel.firstElementChild;
      if (!panel || !summary || !inner) return;

      panel.style.height = item.open ? 'auto' : '0px';

      function animate(toOpen) {
        if (reduced) { panel.style.height = toOpen ? 'auto' : '0px'; return; }
        panel.style.height = panel.offsetHeight + 'px';
        panel.getBoundingClientRect();
        panel.style.transition = 'height .5s cubic-bezier(.16,1,.3,1)';
        panel.style.height = (toOpen ? inner.offsetHeight : 0) + 'px';
        window.setTimeout(function () {
          panel.style.transition = '';
          if (toOpen) panel.style.height = 'auto';
        }, 500);
      }

      summary.addEventListener('click', function (e) {
        e.preventDefault();
        var group = item.getAttribute('data-accordion-group');
        if (!item.open && group) {
          $$('[data-accordion-group="' + group + '"][open]').forEach(function (other) {
            if (other === item) return;
            other.open = false;
            var otherPanel = $('[data-accordion-panel]', other);
            if (otherPanel) otherPanel.style.height = '0px';
          });
        }
        if (item.open) {
          animate(false);
          window.setTimeout(function () { item.open = false; }, reduced ? 0 : 480);
        } else {
          item.open = true;
          animate(true);
        }
      });
    });
  });

  /* 5. Announcement rotator ---------------------------------------------- */
  modules.push(function announcement(scope) {
    $$('[data-announce]', scope).forEach(function (bar) {
      if (!once(bar, 'Announce')) return;
      var slides = $$('[data-announce-slide]', bar);
      if (slides.length < 2) return;
      var index = 0;
      var timer = null;
      var delay = parseInt(bar.getAttribute('data-announce-delay'), 10) || 5000;

      function go(next) {
        slides[index].classList.remove('is-active');
        index = (next + slides.length) % slides.length;
        slides[index].classList.add('is-active');
      }
      function start() { if (!reduced) timer = window.setInterval(function () { go(index + 1); }, delay); }
      function stop() { window.clearInterval(timer); }

      on($('[data-announce-prev]', bar), 'click', function () { stop(); go(index - 1); start(); });
      on($('[data-announce-next]', bar), 'click', function () { stop(); go(index + 1); start(); });
      bar.addEventListener('mouseenter', stop);
      bar.addEventListener('mouseleave', start);
      start();
    });
  });

  /* 6. Testimonial carousel ---------------------------------------------- */
  modules.push(function quotes(scope) {
    $$('[data-quotes]', scope).forEach(function (root) {
      if (!once(root, 'Quotes')) return;
      var track = $('[data-quotes-track]', root);
      var slides = $$('[data-quotes-slide]', root);
      if (!track || slides.length < 2) return;
      var dots = $$('[data-quotes-dot]', root);
      var index = 0;
      var timer = null;
      var autoplay = root.getAttribute('data-quotes-autoplay') === 'true';

      function render() {
        track.style.transform = 'translateX(-' + index * 100 + '%)';
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
        slides.forEach(function (s, i) { s.setAttribute('aria-hidden', i === index ? 'false' : 'true'); });
      }
      function go(next) { index = (next + slides.length) % slides.length; render(); }
      function start() { if (autoplay && !reduced) timer = window.setInterval(function () { go(index + 1); }, 6500); }
      function stop() { window.clearInterval(timer); }

      on($('[data-quotes-prev]', root), 'click', function () { stop(); go(index - 1); start(); });
      on($('[data-quotes-next]', root), 'click', function () { stop(); go(index + 1); start(); });
      dots.forEach(function (dot, i) { on(dot, 'click', function () { stop(); go(i); start(); }); });

      var x0 = null;
      root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
      root.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
        x0 = null;
        start();
      });
      root.addEventListener('mouseenter', stop);
      root.addEventListener('mouseleave', start);

      render();
      start();
    });
  });

  /* 7. Before / after comparison ----------------------------------------- */
  modules.push(function beforeAfter(scope) {
    $$('[data-ba]', scope).forEach(function (root) {
      if (!once(root, 'Ba')) return;
      var range = $('[data-ba-range]', root);
      if (!range) return;
      function apply() { root.style.setProperty('--pos', range.value + '%'); }
      on(range, 'input', apply);
      apply();
    });
  });

  /* 8. Seamless marquee --------------------------------------------------- */
  modules.push(function marquee(scope) {
    $$('[data-marquee-track]', scope).forEach(function (track) {
      if (!once(track, 'Marquee')) return;
      // Duplicate the content once so the -50% loop is seamless.
      track.innerHTML += track.innerHTML;
    });
  });

  /* 9. Product variants + gallery ---------------------------------------- */
  modules.push(function product(scope) {
    $$('[data-product-root]', scope).forEach(function (root) {
      if (!once(root, 'Product')) return;

      // Gallery
      var main = $('[data-gallery-main]', root);
      $$('[data-thumb]', root).forEach(function (thumb) {
        on(thumb, 'click', function () {
          var img = main && $('img', main);
          var src = thumb.getAttribute('data-src');
          if (img && src) {
            img.src = src;
            var srcset = thumb.getAttribute('data-srcset');
            if (srcset) img.srcset = srcset;
            img.alt = thumb.getAttribute('data-alt') || img.alt;
          }
          $$('[data-thumb]', root).forEach(function (t) { t.classList.toggle('is-active', t === thumb); });
        });
      });

      // Variants
      var form = $('[data-product-form]', root);
      var data = $('[data-variants-json]', root);
      if (!form || !data) return;
      var variants;
      try { variants = JSON.parse(data.textContent); } catch (err) { return; }

      var idInput = $('[data-variant-id]', form);
      var priceEl = $('[data-variant-price]', root);
      var submit = $('[data-add-to-cart]', form);
      var submitText = submit && $('[data-add-to-cart-text]', submit);
      var strings = (window.RevaTheme && window.RevaTheme.strings) || {};

      function chosenOptions() {
        return $$('[data-option-index]', root).map(function (group) {
          var checked = $('input:checked', group);
          return checked ? checked.value : null;
        });
      }
      function matches(v, opts) {
        return opts.every(function (opt, i) { return opt === null || v.options[i] === opt; });
      }

      function update() {
        var chosen = chosenOptions();
        var match = variants.filter(function (v) { return matches(v, chosen); })[0];

        // Grey out combinations that do not exist
        $$('[data-option-value]', root).forEach(function (label) {
          var input = $('input', label);
          var group = label.closest('[data-option-index]');
          if (!input || !group) return;
          var probe = chosen.slice();
          probe[parseInt(group.getAttribute('data-option-index'), 10)] = input.value;
          input.disabled = !variants.some(function (v) { return matches(v, probe) && v.available; });
        });

        $$('[data-option-selected]', root).forEach(function (out, i) { out.textContent = chosen[i] || ''; });

        if (!match) {
          if (submit) submit.setAttribute('aria-disabled', 'true');
          if (submitText) submitText.textContent = strings.unavailable || 'Unavailable';
          return;
        }
        if (idInput) idInput.value = match.id;
        if (priceEl && match.price_html) priceEl.innerHTML = match.price_html;
        else if (priceEl) priceEl.textContent = formatMoney(match.price);
        if (submit) submit.setAttribute('aria-disabled', match.available ? 'false' : 'true');
        if (submitText) submitText.textContent = match.available ? (strings.addToCart || 'Add to cart') : (strings.soldOut || 'Sold out');

        if (match.featured_media_id) {
          var thumb = $('[data-thumb][data-media-id="' + match.featured_media_id + '"]', root);
          if (thumb && !thumb.classList.contains('is-active')) thumb.click();
        }

        if (window.history.replaceState) {
          var url = new URL(window.location.href);
          url.searchParams.set('variant', match.id);
          window.history.replaceState({}, '', url.toString());
        }
      }

      root.addEventListener('change', function (e) {
        if (e.target.closest('[data-option-index]')) update();
      });
      update();
    });
  });

  /* 10. Predictive search -------------------------------------------------- */
  modules.push(function search(scope) {
    $$('[data-search-root]', scope).forEach(function (root) {
      if (!once(root, 'Search')) return;
      var input = $('input[type="search"]', root);
      var results = $('[data-search-results]', root);
      if (!input || !results) return;
      var routes = (window.RevaTheme && window.RevaTheme.routes) || {};
      var timer = null;
      var controller = null;

      on(input, 'input', function () {
        window.clearTimeout(timer);
        var q = input.value.trim();
        if (q.length < 2) { results.innerHTML = ''; return; }
        timer = window.setTimeout(function () {
          if (controller) controller.abort();
          controller = new AbortController();
          var url = (routes.predictiveSearch || '/search/suggest')
            + '?q=' + encodeURIComponent(q)
            + '&resources[type]=product,collection,page,article&resources[limit]=6'
            + '&section_id=predictive-search';
          fetch(url, { signal: controller.signal })
            .then(function (r) { return r.text(); })
            .then(function (html) {
              var parsed = new DOMParser().parseFromString(html, 'text/html');
              var node = parsed.querySelector('[data-search-results]');
              results.innerHTML = node ? node.innerHTML : '';
            })
            .catch(function () { /* aborted or offline — keep previous results */ });
        }, 260);
      });
    });
  });

  /* 11. Collection sorting ------------------------------------------------- */
  modules.push(function sorting(scope) {
    $$('[data-sort-select]', scope).forEach(function (select) {
      if (!once(select, 'Sort')) return;
      on(select, 'change', function () {
        var url = new URL(window.location.href);
        url.searchParams.set('sort_by', select.value);
        url.searchParams.delete('page');
        window.location.href = url.toString();
      });
    });
  });

  function init(scope) {
    modules.forEach(function (fn) {
      try { fn(scope || document); } catch (err) { /* one broken module must not stop the rest */ }
    });
  }

  /* ================================================== document-level logic */

  var Drawers = (function () {
    var openId = null;
    var release = null;

    function overlayEl() { return $('[data-drawer-overlay]'); }

    function close() {
      if (!openId) return;
      var panel = document.getElementById(openId);
      if (panel) {
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
      }
      var ov = overlayEl();
      if (ov) ov.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      $$('[data-drawer-open="' + openId + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      openId = null;
      if (release) { release(); release = null; }
    }

    function open(id) {
      var panel = document.getElementById(id);
      if (!panel) return;
      if (openId && openId !== id) close();
      var previous = document.activeElement;
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      var ov = overlayEl();
      if (ov) ov.classList.add('is-open');
      document.body.classList.add('is-locked');
      $$('[data-drawer-open="' + id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
      openId = id;
      release = trapFocus(panel, previous);
      var focusable = panel.querySelector('[data-drawer-focus]') || panel.querySelector('[data-drawer-close]');
      if (focusable) window.setTimeout(function () { focusable.focus(); }, 80);
    }

    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-drawer-open]');
      if (opener) { e.preventDefault(); open(opener.getAttribute('data-drawer-open')); return; }
      if (e.target.closest('[data-drawer-close]')) { e.preventDefault(); close(); return; }
      if (e.target.closest('[data-drawer-overlay]')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    return { open: open, close: close };
  })();

  var Cart = (function () {
    var routes = (window.RevaTheme && window.RevaTheme.routes) || {};

    function replace(html, selector) {
      if (!html) return;
      var target = document.querySelector(selector);
      if (!target) return;
      var parsed = new DOMParser().parseFromString(html, 'text/html');
      var source = parsed.querySelector(selector);
      if (source) {
        target.innerHTML = source.innerHTML;
        init(target);
      }
    }

    function refresh() {
      var url = (routes.cart || '/cart') + '?sections=cart-drawer,cart-icon-bubble';
      return fetch(url, { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (sections) {
          replace(sections['cart-drawer'], '[data-cart-drawer-content]');
          replace(sections['cart-icon-bubble'], '[data-cart-bubble]');
        })
        .catch(function () { /* keep the page usable if a refresh fails */ });
    }

    function add(formData) {
      return fetch((routes.cartAdd || '/cart/add') + '.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
      })
        .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.body.description || res.body.message || 'Error');
          return refresh().then(function () { Drawers.open('cart-drawer'); });
        });
    }

    function change(line, quantity) {
      return fetch((routes.cartChange || '/cart/change') + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line: line, quantity: quantity })
      }).then(function () {
        // The cart page renders its own totals — a reload keeps them exact.
        if (document.body.classList.contains('template-cart')) { window.location.reload(); return; }
        return refresh();
      });
    }

    return { add: add, change: change, refresh: refresh };
  })();

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-cart-add-form]');
    if (!form) return;
    e.preventDefault();
    var submit = form.querySelector('[type="submit"]');
    if (submit && submit.getAttribute('aria-disabled') === 'true') return;
    if (submit) submit.setAttribute('aria-busy', 'true');
    var errorEl = form.querySelector('[data-cart-error]');
    if (errorEl) errorEl.hidden = true;

    Cart.add(new FormData(form))
      .catch(function (err) {
        if (errorEl) { errorEl.textContent = err.message; errorEl.hidden = false; }
      })
      .then(function () { if (submit) submit.removeAttribute('aria-busy'); });
  });

  document.addEventListener('click', function (e) {
    var remove = e.target.closest('[data-cart-remove]');
    if (remove) {
      e.preventDefault();
      Cart.change(parseInt(remove.getAttribute('data-cart-remove'), 10), 0);
      return;
    }
    var step = e.target.closest('[data-qty-step]');
    if (step) {
      var wrap = step.closest('[data-qty]');
      var input = wrap && $('input', wrap);
      if (!input) return;
      var min = parseInt(input.getAttribute('min'), 10) || 0;
      input.value = Math.max(min, (parseInt(input.value, 10) || 0) + parseInt(step.getAttribute('data-qty-step'), 10));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  document.addEventListener('change', function (e) {
    var input = e.target.closest('[data-cart-qty]');
    if (!input) return;
    Cart.change(parseInt(input.getAttribute('data-cart-qty'), 10), parseInt(input.value, 10) || 0);
  });

  /* ============================================================== bootstrap */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }

  // Theme editor: re-initialise only the section that was injected.
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
  document.addEventListener('shopify:block:select', function (e) {
    var slide = e.target.closest('[data-quotes-slide]');
    if (slide) {
      var dot = $$('[data-quotes-dot]', slide.closest('[data-quotes]'))[
        $$('[data-quotes-slide]', slide.closest('[data-quotes]')).indexOf(slide)
      ];
      if (dot) dot.click();
    }
  });

  window.RevaCart = Cart;
  window.RevaDrawers = Drawers;
})();
