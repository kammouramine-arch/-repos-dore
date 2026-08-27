/* THE UNKNOWN FILE — shared UI behaviours.
   Every module here is opt-in via data-attributes, so pages only pay
   for what they use and nothing throws on pages that don't. */

import { qs, qsa, on, el, trapFocus, lockScroll, prefersReducedMotion } from './dom.js';

/* ── Sticky header ─────────────────────────────────────────── */
export function header() {
  const hd = qs('[data-header]');
  if (!hd) return;
  const sync = () => hd.classList.toggle('is-stuck', window.scrollY > 24);
  sync();
  addEventListener('scroll', sync, { passive: true });
}

/* ── Mobile drawer ─────────────────────────────────────────── */
export function drawer() {
  const btn = qs('[data-nav-toggle]');
  const panel = qs('[data-drawer]');
  if (!btn || !panel) return;
  let release = null;

  const set = (open) => {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    lockScroll(open);
    if (open) { release = trapFocus(panel, btn); qs('a,button', panel)?.focus(); }
    else { release?.(); release = null; }
  };

  set(false);
  on(btn, 'click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  on(panel, 'click', 'a', () => set(false));
  on(document, 'keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('is-open')) set(false); });
}

/* ── Scroll reveal ─────────────────────────────────────────── */
export function reveal() {
  const items = qsa('.rv');
  if (!items.length) return;
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    items.forEach((n) => n.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const delay = Number(entry.target.dataset.rvDelay || 0);
      setTimeout(() => entry.target.classList.add('is-in'), delay);
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  items.forEach((n) => io.observe(n));

  // Insurance: content that animates in must never be able to stay
  // invisible. If anything is still hidden after three seconds — a
  // missed observer callback, a scroll restored before layout settled,
  // a script error further down the page — show it.
  setTimeout(() => {
    qsa('.rv:not(.is-in)').forEach((n) => {
      if (n.getBoundingClientRect().top < window.innerHeight * 1.5) n.classList.add('is-in');
    });
  }, 3000);
}

/* ── Accordion ─────────────────────────────────────────────── */
export function accordion() {
  qsa('[data-acc]').forEach((root) => {
    const single = root.dataset.acc === 'single';
    on(root, 'click', '.acc__btn', (_e, btn) => {
      const panel = btn.nextElementSibling;
      const open = btn.getAttribute('aria-expanded') === 'true';
      if (single && !open) {
        qsa('.acc__btn[aria-expanded="true"]', root).forEach((other) => {
          other.setAttribute('aria-expanded', 'false');
          other.nextElementSibling.dataset.open = 'false';
        });
      }
      btn.setAttribute('aria-expanded', String(!open));
      panel.dataset.open = String(!open);
    });
  });
}

/* ── Modal ─────────────────────────────────────────────────── */
const modals = new Map();

export function modal(id) {
  if (modals.has(id)) return modals.get(id);
  const node = qs(`#${id}`);
  if (!node) return null;
  let release = null;
  const api = {
    node,
    open() {
      node.classList.add('is-open');
      node.setAttribute('aria-hidden', 'false');
      lockScroll(true);
      release = trapFocus(node);
      qs('[data-autofocus]', node)?.focus() ?? qs('button,a,input', node)?.focus();
    },
    close() {
      node.classList.remove('is-open');
      node.setAttribute('aria-hidden', 'true');
      lockScroll(false);
      release?.(); release = null;
    },
  };
  on(node, 'click', (e) => { if (e.target === node) api.close(); });
  on(node, 'click', '[data-modal-close]', () => api.close());
  on(document, 'keydown', (e) => { if (e.key === 'Escape' && node.classList.contains('is-open')) api.close(); });
  modals.set(id, api);
  return api;
}

export function modals_init() {
  qsa('.modal').forEach((n) => { n.setAttribute('aria-hidden', 'true'); modal(n.id); });
  on(document, 'click', '[data-modal-open]', (_e, btn) => modal(btn.dataset.modalOpen)?.open());
}

/* ── Toast ─────────────────────────────────────────────────── */
let toastHost = null;
export function toast(message, ms = 3200) {
  if (!toastHost) {
    toastHost = el('div.toasts', { role: 'status', 'aria-live': 'polite' });
    document.body.append(toastHost);
  }
  const node = el('div.toast', {}, [message]);
  toastHost.append(node);
  setTimeout(() => {
    node.classList.add('is-out');
    setTimeout(() => node.remove(), 320);
  }, ms);
  return node;
}

/* ── Count-up numerals ─────────────────────────────────────── */
export function counters() {
  const nodes = qsa('[data-count]');
  if (!nodes.length) return;
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    nodes.forEach((n) => { n.textContent = n.dataset.count; });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const node = entry.target;
      io.unobserve(node);
      const target = Number(node.dataset.count);
      const suffix = node.dataset.countSuffix || '';
      const dur = 1100;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - k, 3);
        node.textContent = Math.round(target * eased) + suffix;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });
  nodes.forEach((n) => io.observe(n));
}

/* ── Live clock in the header rail (UTC — it reads as "system") ── */
export function clock() {
  const nodes = qsa('[data-clock]');
  if (!nodes.length) return;
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    const d = new Date();
    const stamp = `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
    nodes.forEach((n) => { n.textContent = stamp; });
  };
  tick();
  setInterval(tick, 1000);
}

/* ── Copy-to-clipboard ─────────────────────────────────────── */
export function copyButtons() {
  on(document, 'click', '[data-copy]', async (_e, btn) => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      toast('Copied to clipboard');
    } catch { toast('Copy unavailable in this browser'); }
  });
}

/* ── Year stamp ────────────────────────────────────────────── */
export function year() {
  qsa('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });
}

/* ── Mark the current nav item ─────────────────────────────── */
export function markNav() {
  const here = location.pathname.split('/').pop() || 'index.html';
  qsa('.nav__link, .drawer__link').forEach((a) => {
    const target = a.getAttribute('href')?.split('#')[0];
    if (target && target === here) a.setAttribute('aria-current', 'page');
  });
}

export function initSite() {
  document.documentElement.classList.add('js');
  header(); drawer(); reveal(); accordion(); modals_init();
  counters(); clock(); copyButtons(); year(); markNav();
}
