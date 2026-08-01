/* ==========================================================================
   Thème RÉVA — product.js
   Galerie, sélecteur de variantes, barre d’achat collante.
   Chargé uniquement sur les pages produit et collection.
   ========================================================================== */

(function () {
  'use strict';

  var $ = function (sel, ctx) {
    return (ctx || document).querySelector(sel);
  };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  var cfg = window.theme || { strings: {}, settings: {} };

  /**
   * Formate un montant en centimes selon le format monétaire de la boutique.
   * Gère les quatre jetons Shopify usuels.
   */
  function formatMoney(cents) {
    var format = cfg.settings.moneyFormat || '{{ amount }}';
    var value = (cents / 100).toFixed(2);

    function withDelimiters(number, precision, thousands, decimal) {
      var parts = parseFloat(number).toFixed(precision).split('.');
      var integer = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      return parts[1] ? integer + decimal + parts[1] : integer;
    }

    return format.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, token) {
      switch (token) {
        case 'amount':
          return withDelimiters(value, 2, ',', ',');
        case 'amount_no_decimals':
          return withDelimiters(value, 0, ' ', ',');
        case 'amount_with_comma_separator':
          return withDelimiters(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator':
          return withDelimiters(value, 0, '.', ',');
        case 'amount_with_space_separator':
          return withDelimiters(value, 2, ' ', ',');
        case 'amount_no_decimals_with_space_separator':
          return withDelimiters(value, 0, ' ', ',');
        default:
          return withDelimiters(value, 2, ' ', ',');
      }
    });
  }

  /* ==================================================================== */
  /* Galerie                                                              */
  /* ==================================================================== */

  (function gallery() {
    var thumbs = $$('[data-thumb]');
    if (!thumbs.length) return;

    var slides = $$('[data-gallery-img]');

    function select(id) {
      thumbs.forEach(function (t) {
        t.setAttribute('aria-selected', String(t.getAttribute('data-thumb') === id));
      });
      slides.forEach(function (slide) {
        slide.classList.toggle('is-hidden', slide.getAttribute('data-gallery-img') !== id);
      });
    }

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        select(thumb.getAttribute('data-thumb'));
      });

      thumb.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();

        var i = thumbs.indexOf(thumb);
        var next = thumbs[(i + (e.key === 'ArrowRight' ? 1 : -1) + thumbs.length) % thumbs.length];
        next.focus();
        select(next.getAttribute('data-thumb'));
      });
    });

    window.selectProductMedia = select;
  })();

  /* ==================================================================== */
  /* Sélecteur de variantes                                               */
  /* ==================================================================== */

  class VariantPicker extends HTMLElement {
    connectedCallback() {
      var json = this.querySelector('[data-variant-json]');
      if (!json) return;

      try {
        this.variants = JSON.parse(json.textContent);
      } catch (e) {
        return;
      }

      this.addEventListener('change', this.onChange.bind(this));
    }

    /** Valeurs actuellement cochées, dans l’ordre des options. */
    selectedOptions() {
      return $$('fieldset', this).map(function (fieldset) {
        var checked = fieldset.querySelector('input:checked');
        return checked ? checked.value : null;
      });
    }

    onChange() {
      var selected = this.selectedOptions();

      var match = this.variants.filter(function (variant) {
        return selected.every(function (value, i) {
          return value === null || variant.options[i] === value;
        });
      })[0];

      // Libellé de l’option choisie
      $$('fieldset', this).forEach(function (fieldset, i) {
        var out = fieldset.querySelector('[data-option-selected]');
        if (out && selected[i]) out.textContent = selected[i];
      });

      this.update(match);
    }

    update(variant) {
      var addButtons = $$('[data-add-to-cart]');
      var label = $('[data-add-to-cart-text]');
      var priceWrapper = $('[data-price-wrapper]');
      var buybarPrice = $('[data-buybar-price]');

      // Identifiant de variante dans tous les formulaires (fiche + barre collante)
      $$('[data-variant-input]').forEach(function (input) {
        if (variant) {
          input.value = variant.id;
          input.disabled = false;
        } else {
          input.disabled = true;
        }
      });

      // Disponibilité
      addButtons.forEach(function (btn) {
        btn.disabled = !variant || !variant.available;
      });

      if (label) {
        if (!variant) {
          label.textContent = cfg.strings.unavailable;
        } else if (!variant.available) {
          label.textContent = cfg.strings.soldOut;
        } else {
          label.textContent = cfg.strings.addToCart + ' — ' + formatMoney(variant.price);
        }
      }

      // Prix
      if (variant && priceWrapper) {
        var current = $('.price__current', priceWrapper);
        var compare = $('.price__compare', priceWrapper);
        var save = $('.save', priceWrapper);

        if (current) current.textContent = formatMoney(variant.price);

        if (compare) {
          if (variant.compare_at_price && variant.compare_at_price > variant.price) {
            compare.textContent = formatMoney(variant.compare_at_price);
            compare.hidden = false;
          } else {
            compare.hidden = true;
          }
        }

        if (save) {
          if (variant.compare_at_price && variant.compare_at_price > variant.price) {
            save.textContent = '−' + formatMoney(variant.compare_at_price - variant.price);
            save.hidden = false;
          } else {
            save.hidden = true;
          }
        }
      }

      if (variant && buybarPrice) buybarPrice.textContent = formatMoney(variant.price);

      // Visuel associé à la variante
      if (variant && variant.featured_media && typeof window.selectProductMedia === 'function') {
        var thumb = $('[data-thumb][data-media-id="' + variant.featured_media.id + '"]');
        if (thumb) window.selectProductMedia(thumb.getAttribute('data-thumb'));
      }

      // URL sans rechargement
      if (variant && this.dataset.url && window.history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }
  customElements.define('variant-picker', VariantPicker);

  /* ==================================================================== */
  /* Zoom de la galerie                                                   */
  /* ==================================================================== */

  (function zoom() {
    var main = $('.gallery__main');
    if (!main) return;

    var modal = null;
    var lastFocus = null;

    function build() {
      modal = document.createElement('div');
      modal.className = 'zoom-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Zoom');
      modal.innerHTML =
        '<button class="zoom-modal__close" type="button" aria-label="Fermer">' +
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">' +
        '<path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/></svg></button>' +
        '<img alt="">';
      document.body.appendChild(modal);

      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.closest('.zoom-modal__close')) close();
      });
    }

    function open(src, alt) {
      if (!modal) build();

      var img = modal.querySelector('img');
      img.src = src;
      img.alt = alt || '';

      lastFocus = document.activeElement;
      modal.classList.add('is-open');
      document.body.classList.add('is-locked');
      modal.querySelector('.zoom-modal__close').focus();
    }

    function close() {
      if (!modal) return;
      modal.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      if (lastFocus) lastFocus.focus();
    }

    main.addEventListener('click', function (e) {
      // Les médias interactifs (vidéo, modèle 3D) gardent leurs propres contrôles.
      if (e.target.closest('video, model-viewer, iframe')) return;

      var visible = main.querySelector('.gallery__slide:not(.is-hidden) img');
      if (!visible) return;

      var src = visible.currentSrc || visible.src;
      open(src, visible.alt);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) close();
    });
  })();

  /* ==================================================================== */
  /* Barre d’achat collante                                               */
  /* ==================================================================== */

  class StickyBuyBar extends HTMLElement {
    connectedCallback() {
      this.anchor = $('[data-buybar-anchor]');
      if (!this.anchor) return;

      this.onScroll = this.onScroll.bind(this);
      this.onScroll();

      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll);
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onScroll);
    }

    onScroll() {
      var past = this.anchor.getBoundingClientRect().bottom < 0;
      var atEnd = window.innerHeight + window.scrollY > document.body.scrollHeight - 260;
      this.classList.toggle('is-visible', past && !atEnd);
    }
  }
  customElements.define('sticky-buy-bar', StickyBuyBar);
})();
