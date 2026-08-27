/* ═══════════════════════════════════════════════════════════════
   THE UNKNOWN FILE — the investigation application

   Loads one dossier, renders three panels, and keeps everything the
   investigator does in local storage.

   ⚠ ACCESS: the check below is client-side and is therefore a
   demonstration, not a paywall. A determined visitor can grant
   themselves access from the console. That is an accepted trade for
   shipping the experience before the backend exists — see
   docs/INTEGRATION.md for the server-side check that replaces it.
   ═══════════════════════════════════════════════════════════════ */

import { qs, qsa, on, el, esc, param, trapFocus, lockScroll, prefersReducedMotion } from './core/dom.js';
import { toast } from './core/ui.js';
import { store, completion } from './core/store.js';
import { byId, loadCase } from './data/cases.js';

const root = qs('[data-inv-root]');
const caseId = (param('case') || 'UF-001').toUpperCase();
const meta = byId(caseId);

document.body.classList.add('inv-mode');

const ui = { view: 'brief', exhibit: null, filter: 'all', query: '', slots: [], panel: 'index' };
let CASE = null;

/* ── Boot ──────────────────────────────────────────────────── */
(async function boot() {
  if (!meta) return gate('No such file', `The archive holds no case with the reference ${esc(caseId)}.`, 'archive.html', 'Back to the archive');

  const free = meta.state === 'free';
  if (!free && !store.hasAccess(caseId)) {
    return gate(
      `Case #${meta.number} is sealed`,
      'This file has not been opened on this device. Access is granted the moment you take the case — or start with the free case, which needs nothing from you.',
      meta.href || 'archive.html',
      `Open Case #${meta.number} — ${meta.priceDisplay}`,
      'investigate.html?case=UF-000',
      'Start the free case instead'
    );
  }

  try {
    CASE = await loadCase(caseId);
  } catch (err) {
    console.error('[unknown-file] dossier load failed', err);
    return gate('The file could not be opened', 'The dossier failed to load. Reload the page, and if it happens again let us know.', 'archive.html', 'Back to the archive');
  }

  document.title = `Case #${CASE.number} — ${CASE.title} | The Unknown File`;
  render();
  restore();
})();

function gate(title, body, href, cta, href2, cta2) {
  root.innerHTML = `
    <div class="gate">
      <div class="gate__in">
        <span class="stamp stamp--lg" style="margin-bottom:2rem">Sealed</span>
        <h1 class="display-sm">${esc(title)}</h1>
        <p class="lead mt-3" style="margin-inline:auto">${esc(body)}</p>
        <div class="row mt-4" style="justify-content:center">
          <a class="btn btn--primary btn--lg" href="${esc(href)}">${esc(cta)}</a>
          ${href2 ? `<a class="btn btn--ghost btn--lg" href="${esc(href2)}">${esc(cta2)}</a>` : ''}
        </div>
      </div>
    </div>`;
}

/* ── Shell ─────────────────────────────────────────────────── */
function render() {
  root.innerHTML = `
    <div class="inv">
      <div class="inv__bar">
        <div class="wrap inv__bar-in">
          <span class="inv__id"><b>Case #${esc(CASE.number)}</b><span>${esc(CASE.title)}</span></span>
          <span class="inv__meter">
            <span data-progress-label>0%</span>
            <span class="bar"><span class="bar__fill" data-progress-bar></span></span>
          </span>
          <button class="btn btn--sm btn--ghost" data-file-theory>File theory</button>
        </div>
      </div>

      <div class="inv__tabs">
        <div class="wrap inv__tabs-in" role="tablist" aria-label="Investigation panels">
          <button class="inv__tab" role="tab" aria-selected="true"  data-panel-btn="index">Index</button>
          <button class="inv__tab" role="tab" aria-selected="false" data-panel-btn="view">Viewer</button>
          <button class="inv__tab" role="tab" aria-selected="false" data-panel-btn="board">Board <b data-board-count></b></button>
        </div>
      </div>

      <div class="inv__body">
        <aside class="inv__panel inv__index is-active" data-panel="index" aria-label="Case index"></aside>
        <section class="inv__panel inv__view" data-panel="view" aria-label="Evidence viewer" tabindex="-1"></section>
        <aside class="inv__panel inv__rail" data-panel="board" aria-label="Investigator board"></aside>
      </div>
    </div>

    <div class="lightbox" data-lightbox aria-hidden="true">
      <button class="x-btn lightbox__x" data-lightbox-close aria-label="Close image">
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>
      </button>
      <img alt="">
    </div>

    <div class="reveal-overlay" data-reveal aria-hidden="true">
      <span class="reveal-sweep"></span>
      <div class="reveal-overlay__in">
        <span class="reveal-stamp" data-reveal-stamp>CASE CLOSED</span>
        <p class="reveal-sub lead" style="margin-inline:auto" data-reveal-sub></p>
      </div>
    </div>`;

  renderIndex();
  setView('brief');
  renderBoard();
  wire();
}

