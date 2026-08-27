/* ═══════════════════════════════════════════════════════════════
   THE UNKNOWN FILE — client state

   ⚠ SCOPE: this is browser-local storage only. It powers the
   investigation UI (progress, notes, theories) and the *demo*
   entitlement model. It is NOT an account system and it is NOT a
   source of truth for what a customer has paid for.

   In production, `entitlements` must be replaced by a server check
   (see docs/INTEGRATION.md). Everything else in this module can stay
   as-is: local progress is a feature, not a stopgap — the case UI
   stays instant and works offline. Sync it to the account later.
   ═══════════════════════════════════════════════════════════════ */

const KEY = 'uf.state.v1';

const BLANK = () => ({
  v: 1,
  createdAt: Date.now(),
  profile: { email: '', name: '' },
  entitlements: {},   // caseId -> { grantedAt, ref, source }
  progress: {},       // caseId -> progress record
  prefs: { reducedFx: false },
});

const BLANK_PROGRESS = () => ({
  startedAt: Date.now(),
  lastSeen: Date.now(),
  examined: [],        // exhibit ids opened
  flagged: [],         // exhibit ids marked as significant
  notes: {},           // exhibitId -> note text
  caseNotes: '',       // free notebook
  links: [],           // ["EX-05|EX-06"] cross-references confirmed
  linkAttempts: 0,
  theory: null,        // { answers:{}, text, submittedAt, score }
  solved: false,
  solvedAt: null,
});

let cache = null;
let available = null;

function storageOK() {
  if (available !== null) return available;
  try {
    localStorage.setItem('uf.probe', '1');
    localStorage.removeItem('uf.probe');
    available = true;
  } catch { available = false; }
  return available;
}

function read() {
  if (cache) return cache;
  if (!storageOK()) return (cache = BLANK());
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cache = (parsed && parsed.v === 1) ? { ...BLANK(), ...parsed } : BLANK();
  } catch { cache = BLANK(); }
  return cache;
}

function write() {
  if (!storageOK()) return;
  try { localStorage.setItem(KEY, JSON.stringify(cache)); }
  catch { /* quota or private mode — the session still works, it just won't persist */ }
  window.dispatchEvent(new CustomEvent('uf:state', { detail: cache }));
}

/* ── Entitlements ─────────────────────────────────────────── */

export const store = {
  /** True if this browser has been granted access to a case. */
  hasAccess(caseId, { free = false } = {}) {
    if (free) return true;
    return Boolean(read().entitlements[caseId]);
  },

  /** DEMO grant. Production replaces this with a server-verified session. */
  grant(caseId, { ref = null, source = 'demo' } = {}) {
    const s = read();
    s.entitlements[caseId] = { grantedAt: Date.now(), ref, source };
    write();
    return s.entitlements[caseId];
  },

  revoke(caseId) { const s = read(); delete s.entitlements[caseId]; write(); },

  entitlements() { return { ...read().entitlements }; },

  /* ── Profile ────────────────────────────────────────────── */
  profile() { return { ...read().profile }; },
  setProfile(patch) { const s = read(); s.profile = { ...s.profile, ...patch }; write(); },

  /* ── Progress ───────────────────────────────────────────── */
  progress(caseId) {
    const s = read();
    if (!s.progress[caseId]) { s.progress[caseId] = BLANK_PROGRESS(); write(); }
    return s.progress[caseId];
  },

  allProgress() { return { ...read().progress }; },

  update(caseId, mutator) {
    const p = store.progress(caseId);
    mutator(p);
    p.lastSeen = Date.now();
    write();
    return p;
  },

  examine(caseId, exhibitId) {
    return store.update(caseId, (p) => {
      if (!p.examined.includes(exhibitId)) p.examined.push(exhibitId);
    });
  },

  toggleFlag(caseId, exhibitId) {
    return store.update(caseId, (p) => {
      const i = p.flagged.indexOf(exhibitId);
      if (i > -1) p.flagged.splice(i, 1); else p.flagged.push(exhibitId);
    });
  },

  setNote(caseId, exhibitId, text) {
    return store.update(caseId, (p) => {
      if (text?.trim()) p.notes[exhibitId] = text; else delete p.notes[exhibitId];
    });
  },

  setCaseNotes(caseId, text) { return store.update(caseId, (p) => { p.caseNotes = text; }); },

  /** Cross-reference key is order-independent. */
  linkKey(a, b) { return [a, b].sort().join('|'); },

  addLink(caseId, a, b) {
    const key = store.linkKey(a, b);
    return store.update(caseId, (p) => {
      p.linkAttempts++;
      if (!p.links.includes(key)) p.links.push(key);
    });
  },

  hasLink(caseId, a, b) { return store.progress(caseId).links.includes(store.linkKey(a, b)); },

  saveTheory(caseId, theory) {
    return store.update(caseId, (p) => { p.theory = { ...theory, submittedAt: Date.now() }; });
  },

  markSolved(caseId) {
    return store.update(caseId, (p) => {
      if (!p.solved) { p.solved = true; p.solvedAt = Date.now(); }
    });
  },

  resetCase(caseId) {
    const s = read();
    s.progress[caseId] = BLANK_PROGRESS();
    write();
  },

  /* ── Whole-state ────────────────────────────────────────── */
  export() { return JSON.stringify(read(), null, 2); },

  import(json) {
    const parsed = JSON.parse(json);
    if (!parsed || parsed.v !== 1) throw new Error('Unrecognised file version.');
    cache = { ...BLANK(), ...parsed };
    write();
  },

  wipe() { cache = BLANK(); write(); },

  isPersistent() { return storageOK(); },
};

/* ── Derived helpers used across pages ─────────────────────── */

export function completion(caseId, totalExhibits) {
  const p = store.progress(caseId);
  if (!totalExhibits) return 0;
  const examined = Math.min(p.examined.length / totalExhibits, 1) * 70;
  const theory = p.theory ? 15 : 0;
  const solved = p.solved ? 15 : 0;
  return Math.round(examined + theory + solved);
}

export function statusLabel(caseId, totalExhibits) {
  const p = store.progress(caseId);
  if (p.solved) return 'CLOSED BY INVESTIGATOR';
  if (p.theory) return 'THEORY FILED';
  if (p.examined.length) return `IN PROGRESS · ${p.examined.length}/${totalExhibits}`;
  return 'NOT STARTED';
}
