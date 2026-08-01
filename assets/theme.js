/* ==========================================================================
   Thème RÉVA — theme.js
   Sans dépendance. Chaque module est inerte si son markup est absent.
   ========================================================================== */

(function () {
  'use strict';

  var $ = function (sel, ctx) {
    return (ctx || document).querySelector(sel);
  };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  var cfg = window.theme || { routes: {}, settings: {}, strings: {} };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animate = cfg.settings.animations !== false && !reduced;

  /* ------------------------------------------------------------------ */
  /* Utilitaires                                                        */
  /* ------------------------------------------------------------------ */

  function trapFocus(container) {
    var focusable = $$(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      container
    );
    if (!focusable.length) return function () {};

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    function onKey(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', onKey);
    first.focus();

    return function () {
      container.removeEventListener('keydown', onKey);
    };
  }

  function setOverlay(open) {
    var overlay = $('[data-overlay]');
    if (!overlay) return;

    overlay.hidden = false;
    requestAnimationFrame(function () {
      overlay.classList.toggle('is-open', open);
    });

    if (!open) {
      setTimeout(function () {
        if (!overlay.classList.contains('is-open')) overlay.hidden = true;
      }, 500);
    }
  }

  /* ==================================================================== */
  /* 01. En-tête collant                                                  */
  /* ==================================================================== */

  class StickyHeader extends HTMLElement {
    connectedCallback() {
      this.onScroll = this.onScroll.bind(this);
      this.onScroll();
      window.addEventListener('scroll', this.onScroll, { passive: true });
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this.onScroll);
    }

    onScroll() {
      this.classList.toggle('is-scrolled', window.scrollY > 12);
    }
  }
  customElements.define('sticky-header', StickyHeader);

  /* ==================================================================== */
  /* 02. Navigation mobile                                                */
  /* ==================================================================== */

  (function mobileNav() {
    var btn = $('[data-nav-toggle]');
    var nav = $('[data-nav]');
    if (!btn || !nav) return;

    var release = null;

    function setState(open) {
      btn.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
      document.body.classList.toggle('nav-open', open);

      if (open) {
        release = trapFocus(nav);
      } else if (release) {
        release();
        release = null;
        btn.focus();
      }
    }

    btn.addEventListener('click', function () {
      setState(!nav.classList.contains('is-open'));
    });

    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () {
        setState(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) setState(false);
    });
  })();

  /* ==================================================================== */
  /* 03. Panier — API Ajax + Section Rendering                            */
  /* ==================================================================== */

  var Cart = {
    release: null,

    replaceDrawer: function (html) {
      if (!html) return;

      var parsed = new DOMParser().parseFromString(html, 'text/html');
      var fresh = parsed.querySelector('#shopify-section-cart-drawer');
      var current = document.getElementById('shopify-section-cart-drawer');

      if (fresh && current) {
        var wasOpen = !!current.querySelector('[data-cart-drawer].is-open');
        current.innerHTML = fresh.innerHTML;
        if (wasOpen) Cart.open(true);
      }
    },

    refreshCount: function () {
      return fetch(cfg.routes.cart + '.js', { headers: { Accept: 'application/json' } })
        .then(function (r) {
          return r.json();
        })
        .then(function (cart) {
          $$('[data-cart-count]').forEach(function (el) {
            el.textContent = cart.item_count;
            el.hidden = cart.item_count === 0;
          });
          document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
          return cart;
        })
        .catch(function () {});
    },

    open: function (state) {
      var drawer = $('[data-cart-drawer]');
      if (!drawer) return;

      drawer.classList.toggle('is-open', state);
      drawer.setAttribute('aria-hidden', String(!state));
      document.body.classList.toggle('is-locked', state);
      setOverlay(state);

      if (state) {
        Cart.release = trapFocus(drawer);
      } else if (Cart.release) {
        Cart.release();
        Cart.release = null;
      }
    },

    add: function (form, button) {
      var body = new FormData(form);
      body.append('sections', 'cart-drawer');
      body.append('sections_url', window.location.pathname);

      if (button) {
        button.setAttribute('aria-busy', 'true');
        button.disabled = true;
      }

      return fetch(cfg.routes.cart_add, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: body
      })
        .then(function (r) {
          return r.json().then(function (data) {
            return { ok: r.ok, data: data };
          });
        })
        .then(function (res) {
          if (!res.ok) {
            throw new Error(res.data.description || res.data.message || cfg.strings.cartError);
          }

          if (res.data.sections) Cart.replaceDrawer(res.data.sections['cart-drawer']);
          Cart.refreshCount();

          var error = $('[data-cart-error]', form);
          if (error) error.hidden = true;

          if (cfg.settings.cartType === 'drawer' && $('[data-cart-drawer]')) {
            Cart.open(true);
          } else {
            window.location.href = cfg.routes.cart;
          }
        })
        .catch(function (err) {
          var error = $('[data-cart-error]', form);
          if (error) {
            error.textContent = err.message || cfg.strings.cartError;
            error.hidden = false;
          }
        })
        .finally(function () {
          if (button) {
            button.removeAttribute('aria-busy');
            button.disabled = false;
          }
        });
    },

    change: function (line, quantity) {
      return fetch(cfg.routes.cart_change, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          line: line,
          quantity: quantity,
          sections: 'cart-drawer',
          sections_url: window.location.pathname
        })
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (cart) {
          if (cart.sections) Cart.replaceDrawer(cart.sections['cart-drawer']);
          Cart.refreshCount();

          // Sur la page panier, un rechargement garantit des totaux exacts.
          if (document.body.classList.contains('template-cart')) window.location.reload();
        })
        .catch(function () {});
    },

    note: function (value) {
      return fetch(cfg.routes.cart_update, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ note: value })
      }).catch(function () {});
    }
  };

  window.themeCart = Cart;

  document.addEventListener('click', function (e) {
    var openBtn = e.target.closest('[data-cart-open]');
    if (openBtn && cfg.settings.cartType === 'drawer' && $('[data-cart-drawer]')) {
      e.preventDefault();
      Cart.open(true);
      return;
    }

    if (e.target.closest('[data-cart-close]') || e.target.closest('[data-overlay]')) {
      Cart.open(false);
    }

    var remove = e.target.closest('[data-cart-remove]');
    if (remove) {
      e.preventDefault();
      Cart.change(parseInt(remove.getAttribute('data-cart-remove'), 10), 0);
    }
  });

  document.addEventListener('keydown', function (e) {
    var drawer = $('[data-cart-drawer]');
    if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) Cart.open(false);
  });

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[action*="/cart/add"]');
    if (!form) return;
    e.preventDefault();
    Cart.add(form, $('[data-add-to-cart]', form));
  });

  document.addEventListener('change', function (e) {
    var input = e.target.closest('[data-cart-line]');
    if (input) {
      Cart.change(parseInt(input.getAttribute('data-cart-line'), 10), parseInt(input.value, 10));
      return;
    }

    var note = e.target.closest('[data-cart-note]');
    if (note) Cart.note(note.value);
  });

  /* ==================================================================== */
  /* 04. Quantité                                                         */
  /* ==================================================================== */

  class QuantityInput extends HTMLElement {
    connectedCallback() {
      var input = this.querySelector('input');
      if (!input) return;

      this.querySelectorAll('[data-qty-step]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var step = parseInt(btn.getAttribute('data-qty-step'), 10);
          var min = parseInt(input.min || 1, 10);
          var max = input.max ? parseInt(input.max, 10) : Infinity;
          var current = parseInt(input.value, 10) || 0;
          var next = Math.max(min, Math.min(max, current + step));

          if (next !== current) {
            input.value = next;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      });
    }
  }
  customElements.define('quantity-input', QuantityInput);

  /* ==================================================================== */
  /* 05. Révélations au défilement                                        */
  /* ==================================================================== */

  function initReveals(scope) {
    var els = $$('[data-reveal], .split-lines', scope || document);
    if (!els.length) return;

    if (!animate || !('IntersectionObserver' in window)) {
      els.forEach(function (el) {
        el.classList.add('is-in');
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );

    els.forEach(function (el) {
      io.observe(el);
    });
  }
  initReveals();

  /* ==================================================================== */
  /* 06. Manifeste — les mots s’allument                                  */
  /* ==================================================================== */

  (function manifesto() {
    var block = $('[data-lit]');
    if (!block) return;

    var words = $$('.word', block);
    if (!words.length) return;

    if (!animate) {
      words.forEach(function (w) {
        w.classList.add('is-lit');
      });
      return;
    }

    function update() {
      var rect = block.getBoundingClientRect();
      var start = window.innerHeight * 0.85;
      var end = window.innerHeight * 0.25;
      var progress = Math.max(0, Math.min(1, (start - rect.top) / (start - end)));
      var lit = Math.round(progress * words.length);

      words.forEach(function (w, i) {
        w.classList.toggle('is-lit', i < lit);
      });
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  })();

  /* ==================================================================== */
  /* 07. Compteurs                                                        */
  /* ==================================================================== */

  (function counters() {
    var els = $$('[data-count]');
    if (!els.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      if (isNaN(target)) return;

      if (!animate) {
        el.textContent = target.toLocaleString();
        return;
      }

      el.textContent = '0';
      var start = performance.now();

      function tick(now) {
        var p = Math.min(1, (now - start) / 1600);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    }

    if (!('IntersectionObserver' in window)) {
      els.forEach(run);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          run(e.target);
          io.unobserve(e.target);
        });
      },
      { threshold: 0.6 }
    );

    els.forEach(function (el) {
      io.observe(el);
    });
  })();

  /* ==================================================================== */
  /* 08. Carrousel d’avis                                                 */
  /* ==================================================================== */

  class QuoteCarousel extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-quotes-track]');
      this.dotsBox = this.querySelector('[data-quotes-dots]');
      if (!this.track || !this.dotsBox) return;

      this.slides = $$('.quote', this.track);
      this.index = 0;
      this.timer = null;

      if (this.slides.length < 2) return;

      this.slides.forEach(
        function (_, i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', 'Avis ' + (i + 1));
          b.addEventListener(
            'click',
            function () {
              this.go(i, true);
            }.bind(this)
          );
          this.dotsBox.appendChild(b);
        }.bind(this)
      );

      this.dots = $$('button', this.dotsBox);

      var prev = this.querySelector('[data-quotes-prev]');
      var next = this.querySelector('[data-quotes-next]');

      if (prev) {
        prev.addEventListener(
          'click',
          function () {
            this.go(this.index - 1, true);
          }.bind(this)
        );
      }
      if (next) {
        next.addEventListener(
          'click',
          function () {
            this.go(this.index + 1, true);
          }.bind(this)
        );
      }

      this.addEventListener('mouseenter', this.pause.bind(this));
      this.addEventListener('mouseleave', this.play.bind(this));

      var x0 = null;
      this.track.addEventListener(
        'touchstart',
        function (e) {
          x0 = e.touches[0].clientX;
          this.pause();
        }.bind(this),
        { passive: true }
      );
      this.track.addEventListener(
        'touchend',
        function (e) {
          if (x0 === null) return;
          var dx = e.changedTouches[0].clientX - x0;
          if (Math.abs(dx) > 45) this.go(this.index + (dx < 0 ? 1 : -1));
          x0 = null;
        }.bind(this)
      );

      this.go(0);
      this.play();
    }

    disconnectedCallback() {
      this.pause();
    }

    go(i, stop) {
      this.index = (i + this.slides.length) % this.slides.length;
      this.track.style.transform = 'translateX(' + -this.index * 100 + '%)';

      this.dots.forEach(
        function (d, n) {
          d.setAttribute('aria-current', String(n === this.index));
        }.bind(this)
      );

      this.slides.forEach(
        function (s, n) {
          s.setAttribute('aria-hidden', String(n !== this.index));
        }.bind(this)
      );

      if (stop) this.pause();
    }

    play() {
      if (!animate) return;
      this.pause();
      this.timer = setInterval(
        function () {
          this.go(this.index + 1);
        }.bind(this),
        7000
      );
    }

    pause() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }
  }
  customElements.define('quote-carousel', QuoteCarousel);

  /* ==================================================================== */
  /* 09. Accordéons                                                       */
  /* ==================================================================== */

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
        if (p) {
          p.style.height = p.scrollHeight + 'px';
          requestAnimationFrame(function () {
            p.style.height = '0px';
          });
        }
      });
    }

    btn.setAttribute('aria-expanded', String(!open));

    if (open) {
      panel.style.height = panel.scrollHeight + 'px';
      requestAnimationFrame(function () {
        panel.style.height = '0px';
      });
    } else {
      panel.style.height = panel.scrollHeight + 'px';
      panel.addEventListener('transitionend', function done() {
        panel.style.height = 'auto';
        panel.removeEventListener('transitionend', done);
      });
    }
  });

  function initAccordions() {
    $$('.accordion__btn').forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel || panel.dataset.ready) return;
      panel.dataset.ready = '1';
      panel.style.height = btn.getAttribute('aria-expanded') === 'true' ? 'auto' : '0px';
    });
  }
  initAccordions();

  /* ==================================================================== */
  /* 10. Parallaxe                                                        */
  /* ==================================================================== */

  (function parallax() {
    if (!animate || cfg.settings.parallax === false) return;

    var els = $$('[data-parallax]');
    if (!els.length) return;

    var ticking = false;

    function update() {
      var vh = window.innerHeight;

      els.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;

        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.05;
        var offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });

      ticking = false;
    }

    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );

    update();
  })();

  /* ==================================================================== */
  /* 11. FAQ — recherche et catégories                                    */
  /* ==================================================================== */

  (function faq() {
    var groups = $$('[data-faq-group]');
    if (!groups.length) return;

    var input = $('[data-faq-search]');
    var empty = $('[data-faq-empty]');
    var tabs = $$('[data-faq-cat]');
    var current = 'all';

    function norm(s) {
      return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function apply() {
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
    }

    if (input) input.addEventListener('input', apply);

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        current = tab.getAttribute('data-faq-cat');
        tabs.forEach(function (t) {
          t.setAttribute('aria-current', String(t === tab));
        });
        apply();
      });
    });

    apply();
  })();

  /* ==================================================================== */
  /* 12. Validation du formulaire de contact                              */
  /* ==================================================================== */

  (function contactForm() {
    var form = $('[data-contact-form]');
    if (!form) return;

    var emailRe = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
    var fields = $$('.field', form);

    function validate(field) {
      var control = $('.input, .textarea, .select', field);
      if (!control) return true;

      var value = control.value.trim();
      var ok = true;

      if (control.hasAttribute('required') && !value) ok = false;
      if (ok && control.type === 'email' && value && !emailRe.test(value)) ok = false;

      field.classList.toggle('has-error', !ok);
      return ok;
    }

    fields.forEach(function (field) {
      var control = $('.input, .textarea, .select', field);
      if (!control) return;

      control.addEventListener('blur', function () {
        validate(field);
      });
      control.addEventListener('input', function () {
        if (field.classList.contains('has-error')) validate(field);
      });
    });

    form.addEventListener('submit', function (e) {
      var valid = fields.map(validate).every(Boolean);
      var consent = $('[data-consent]', form);

      if (consent && !consent.checked) valid = false;

      if (!valid) {
        e.preventDefault();
        var first = $('.field.has-error .input, .field.has-error .textarea, .field.has-error .select', form);
        if (first) first.focus();
      }
    });
  })();

  /* ==================================================================== */
  /* 13. Divers                                                           */
  /* ==================================================================== */

  $$('[data-auto-submit]').forEach(function (select) {
    select.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', select.value);
      url.searchParams.delete('page');
      window.location.href = url.toString();
    });
  });

  (function headerSearch() {
    var box = $('[data-header-search]');
    if (!box) return;

    document.addEventListener('click', function (e) {
      if (box.open && !box.contains(e.target)) box.open = false;
    });

    box.addEventListener('toggle', function () {
      if (box.open) {
        var input = $('input[type="search"]', box);
        if (input) input.focus();
      }
    });
  })();

  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      var url = this.dataset.url;
      if (!url) return;

      fetch(url)
        .then(function (r) {
          return r.text();
        })
        .then(
          function (text) {
            var html = new DOMParser().parseFromString(text, 'text/html');
            var fresh = html.querySelector('product-recommendations');

            if (fresh && fresh.innerHTML.trim().length) {
              this.innerHTML = fresh.innerHTML;
              initReveals(this);
            }
          }.bind(this)
        )
        .catch(function () {});
    }
  }
  customElements.define('product-recommendations', ProductRecommendations);

  /* ==================================================================== */
  /* 14. Comparateur avant / après                                        */
  /* ==================================================================== */

  class CompareSlider extends HTMLElement {
    connectedCallback() {
      var range = this.querySelector('[data-compare-range]');
      if (!range) return;

      var apply = function () {
        this.style.setProperty('--split', range.value + '%');
      }.bind(this);

      range.addEventListener('input', apply);
      apply();
    }
  }
  customElements.define('compare-slider', CompareSlider);

  /* ==================================================================== */
  /* 15. Éditeur de thème                                                 */
  /* ==================================================================== */

  document.addEventListener('shopify:section:load', function (e) {
    initAccordions();
    initReveals(e.target);
  });

  document.addEventListener('shopify:section:select', function (e) {
    if (e.target.querySelector('[data-cart-drawer]')) Cart.open(true);
  });

  document.addEventListener('shopify:section:deselect', function (e) {
    if (e.target.querySelector('[data-cart-drawer]')) Cart.open(false);
  });
})();