/* ── Index panel ───────────────────────────────────────────── */
function renderIndex() {
  const host = qs('[data-panel=index]');
  const chips = CASE.categories.map((c) =>
    `<button class="chip" data-cat="${esc(c.id)}" aria-pressed="false">${esc(c.label)}</button>`).join('');

  host.innerHTML = `
    <div class="inv__jump" role="group" aria-label="Sections">
      <button data-view="brief">The brief <i>&rarr;</i></button>
      <button data-view="persons">Persons of interest <i>${CASE.persons.length}</i></button>
      <button data-view="timeline">Timeline <i>${CASE.timeline.length}</i></button>
      <button data-view="theories">Working theories <i>${CASE.theories.length}</i></button>
    </div>

    <div class="inv__search">
      <label class="sr-only" for="exq">Search the exhibits</label>
      <input id="exq" type="search" placeholder="SEARCH EXHIBITS" autocomplete="off" data-exq>
    </div>
    <div class="inv__chips">
      <button class="chip" data-cat="all" aria-pressed="true">All</button>
      ${chips}
      <button class="chip" data-cat="flagged" aria-pressed="false">Flagged</button>
      <button class="chip" data-cat="unread" aria-pressed="false">Unopened</button>
    </div>
    <div class="ex-list" data-ex-list></div>
    <p class="board__empty mt-2" data-ex-empty hidden>No exhibit matches.</p>`;

  renderList();
}

