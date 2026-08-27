/* THE UNKNOWN FILE — tiny DOM helpers.
   No framework. These four functions cover ~95% of what the site needs. */

export const qs  = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** on(target, 'click', handler) or delegated: on(root, 'click', '.sel', handler) */
export function on(target, type, a, b) {
  if (typeof a === 'function') { target.addEventListener(type, a, b); return () => target.removeEventListener(type, a, b); }
  const handler = (e) => {
    const hit = e.target.closest?.(a);
    if (hit && target.contains(hit)) b.call(hit, e, hit);
  };
  target.addEventListener(type, handler);
  return () => target.removeEventListener(type, handler);
}

/** el('div.card', {aria-label:'x'}, [child, 'text']) */
export function el(spec, attrs = {}, children = []) {
  const [tagPart, ...classes] = String(spec).split('.');
  const node = document.createElement(tagPart || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') node.className = `${node.className} ${v}`.trim();
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** Escape untrusted strings before they touch innerHTML. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export const param = (key, url = location.href) => new URL(url).searchParams.get(key);

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Trap focus inside a container (dialogs, drawers). Returns a release fn. */
export function trapFocus(container, restoreTo = document.activeElement) {
  const sel = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const items = qsa(sel, container).filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  container.addEventListener('keydown', onKey);
  return () => { container.removeEventListener('keydown', onKey); restoreTo?.focus?.(); };
}

/** Page scroll lock that survives nested opens. */
let locks = 0;
export function lockScroll(lock) {
  locks = Math.max(0, locks + (lock ? 1 : -1));
  document.documentElement.style.overflow = locks ? 'hidden' : '';
  document.body.style.overflow = locks ? 'hidden' : '';
}
