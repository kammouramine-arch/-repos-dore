/* ═══════════════════════════════════════════════════════════════
   THE UNKNOWN FILE — site entry point.

   One module for every page. Features are detected from the DOM
   rather than configured per page, so adding a page never means
   remembering to wire a script tag.
   ═══════════════════════════════════════════════════════════════ */

import { qs, qsa, on, el, esc } from './core/dom.js';
import { initSite, toast, modal } from './core/ui.js';
import { store, completion, statusLabel } from './core/store.js';
import { CASES, byId, PRODUCTS, productBySku } from './data/cases.js';

initSite();

/* ── Archive filter ────────────────────────────────────────── */
(function archiveFilter() {
  const grid = qs('[data-archive-grid]');
  const bar = qs('[data-filter]');
  if (!grid || !bar) return;
  const empty = qs('[data-filter-empty]');

  // Tag each card with its state so filtering needs no lookup.
  const cards = qsa('.case-card', grid);
  cards.forEach((card, i) => {
    const id = card.querySelector('.case-card__no')?.textContent?.replace('CASE #', 'UF-').trim();
    const meta = byId(id) || CASES[i];
    card.dataset.state = meta?.state || 'locked';
  });

  on(bar, 'click', '[data-filter-btn]', (_e, btn) => {
    const want = btn.dataset.filterBtn;
    qsa('[data-filter-btn]', bar).forEach((b) => {
      const active = b === btn;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    let shown = 0;
    cards.forEach((card) => {
      const match = want === 'all' || card.dataset.state === want;
      card.hidden = !match;
      if (match) shown++;
    });
    if (empty) empty.hidden = shown > 0;
  });
})();

/* ── Access state on the product page ──────────────────────── */
(function productAccess() {
  const root = qs('[data-product]');
  if (!root) return;
  const caseId = root.dataset.product;
  const owned = store.hasAccess(caseId);
  qsa('[data-if-owned]', root).forEach((n) => { n.hidden = !owned; });
  qsa('[data-if-unowned]', root).forEach((n) => { n.hidden = owned; });
})();


/* ── Sticky buy bar ────────────────────────────────────────── */
/* Appears once the reader has passed the main purchase panel, and
   retracts over the footer so it never covers the legal links. */
(function buybar() {
  const bar = qs('[data-buybar]');
  if (!bar) return;
  if (store.hasAccess(qs('[data-product]')?.dataset.product || '')) { bar.remove(); return; }
  const anchor = qs('#buy');
  const footer = qs('.footer');
  const sync = () => {
    const past = anchor ? anchor.getBoundingClientRect().bottom < 0 : window.scrollY > 600;
    const atEnd = footer ? footer.getBoundingClientRect().top < window.innerHeight - 40 : false;
    bar.classList.toggle('is-in', past && !atEnd);
  };
  sync();
  addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
})();

/* ── Dashboard ─────────────────────────────────────────────── */
(function dashboard() {
  const root = qs('[data-dashboard]');
  if (!root) return;

  const owned = store.entitlements();
  const progress = store.allProgress();
  const list = qs('[data-dash-list]', root);
  const emptyState = qs('[data-dash-empty]', root);

  const rows = CASES.filter((c) => c.state === 'free' || owned[c.id] || progress[c.id]);

  qs('[data-dash-count]', root).textContent = String(rows.length);
  qs('[data-dash-solved]', root).textContent =
    String(Object.values(progress).filter((p) => p.solved).length);
  qs('[data-dash-notes]', root).textContent =
    String(Object.values(progress).reduce((n, p) => n + Object.keys(p.notes || {}).length + (p.caseNotes ? 1 : 0), 0));

  if (!rows.length) { emptyState.hidden = false; return; }
  emptyState.hidden = true;

  rows.forEach((c) => {
    const p = progress[c.id];
    const pct = p ? completion(c.id, c.exhibits) : 0;
    const status = p ? statusLabel(c.id, c.exhibits) : 'NOT STARTED';
    const access = c.state === 'free' || owned[c.id];

    list.append(el('article.card.card--hover', { dataset: { caseRow: c.id } }, [
      el('div.row.row--between', { style: 'align-items:flex-start;gap:1rem' }, [
        el('div', {}, [
          el('p.mono.dim', { style: 'margin-bottom:.5rem' }, `Case #${c.number}`),
          el('h3.serif', { style: 'font-size:1.4rem' }, c.title),
        ]),
            el('span.status', {
          class: access ? (c.playHref ? 'status--open' : 'status--soon') : 'status--locked',
        }, access ? (c.playHref ? 'Access granted' : 'Reserved — in preparation') : 'No access'),
      ]),
      el('div', { style: 'margin-top:1.25rem' }, [
        el('div.row.row--between', { style: 'margin-bottom:.5rem' }, [
          el('span.mono.dim', {}, status),
          el('span.mono', { style: 'color:var(--bone-100)' }, `${pct}%`),
        ]),
        el('div.bar', {}, [el('div.bar__fill', { style: `width:${pct}%` })]),
      ]),
      el('div.row', { style: 'margin-top:1.25rem;gap:.75rem' }, [
        access && c.playHref
          ? el('a.btn.btn--sm.btn--primary', { href: c.playHref }, p?.examined?.length ? 'Resume' : 'Open file')
          : access
            // Bought as part of a bundle, but the case has not been published yet.
            ? el('span.btn.btn--sm.btn--ghost', { 'aria-disabled': 'true' }, 'Opens on release')
            : el('a.btn.btn--sm.btn--ghost', { href: c.href || 'archive.html' }, 'Get access'),
        p?.examined?.length
          ? el('button.btn.btn--sm.btn--quiet', {
              style: 'padding-inline:.75rem',
              onclick: () => {
                if (!confirm(`Reset your progress on Case #${c.number}? Notes and theories will be deleted.`)) return;
                store.resetCase(c.id);
                location.reload();
              },
            }, 'Reset')
          : null,
      ]),
    ]));
  });
})();

/* ── Demo checkout ─────────────────────────────────────────── */
/* This flow does NOT take payment. It exists so the purchase
   experience can be designed, reviewed and tested end to end before
   a payment provider is connected. See docs/INTEGRATION.md.        */
(function checkout() {
  const form = qs('[data-checkout]');
  if (!form) return;

  const params = new URLSearchParams(location.search);
  const sku = params.get('sku') || 'UF-001';
  const product = productBySku(sku) || PRODUCTS[0];

  qsa('[data-sku-name]').forEach((n) => { n.textContent = product.name; });
  qsa('[data-sku-price]').forEach((n) => { n.textContent = product.display; });
  qsa('[data-sku-blurb]').forEach((n) => { n.textContent = product.blurb; });
  const skuField = qs('[name=sku]', form);
  if (skuField) skuField.value = product.sku;

  qsa('[data-sku-grants]').forEach((n) => {
    n.textContent = product.grants.includes('*')
      ? 'Every case in the archive'
      : product.grants.map((g) => `Case #${g.split('-')[1]}`).join(' · ');
  });

  on(form, 'submit', (e) => {
    e.preventDefault();
    const email = qs('[name=email]', form).value.trim();
    const errorNode = qs('[data-checkout-error]', form);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
      errorNode.textContent = 'Enter an email address we can send your access link to.';
      errorNode.hidden = false;
      qs('[name=email]', form).setAttribute('aria-invalid', 'true');
      return;
    }
    errorNode.hidden = true;

    const btn = qs('[type=submit]', form);
    btn.setAttribute('aria-disabled', 'true');
    btn.textContent = 'Opening the file…';

    // Local grant only. A real integration grants server-side on a
    // verified payment webhook, never here.
    store.setProfile({ email });
    const ref = 'UF-' + Date.now().toString(36).toUpperCase();
    (product.grants.includes('*') ? CASES.map((c) => c.id) : product.grants)
      .forEach((id) => store.grant(id, { ref, source: 'demo' }));

    setTimeout(() => {
      location.href = `order-complete.html?ref=${encodeURIComponent(ref)}&sku=${encodeURIComponent(product.sku)}`;
    }, 700);
  });
})();

/* ── Order complete ────────────────────────────────────────── */
(function orderComplete() {
  const root = qs('[data-order]');
  if (!root) return;
  const params = new URLSearchParams(location.search);
  const product = productBySku(params.get('sku')) || PRODUCTS[0];
  const ref = params.get('ref') || '—';

  qs('[data-order-ref]', root).textContent = ref;
  qs('[data-order-name]', root).textContent = product.name;
  qs('[data-order-email]', root).textContent = store.profile().email || 'your email address';

  const links = qs('[data-order-links]', root);
  const ids = product.grants.includes('*') ? CASES.filter((c) => c.playHref).map((c) => c.id) : product.grants;
  ids.forEach((id) => {
    const c = byId(id);
    if (!c) return;
    links.append(el('a.btn.btn--block', {
      class: c.playHref ? 'btn--primary' : 'btn--ghost',
      href: c.playHref || 'archive.html',
      style: 'margin-bottom:.75rem',
      'aria-disabled': c.playHref ? null : 'true',
    }, c.playHref ? `Open Case #${c.number} — ${c.title}` : `Case #${c.number} — released on publication`));
  });
})();


/* ── Export / import of local case files ───────────────────── */
(function backup() {
  const out = qs('[data-export-state]');
  const inp = qs('[data-import-state]');
  if (out) {
    on(out, 'click', () => {
      const blob = new Blob([store.export()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = el('a', { href: url, download: 'unknown-file-case-files.json' });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Case files exported');
    });
  }
  if (inp) {
    on(inp, 'change', async () => {
      const file = inp.files?.[0];
      if (!file) return;
      try {
        store.import(await file.text());
        toast('Case files restored');
        setTimeout(() => location.reload(), 900);
      } catch (err) {
        toast('That file could not be read');
      }
    });
  }
})();

/* ── Contact form (front-end validation only) ──────────────── */
(function contactForm() {
  const form = qs('[data-contact]');
  if (!form) return;
  on(form, 'submit', (e) => {
    e.preventDefault();
    const email = qs('[name=email]', form);
    const message = qs('[name=message]', form);
    const note = qs('[data-contact-note]', form);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.value.trim()) || message.value.trim().length < 10) {
      note.textContent = 'Add a valid email address and a message of at least ten characters.';
      note.className = 'error';
      note.hidden = false;
      return;
    }
    note.className = 'hint';
    note.hidden = false;
    note.innerHTML = 'This form is not connected to a mailbox yet. Until it is, write to '
      + '<a href="mailto:contact@theunknownfile.com" style="border-bottom:1px solid var(--line-strong)">contact@theunknownfile.com</a> '
      + 'and we will pick it up there.';
  });
})();

/* ── FAQ search ────────────────────────────────────────────── */
(function faqSearch() {
  const input = qs('[data-faq-search]');
  if (!input) return;
  const items = qsa('.acc__i');
  const empty = qs('[data-faq-empty]');
  on(input, 'input', () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    items.forEach((item) => {
      const match = !q || item.textContent.toLowerCase().includes(q);
      item.hidden = !match;
      if (match) shown++;
    });
    if (empty) empty.hidden = shown > 0;
  });
})();

/* ── Persistence notice ────────────────────────────────────── */
if (!store.isPersistent() && qs('[data-storage-warn]')) {
  qs('[data-storage-warn]').hidden = false;
}