function visibleExhibits() {
  const p = store.progress(caseId);
  const q = ui.query.toLowerCase();
  return CASE.exhibits.filter((x) => {
    if (ui.filter === 'flagged' && !p.flagged.includes(x.id)) return false;
    if (ui.filter === 'unread' && p.examined.includes(x.id)) return false;
    if (!['all', 'flagged', 'unread'].includes(ui.filter) && x.cat !== ui.filter) return false;
    if (q && !(`${x.id} ${x.title} ${x.kind} ${x.sub || ''}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

function isLocked(x) {
  return Boolean(x.locked) && !store.progress(caseId).solved;
}

function renderList() {
  const host = qs('[data-ex-list]');
  const p = store.progress(caseId);
  const rows = visibleExhibits();
  qs('[data-ex-empty]').hidden = rows.length > 0;

  host.innerHTML = rows.map((x) => {
    const cls = ['ex-item'];
    if (p.examined.includes(x.id)) cls.push('is-seen');
    if (p.flagged.includes(x.id)) cls.push('is-flagged');
    if (isLocked(x)) cls.push('is-locked');
    return `<button class="${cls.join(' ')}" data-ex="${esc(x.id)}"
        aria-current="${ui.exhibit === x.id}">
      <span class="ex-item__k">${esc(x.id)} · ${esc(x.kind)}</span>
      <span class="ex-item__t">${esc(x.title)}</span>
    </button>`;
  }).join('');
}

/* ── Viewer ────────────────────────────────────────────────── */
function setView(view, id, quiet) {
  ui.view = view;
  if (id) ui.exhibit = id;
  const host = qs('[data-panel=view]');

  if (view === 'exhibit') host.innerHTML = viewExhibit(CASE.exhibits.find((x) => x.id === ui.exhibit));
  else if (view === 'brief') host.innerHTML = viewBrief();
  else if (view === 'persons') host.innerHTML = viewPersons();
  else if (view === 'timeline') host.innerHTML = viewTimeline();
  else if (view === 'theories') host.innerHTML = viewTheories();
  else if (view === 'theory') host.innerHTML = viewTheoryForm();
  else if (view === 'solution') host.innerHTML = viewSolution();

  qsa('[data-view]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.view === view)));
  renderList();
  if (view === 'exhibit') renderBoard();
  host.scrollTop = 0;
  if (!quiet && window.innerWidth < 1080) {
    setPanel('view');
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
}

function viewBrief() {
  const g = CASE;
  return `<div class="doc">
    <div class="doc__hd">
      <span class="doc__kind">${esc(g.classification)}</span>
      <h1 class="doc__t">${esc(g.title)}</h1>
      <p class="doc__sub">${esc(g.filedBy)} · ${esc(g.incidentDate)} · ${esc(g.location)}</p>
    </div>
    <div class="doc__kv">
      <div><dt>Status</dt><dd>${esc(g.status)}</dd></div>
      <div><dt>Location</dt><dd>${esc(g.location)}, ${esc(g.region)}</dd></div>
      <div><dt>Incident</dt><dd>${esc(g.incidentDate)}</dd></div>
      <div><dt>Difficulty</dt><dd>${esc(g.difficulty)}</dd></div>
      <div><dt>Exhibits</dt><dd>${g.exhibits.length}</dd></div>
      <div><dt>Estimated time</dt><dd>${esc(g.duration)} · ${esc(g.sittings)}</dd></div>
    </div>
    ${g.brief.map((p) => `<p>${esc(p)}</p>`).join('')}
    <div class="doc__note" style="border-left-color:var(--red)">
      This case is fiction. Every person, vessel, agency and place named in it is invented, and nothing in it depicts a real event or a real person.
    </div>
    <div class="doc__acts">
      <button class="btn btn--sm btn--primary" data-first-exhibit>Open the first exhibit</button>
      <button class="btn btn--sm btn--ghost" data-view="timeline">See the timeline</button>
    </div>
  </div>`;
}

function viewPersons() {
  return `<div class="doc">
    <div class="doc__hd"><span class="doc__kind">Persons of interest</span><h1 class="doc__t">Who was there</h1></div>
    ${CASE.persons.map((p) => `
      <section style="border:1px solid var(--line);border-radius:var(--r-sm);padding:1.15rem;margin-bottom:1rem;background:var(--ink-050)">
        <div class="row row--between" style="align-items:flex-start;gap:1rem">
          <div>
            <h4 style="margin:0 0 .35rem">${esc(p.name)}${p.age ? `, ${p.age}` : ''}</h4>
            <p class="mono dim" style="margin:0">${esc(p.role)}</p>
          </div>
          <span class="status ${p.status === 'MISSING' ? 'status--open' : 'status--solved'}">${esc(p.status)}</span>
        </div>
        <p style="margin-top:.9rem">${esc(p.summary)}</p>
        ${p.note ? `<div class="doc__note" style="margin-bottom:0">${esc(p.note)}</div>` : ''}
      </section>`).join('')}
  </div>`;
}

function viewTimeline() {
  const p = store.progress(caseId);
  return `<div class="doc">
    <div class="doc__hd">
      <span class="doc__kind">Master timeline</span>
      <h1 class="doc__t">The night, as recorded</h1>
      <p class="doc__sub">Each entry is sourced to the exhibit that establishes it. Entries the file cannot establish are not here.</p>
    </div>
    <div class="tl">
      ${CASE.timeline.filter((t) => !t.hidden || p.solved).map((t) => `
        <div class="tl__i ${t.key ? 'tl__i--key' : ''} ${t.gap ? 'tl__i--gap' : ''}">
          <span class="tl__t">${esc(t.time)}</span>
          <p class="tl__d">${esc(t.text)}</p>
          <span class="tl__src">Source: ${esc(t.src)}</span>
        </div>`).join('')}
    </div>
  </div>`;
}

function viewTheories() {
  return `<div class="doc">
    <div class="doc__hd">
      <span class="doc__kind">Working theories</span>
      <h1 class="doc__t">Three readings of the same night</h1>
      <p class="doc__sub">These are the readings the file itself considered. One of them survives the evidence. You are not obliged to agree with any of them.</p>
    </div>
    ${CASE.theories.map((t) => `
      <section style="border:1px solid var(--line);border-radius:var(--r-sm);padding:1.15rem;margin-bottom:1rem;background:var(--ink-050)">
        <p class="mono" style="color:var(--red-bright);margin-bottom:.6rem">${esc(t.id)} · ${esc(t.name)}</p>
        <p style="color:var(--bone-100)">${esc(t.claim)}</p>
        <h4>In its favour</h4><ul class="doc__list">${t.forIt.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        <h4>Against it</h4><ul class="doc__list">${t.against.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        <p class="mono dim">Verdict of the file: ${esc(t.verdict)}</p>
      </section>`).join('')}
    <div class="doc__acts"><button class="btn btn--sm btn--primary" data-file-theory>File your own reconstruction</button></div>
  </div>`;
}

/* ── Exhibit rendering ─────────────────────────────────────── */
function block(b) {
  switch (b.t) {
    case 'head': return `<h4>${esc(b.v)}</h4>`;
    case 'p': return `<p>${esc(b.v)}</p>`;
    case 'mono': return `<p class="doc__mono">${esc(b.v)}</p>`;
    case 'quote': return `<blockquote class="doc__quote">${esc(b.v)}</blockquote>`;
    case 'note': return `<div class="doc__note">${esc(b.v)}</div>`;
    case 'list': return `<ul class="doc__list">${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
    case 'kv': return `<dl class="doc__kv">${b.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    case 'img': return `<figure class="doc__fig">
        <img class="doc__zoom" src="${esc(b.src)}" alt="${esc(b.alt)}" loading="lazy" decoding="async" data-zoom="${esc(b.src)}">
        ${b.cap ? `<figcaption>${esc(b.cap)}</figcaption>` : ''}
      </figure>`;
    case 'table': return `<div class="doc__scroll"><table class="doc__table">
        <thead><tr>${b.cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>${b.note ? `<p class="doc__tnote">${esc(b.note)}</p>` : ''}`;
    case 'transcript': return `<div class="tx">${b.rows.map((r) => `
        <div class="tx__r ${r.line ? 'tx__r--speech' : ''}">
          <span class="tx__t">${esc(r.time)}</span>
          <div>${r.line
            ? `<span class="tx__w">${esc(r.who || 'VOICE')}</span><span class="tx__l">${esc(r.line)}</span>`
            : `<span class="tx__c">${esc(r.cue)}</span>`}</div>
        </div>`).join('')}</div>`;
    case 'sig': return `<div class="doc__sig"><b>${esc(b.name)}</b>${esc(b.role)}<br>${esc(b.date)}</div>`;
    default: return '';
  }
}

function viewExhibit(x) {
  if (!x) return viewBrief();
  const p = store.progress(caseId);

  if (isLocked(x)) {
    return `<div class="doc">
      <div class="doc__hd"><span class="doc__kind">Sealed exhibit</span><h1 class="doc__t">${esc(x.title)}</h1>
      <p class="doc__sub">${esc(x.sub)}</p></div>
      <p>This exhibit is released with the conclusion of the case. File your reconstruction to open it.</p>
      <div class="doc__acts"><button class="btn btn--sm btn--primary" data-file-theory>File your theory</button></div>
    </div>`;
  }

  store.examine(caseId, x.id);
  const flagged = store.progress(caseId).flagged.includes(x.id);
  const note = p.notes[x.id] || '';

  return `<article class="doc">
    <div class="doc__hd">
      <span class="doc__kind">${esc(x.id)} · ${esc(x.kind)}</span>
      <h1 class="doc__t">${esc(x.title)}</h1>
      ${x.sub ? `<p class="doc__sub">${esc(x.sub)}</p>` : ''}
      <div class="doc__acts">
        <button class="btn btn--sm ${flagged ? 'btn--red' : 'btn--ghost'}" data-flag="${esc(x.id)}">
          ${flagged ? 'Flagged as significant' : 'Flag as significant'}
        </button>
        <button class="btn btn--sm btn--ghost" data-slot="${esc(x.id)}">Add to cross-reference</button>
        ${x.hint ? `<button class="btn btn--sm btn--quiet" style="padding-inline:.75rem" data-hint="${esc(x.id)}">Need a nudge?</button>` : ''}
      </div>
      <p class="doc__note" data-hint-body hidden style="margin-top:1rem">${esc(x.hint || '')}</p>
    </div>
    ${x.body.map(block).join('')}
    <div class="doc__notepad">
      <label class="label" for="exnote">Your note on ${esc(x.id)}</label>
      <textarea class="textarea mt-1" id="exnote" data-exnote="${esc(x.id)}"
        placeholder="What does this exhibit prove, and what does it only appear to prove?">${esc(note)}</textarea>
      <p class="hint mt-1">Saved on this device as you type.</p>
    </div>
  </article>`;
}

/* ── Board ─────────────────────────────────────────────────── */
function renderBoard() {
  const host = qs('[data-panel=board]');
  // Never redraw the board out from under someone who is mid-sentence.
  if (document.activeElement?.matches?.('[data-casenotes]')) return;
  const p = store.progress(caseId);
  const pct = completion(caseId, CASE.exhibits.length);

  const found = CASE.crossRefs.filter((x) => p.links.includes(store.linkKey(x.pair[0], x.pair[1])));
  const keyTotal = CASE.crossRefs.filter((x) => x.weight === 'key').length;
  const keyFound = found.filter((x) => x.weight === 'key').length;

  host.innerHTML = `
    <div class="board">
      <div class="board__h"><span>Progress</span><b>${pct}%</b></div>
      <div class="board__b">
        <div class="bar mb-2"><span class="bar__fill" style="width:${pct}%"></span></div>
        <div class="grade__rows" style="margin:0;padding:0;border:0">
          <div class="grade__row"><i>${p.examined.length}/${CASE.exhibits.length}</i>Exhibits opened</div>
          <div class="grade__row"><i>${keyFound}/${keyTotal}</i>Findings established</div>
          <div class="grade__row"><i>${p.flagged.length}</i>Flagged as significant</div>
        </div>
      </div>
    </div>

    <div class="board">
      <div class="board__h"><span>Cross-reference</span></div>
      <div class="board__b">
        <div class="slots">
          <span class="slot ${ui.slots[0] ? 'is-set' : ''}" data-slot-view="0">${ui.slots[0] ? esc(ui.slots[0]) : 'Exhibit A'}</span>
          <span class="slots__x">&times;</span>
          <span class="slot ${ui.slots[1] ? 'is-set' : ''}" data-slot-view="1">${ui.slots[1] ? esc(ui.slots[1]) : 'Exhibit B'}</span>
        </div>
        <button class="btn btn--sm btn--primary btn--block" data-xref ${ui.slots.length < 2 ? 'aria-disabled="true"' : ''}>Submit the pair</button>
        <button class="btn btn--sm btn--quiet btn--block" data-xclear>Clear slots</button>
        <p class="board__empty mt-2">Open an exhibit and use <b style="color:var(--bone-300)">Add to cross-reference</b>. Two exhibits that genuinely contradict each other will return a finding.</p>
      </div>
    </div>

    <div class="board">
      <div class="board__h"><span>Findings</span><b>${found.length}</b></div>
      <div class="board__b">
        ${found.length ? found.map((f) => `
          <div class="finding ${f.weight === 'herring' ? 'finding--herring' : ''} ${f.weight === 'open' ? 'finding--open' : ''}">
            <p class="finding__k">${esc(f.pair.join(' × '))}</p>
            <p class="finding__t">${esc(f.title)}</p>
            <p class="finding__d">${esc(f.finding)}</p>
            ${f.note ? `<span class="finding__tag">${esc(f.note)}</span>` : ''}
          </div>`).join('')
          : '<p class="board__empty">Nothing established yet.</p>'}
      </div>
    </div>

    <div class="board">
      <div class="board__h"><span>Flagged</span><b>${p.flagged.length}</b></div>
      <div class="board__b">
        ${p.flagged.length ? `<div class="flag-list">${p.flagged.map((id) => {
          const x = CASE.exhibits.find((e) => e.id === id);
          return `<button data-ex="${esc(id)}"><b>${esc(id)}</b>${esc(x ? x.title : '')}</button>`;
        }).join('')}</div>` : '<p class="board__empty">Nothing flagged.</p>'}
      </div>
    </div>

    <div class="board">
      <div class="board__h"><span>Notebook</span></div>
      <div class="board__b">
        <label class="sr-only" for="casenotes">Case notebook</label>
        <textarea class="textarea" id="casenotes" data-casenotes
          placeholder="Who benefits. What cannot be true. What you would ask next.">${esc(p.caseNotes)}</textarea>
      </div>
    </div>

    <button class="btn ${p.solved ? 'btn--ghost' : 'btn--primary'} btn--block" data-file-theory>
      ${p.solved ? 'Reopen the conclusion' : 'File your theory'}
    </button>`;

  qs('[data-board-count]').textContent = found.length ? String(found.length) : '';
  qs('[data-progress-label]').textContent = `${pct}%`;
  qs('[data-progress-bar]').style.width = `${pct}%`;
}

/* ── Theory form ───────────────────────────────────────────── */
function viewTheoryForm() {
  const p = store.progress(caseId);
  const prev = p.theory?.answers || {};
  const f = CASE.theoryForm;

  return `<div class="doc" style="max-width:70ch">
    <div class="doc__hd">
      <span class="doc__kind">Reconstruction</span>
      <h1 class="doc__t">File your theory</h1>
      <p class="doc__sub">${esc(f.intro)}</p>
    </div>
    <form class="qset" data-theory-form>
      ${f.questions.map((q, i) => `
        <fieldset class="q">
          <legend class="sr-only">${esc(q.prompt)}</legend>
          <p class="q__n">Question ${String(i + 1).padStart(2, '0')} of ${String(f.questions.length).padStart(2, '0')}</p>
          <p class="q__p">${esc(q.prompt)}</p>
          ${q.type === 'exhibit'
            ? `<label class="label" for="${q.id}">Exhibit code</label>
               <input class="input mt-1" id="${q.id}" name="${q.id}" autocomplete="off"
                 placeholder="${esc(q.placeholder || '')}" value="${esc(prev[q.id] || '')}"
                 list="exhibit-codes">
               <datalist id="exhibit-codes">${CASE.exhibits.map((x) => `<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('')}</datalist>`
            : `<div class="q__opts">${q.options.map((o) => `
                <label class="choice">
                  <input type="radio" name="${q.id}" value="${esc(o.id)}" ${prev[q.id] === o.id ? 'checked' : ''}>
                  <span class="choice__t">${esc(o.label)}</span>
                </label>`).join('')}</div>`}
        </fieldset>`).join('')}

      <fieldset class="q">
        <p class="q__n">Optional</p>
        <p class="q__p">Anything you want on the record?</p>
        <label class="sr-only" for="freetext">Your reasoning</label>
        <textarea class="textarea" id="freetext" name="freetext"
          placeholder="The reasoning behind your reconstruction.">${esc(p.theory?.text || '')}</textarea>
      </fieldset>

      <p class="error" data-theory-error hidden></p>
      <button class="btn btn--primary btn--lg btn--block" type="submit">Submit and open the conclusion</button>
      <p class="hint center">There is no penalty for being wrong, and the conclusion opens either way. You can change your reconstruction and file it again.</p>
    </form>
  </div>`;
}

function gradeTheory(answers) {
  const rows = CASE.theoryForm.questions.map((q) => {
    const given = (answers[q.id] || '').trim();
    const correct = q.type === 'exhibit'
      ? given.toUpperCase() === q.answer.toUpperCase()
      : Boolean(q.options.find((o) => o.id === given && o.correct));
    const right = q.type === 'exhibit'
      ? q.answer
      : q.options.find((o) => o.correct)?.label;
    return { q, given, correct, right };
  });
  return { rows, score: rows.filter((r) => r.correct).length, total: rows.length };
}

/* ── Solution ──────────────────────────────────────────────── */
function viewSolution() {
  const p = store.progress(caseId);
  const s = CASE.solution;
  const graded = p.theory ? gradeTheory(p.theory.answers) : null;
  const grade = graded ? (CASE.theoryForm.grades[graded.score] || CASE.theoryForm.grades[0]) : null;

  return `<div class="doc">
    <div class="doc__hd">
      <span class="doc__kind">Conclusion</span>
      <h1 class="doc__t">${esc(s.title)}</h1>
    </div>

    ${graded ? `<div class="grade">
      <p class="grade__score">${graded.score}<span style="color:var(--bone-500);font-size:.45em"> / ${graded.total}</span></p>
      <p class="grade__t">${esc(grade.title)}</p>
      <p class="muted">${esc(grade.note)}</p>
      <div class="grade__rows">
        ${graded.rows.map((r, i) => `
          <div class="grade__row grade__row--${r.correct ? 'ok' : 'no'}">
            <i>${r.correct ? '✓' : '✗'} Q${i + 1}</i>
            <span>${esc(r.q.prompt)}${r.correct ? '' : ` <span style="color:var(--bone-400)">— the file supports: ${esc(r.right)}</span>`}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <p class="lead" style="color:var(--bone-100)">${esc(s.verdict)}</p>

    <div class="mt-4">
      ${s.steps.map((st) => `
        <div class="sol__step">
          <span class="sol__n">${esc(st.n)}</span>
          <div>
            <h3 class="sol__h">${esc(st.head)}</h3>
            <p class="sol__b">${esc(st.body)}</p>
            <div class="sol__refs">${st.refs.map((r) => `<button data-ex="${esc(r)}">${esc(r)}</button>`).join('')}</div>
          </div>
        </div>`).join('')}
    </div>

    <h4 style="margin-top:2.5rem">Afterwards</h4>
    ${s.aftermath.map((a) => `<p>${esc(a)}</p>`).join('')}

    ${s.unlocks?.length ? `<div class="doc__note" style="border-left-color:var(--red)">
      Released with this conclusion: ${s.unlocks.map((u) => esc(u)).join(', ')}. It is now in the index.
    </div>` : ''}

    <div style="margin-top:3rem;padding:clamp(1.5rem,4vw,2.5rem);border:1px solid var(--line-red);border-radius:var(--r-md);background:radial-gradient(80% 100% at 50% 0%,rgba(180,18,28,.1),var(--ink-050))">
      <p class="mono" style="color:var(--red-bright);margin-bottom:1rem">The question the file leaves open</p>
      ${s.finalQuestion.split('\n\n').map((q) => `<p style="font-family:var(--serif);font-size:clamp(1.15rem,3vw,1.5rem);line-height:1.4;color:var(--bone-100);margin-bottom:1rem">${esc(q)}</p>`).join('')}
    </div>

    <div class="doc__acts" style="margin-top:2rem">
      ${s.unlocks?.length ? `<button class="btn btn--sm btn--primary" data-ex="${esc(s.unlocks[0])}">Open ${esc(s.unlocks[0])}</button>` : ''}
      <a class="btn btn--sm btn--ghost" href="archive.html">Back to the archive</a>
      <button class="btn btn--sm btn--quiet" style="padding-inline:.75rem" data-view="theory">Revise my reconstruction</button>
    </div>
  </div>`;
}

/* ── Reveal animation ──────────────────────────────────────── */
function playReveal(score, total) {
  const overlay = qs('[data-reveal]');
  const stamp = qs('[data-reveal-stamp]');
  const sub = qs('[data-reveal-sub]');
  stamp.textContent = score === total ? 'CASE CLOSED' : 'FILE OPENED';
  sub.textContent = score === total
    ? 'Complete reconstruction. Read what you got right.'
    : `${score} of ${total}. The conclusion is open — read it against your own.`;
  overlay.classList.add('is-on');
  overlay.setAttribute('aria-hidden', 'false');
  lockScroll(true);
  const close = () => {
    overlay.classList.remove('is-on');
    overlay.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    setView('solution');
  };
  setTimeout(close, prefersReducedMotion() ? 900 : 2900);
  on(overlay, 'click', close);
}

/* ── Wiring ────────────────────────────────────────────────── */
function wire() {
  const shell = qs('.inv');

  on(shell, 'click', '[data-panel-btn]', (_e, b) => setPanel(b.dataset.panelBtn));
  on(shell, 'click', '[data-view]', (_e, b) => setView(b.dataset.view));
  on(shell, 'click', '[data-ex]', (_e, b) => setView('exhibit', b.dataset.ex));
  on(shell, 'click', '[data-first-exhibit]', () => setView('exhibit', CASE.exhibits[0].id));
  on(shell, 'click', '[data-file-theory]', () => setView('theory'));

  on(shell, 'input', '[data-exq]', (e) => { ui.query = e.target.value; renderList(); });

  on(shell, 'click', '[data-cat]', (_e, b) => {
    ui.filter = b.dataset.cat;
    qsa('[data-cat]').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    renderList();
  });

  on(shell, 'click', '[data-flag]', (_e, b) => {
    store.toggleFlag(caseId, b.dataset.flag);
    setView('exhibit', b.dataset.flag);
    renderBoard();
  });

  on(shell, 'click', '[data-hint]', (_e, b) => {
    const body = qs('[data-hint-body]');
    body.hidden = !body.hidden;
    b.textContent = body.hidden ? 'Need a nudge?' : 'Hide the nudge';
  });

  on(shell, 'click', '[data-slot]', (_e, b) => {
    const id = b.dataset.slot;
    if (ui.slots.includes(id)) return toast(`${id} is already in a slot`);
    if (ui.slots.length >= 2) ui.slots.shift();
    ui.slots.push(id);
    renderBoard();
    toast(ui.slots.length === 2 ? 'Both slots filled — submit the pair' : `${id} added to the cross-reference`);
    if (window.innerWidth < 1080 && ui.slots.length === 2) setPanel('board');
  });

  on(shell, 'click', '[data-xclear]', () => { ui.slots = []; renderBoard(); });

  on(shell, 'click', '[data-xref]', () => {
    if (ui.slots.length < 2) return;
    const [a, b] = ui.slots;
    const hit = CASE.crossRefs.find((x) => store.linkKey(x.pair[0], x.pair[1]) === store.linkKey(a, b));
    if (!hit) {
      store.update(caseId, (p) => { p.linkAttempts++; });
      toast('No established connection between those two');
      ui.slots = [];
      renderBoard();
      return;
    }
    const already = store.hasLink(caseId, a, b);
    store.addLink(caseId, a, b);
    ui.slots = [];
    renderBoard();
    if (window.innerWidth < 1080) setPanel('board');
    toast(already ? 'Already on the board' : 'Finding established');
  });

  /* Debounced note saving — one write per pause, not per keystroke. */
  let noteTimer;
  on(shell, 'input', '[data-exnote]', (e) => {
    clearTimeout(noteTimer);
    const id = e.target.dataset.exnote, value = e.target.value;
    noteTimer = setTimeout(() => { store.setNote(caseId, id, value); renderBoard(); }, 450);
  });
  let caseTimer;
  on(shell, 'input', '[data-casenotes]', (e) => {
    clearTimeout(caseTimer);
    const value = e.target.value;
    caseTimer = setTimeout(() => store.setCaseNotes(caseId, value), 450);
  });

  on(shell, 'submit', '[data-theory-form]', (e) => {
    e.preventDefault();
    const form = e.target;
    const answers = {};
    let missing = null;
    CASE.theoryForm.questions.forEach((q) => {
      const v = q.type === 'exhibit'
        ? qs(`[name=${q.id}]`, form).value.trim()
        : (qsa(`[name=${q.id}]`, form).find((i) => i.checked)?.value || '');
      answers[q.id] = v;
      if (!v && !missing) missing = q;
    });
    const err = qs('[data-theory-error]', form);
    if (missing) {
      err.textContent = 'Answer every question before you file. A reconstruction with a hole in it is not a reconstruction.';
      err.hidden = false;
      return;
    }
    err.hidden = true;

    const graded = gradeTheory(answers);
    store.saveTheory(caseId, { answers, text: qs('[name=freetext]', form).value.trim(), score: graded.score });
    store.markSolved(caseId);
    renderList();
    renderBoard();
    playReveal(graded.score, graded.total);
  });

  /* Lightbox */
  const box = qs('[data-lightbox]');
  on(shell, 'click', '[data-zoom]', (_e, img) => {
    qs('img', box).src = img.dataset.zoom;
    qs('img', box).alt = img.alt;
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
    lockScroll(true);
  });
  const closeBox = () => {
    box.classList.remove('is-open');
    box.setAttribute('aria-hidden', 'true');
    lockScroll(false);
  };
  on(box, 'click', closeBox);
  on(document, 'keydown', (e) => { if (e.key === 'Escape' && box.classList.contains('is-open')) closeBox(); });
}

function setPanel(name) {
  ui.panel = name;
  qsa('.inv__panel').forEach((p) => p.classList.toggle('is-active', p.dataset.panel === name));
  qsa('[data-panel-btn]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.panelBtn === name)));
}

/* Reopen where the investigator left off. */
function restore() {
  const p = store.progress(caseId);
  if (p.solved) { setView('solution', null, true); return; }
  if (p.theory) { setView('theory', null, true); return; }
  const last = p.examined[p.examined.length - 1];
  if (last) setView('exhibit', last, true);
}
