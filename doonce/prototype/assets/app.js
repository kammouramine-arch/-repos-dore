// DoOnce prototype core: state, router, transitions, haptic simulator, shared components.
// Classic script (works from file://). Screens register themselves on DO.screens.
window.DO = (() => {
  const S = window.STRINGS.en;
  const t = (key, vars = {}) => {
    let v = S[key];
    if (v === undefined) return key;
    if (typeof v === 'object' && !Array.isArray(v)) {
      const n = vars.n ?? 0;
      v = n === 0 && v.zero ? v.zero : n === 1 ? v.one : v.other;
    }
    return String(v).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  };

  const state = {
    theme: 'auto', reduceMotion: false, haptics: 'full',
    stack: [],            // [{ name, params, el }]
    onboarded: false,
    savedMemories: new Set(), // ids created in this session
    prefs: { sounds: true, handsFree: false },
    tab: 'memory',
  };

  const q = (sel, root = document) => root.querySelector(sel);
  const el = (html) => { const tpl = document.createElement('template'); tpl.innerHTML = html.trim(); return tpl.content.firstElementChild; };
  const root = q('[data-root]');
  const phone = q('[data-phone]');
  const wait = ms => new Promise(r => setTimeout(r, state.reduceMotion ? Math.min(ms, 60) : ms));
  const dur = name => state.reduceMotion ? 160 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--dur-${name}`)) || 260;

  // ---------- Haptics (simulated: logged in reviewer panel) ----------
  const hapticLog = q('[data-haptic-log]');
  function haptic(kind) {
    if (state.haptics === 'off') return;
    if (state.haptics === 'reduced' && (kind === 'selection' || kind === 'light')) return;
    const row = el(`<span>${kind}</span>`);
    hapticLog.prepend(row);
    while (hapticLog.children.length > 4) hapticLog.lastChild.remove();
  }

  // ---------- Dynamic Island ----------
  const island = q('[data-island]');
  function setIsland(html) {
    island.innerHTML = html || '';
    q('.phone__island').classList.toggle('is-expanded', !!html);
  }

  // ---------- Theme ----------
  function applyTheme() {
    const r = document.documentElement;
    if (state.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', state.theme);
    document.body.classList.toggle('reduce-motion', state.reduceMotion);
    q('[data-theme-toggle]').textContent = `Theme: ${state.theme}`;
    q('[data-motion-toggle]').textContent = `Motion: ${state.reduceMotion ? 'reduced' : 'full'}`;
  }

  // ---------- Router ----------
  const screens = {};
  function register(name, factory) { screens[name] = factory; }

  function top() { return state.stack[state.stack.length - 1]; }

  async function go(name, params = {}, opts = {}) {
    const factory = screens[name];
    if (!factory) { console.warn('no screen', name); return; }
    const transition = opts.transition || 'push';
    const prev = top();
    const node = factory(params);
    node.classList.add('screen');
    node.dataset.screen = name;
    phone.classList.toggle('on-media', !!node.dataset.media);
    root.appendChild(node);
    const entry = { name, params, el: node, media: !!node.dataset.media };
    if (opts.replace && prev) { state.stack.pop(); }
    if (opts.reset) { state.stack.forEach(s => s !== prev && s.el.remove()); state.stack = prev ? [prev] : []; if (opts.replace) state.stack = []; }
    state.stack.push(entry);
    await animateIn(node, prev?.el, transition, opts);
    if (opts.replace || opts.reset) { prev?.el.remove(); }
    else if (prev) { prev.el.style.visibility = 'hidden'; }
    node.dispatchEvent(new CustomEvent('screen:shown'));
    updateJump();
    return node;
  }

  async function back(opts = {}) {
    if (state.stack.length < 2) return;
    const cur = state.stack.pop();
    const prev = top();
    prev.el.style.visibility = '';
    phone.classList.toggle('on-media', prev.media);
    await animateOut(cur.el, prev.el, opts.transition || 'pop');
    cur.el.remove();
    prev.el.dispatchEvent(new CustomEvent('screen:shown'));
    updateJump();
  }

  const RM = () => state.reduceMotion;
  function animateIn(node, prevEl, transition, opts) {
    const d = dur('navigation'), easing = 'cubic-bezier(0.32, 0.72, 0, 1)';
    if (RM() || transition === 'none') return node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: RM() ? 160 : 1, fill: 'both' }).finished;
    if (transition === 'fade') return node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur('standard'), easing, fill: 'both' }).finished;
    if (transition === 'sheet') return node.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: d, easing, fill: 'both' }).finished;
    if (transition === 'zoom') {
      return node.animate([{ transform: 'scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: dur('standard'), easing, fill: 'both' }).finished;
    }
    if (transition === 'morph' && opts.from) {
      // Matched geometry: expand from the source rect to full screen.
      const r = opts.from.getBoundingClientRect(), pr = phone.getBoundingClientRect();
      const sx = r.width / pr.width, sy = r.height / pr.height;
      const tx = r.left - pr.left, ty = r.top - pr.top;
      node.style.transformOrigin = '0 0';
      const clip = node.animate([{ transform: `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`, borderRadius: '24px', opacity: .98 }, { transform: 'none', borderRadius: '0px', opacity: 1 }], { duration: dur('navigation'), easing, fill: 'both' });
      const inner = node.querySelector('[data-morph-content]');
      if (inner) inner.animate([{ opacity: 0 }, { opacity: 0, offset: .35 }, { opacity: 1 }], { duration: dur('navigation'), easing, fill: 'both' });
      return clip.finished;
    }
    // push
    if (prevEl) prevEl.animate([{ transform: 'none' }, { transform: 'translateX(-24%)' }], { duration: d, easing, fill: 'both' });
    return node.animate([{ transform: 'translateX(100%)' }, { transform: 'none' }], { duration: d, easing, fill: 'both' }).finished;
  }
  function animateOut(node, prevEl, transition) {
    const d = dur('navigation'), easing = 'cubic-bezier(0.32, 0.72, 0, 1)';
    if (RM() || transition === 'none') return node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: RM() ? 160 : 1, fill: 'both' }).finished;
    if (transition === 'fade') return node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur('standard'), easing, fill: 'both' }).finished;
    if (transition === 'sheet') return node.animate([{ transform: 'none' }, { transform: 'translateY(100%)' }], { duration: d, easing, fill: 'both' }).finished;
    if (transition === 'zoom') return node.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(.94)', opacity: 0 }], { duration: dur('standard'), easing, fill: 'both' }).finished;
    prevEl.animate([{ transform: 'translateX(-24%)' }, { transform: 'none' }], { duration: d, easing, fill: 'both' });
    return node.animate([{ transform: 'none' }, { transform: 'translateX(100%)' }], { duration: d, easing, fill: 'both' }).finished;
  }

  // ---------- Overlays: sheet, toast, island ----------
  function openSheet(html, { onClose, media } = {}) {
    const host = top().el;
    const scrim = el('<div class="sheet__scrim"></div>');
    const sheet = el(`<div class="sheet ${media ? 'sheet--onmedia' : ''}"><div class="sheet__grabber"></div>${html}</div>`);
    host.append(scrim, sheet);
    requestAnimationFrame(() => { scrim.classList.add('is-open'); sheet.classList.add('is-open'); });
    const close = async () => { scrim.classList.remove('is-open'); sheet.classList.remove('is-open'); await wait(dur('navigation')); scrim.remove(); sheet.remove(); onClose?.(); };
    scrim.addEventListener('click', close);
    sheet.addEventListener('click', e => { if (e.target.closest('[data-sheet-close]')) close(); });
    return { sheet, close };
  }
  function toast(text, ms = 1800) {
    const n = el(`<div class="toast">${text}</div>`);
    phone.appendChild(n);
    requestAnimationFrame(() => n.classList.add('is-in'));
    setTimeout(async () => { n.classList.remove('is-in'); await wait(300); n.remove(); }, ms);
  }

  // ---------- Icons (SF-Symbol-like strokes) ----------
  const icons = {
    loop: '<svg class="icon" viewBox="0 0 100 100"><path d="M 21 51.5 C 27 53.5, 32.5 58.5, 37.6 64.4 A 26 26 0 1 0 32.4 35.0" stroke-width="12"/></svg>',
    person: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6"/></svg>',
    close: '<svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back: '<svg class="icon" viewBox="0 0 24 24"><path d="M14 5l-7 7 7 7"/></svg>',
    chevron: '<svg class="icon chevron" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6"/></svg>',
    mic: '<svg class="icon" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    camera: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    eye: '<svg class="icon" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    look: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4"/><circle cx="12" cy="12" r="3.5"/></svg>',
    teach: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/></svg>',
    add: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/></svg>',
    torch: '<svg class="icon" viewBox="0 0 24 24"><path d="M9 3h6l1 5-2 2v11H10V10L8 8z"/><path d="M8 8h8"/></svg>',
    play: '<svg class="icon icon--fill" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    replay: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/></svg>',
    check: '<svg class="icon" viewBox="0 0 24 24"><path d="M5 12l5 5L19 7"/></svg>',
    ear: '<svg class="icon" viewBox="0 0 24 24"><path d="M6 10a6 6 0 0 1 12 0c0 3-2 4-3 6s-1 5-4 5c-2 0-2.5-1.5-2.5-2.5"/><path d="M9.5 10a2.5 2.5 0 0 1 5 0c0 1.5-1 2-1.5 3"/></svg>',
    ask: '<svg class="icon" viewBox="0 0 24 24"><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><circle cx="12" cy="17" r=".6" fill="currentColor"/><circle cx="12" cy="12" r="9.5"/></svg>',
    warning: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>',
    share: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v8h14v-8"/></svg>',
    more: '<svg class="icon" viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/></svg>',
    edit: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16z"/><path d="M13 7l4 4"/></svg>',
    bell: '<svg class="icon" viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>',
    lock: '<svg class="icon" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    home: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v10H3z"/><path d="M10 21v-6h4v6"/></svg>',
    wifiOff: '<svg class="icon" viewBox="0 0 24 24"><path d="M2 8a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/><path d="M3 3l18 18"/></svg>',
    download: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 20h14"/></svg>',
    phone: '<svg class="icon" viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    message: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    calendar: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    qr: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM19 14h2M14 19h2M19 19h2v2"/></svg>',
    hand: '<svg class="icon" viewBox="0 0 24 24"><path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V3.5a1.5 1.5 0 0 1 3 0V11M14 11V5a1.5 1.5 0 0 1 3 0v8M17 13v-2a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.5L3.5 15A1.6 1.6 0 0 1 6 13l2 2.5"/></svg>',
    photos: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/></svg>',
    spark: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
  };

  // ---------- Components ----------
  function tabbar(active) {
    const n = el(`<nav class="tabbar" aria-label="Main">
      <button class="tab ${active === 'memory' ? 'is-active' : ''}" data-tab="memory">${icons.loop}<span>${t('nav.memory')}</span></button>
      <button class="center-action" data-center aria-label="Look, Teach or Add"><span class="close-glyph">${icons.close}</span></button>
      <button class="tab ${active === 'you' ? 'is-active' : ''}" data-tab="you">${icons.person}<span>${t('nav.you')}</span></button>
    </nav>`);
    n.addEventListener('click', e => {
      const tab = e.target.closest('[data-tab]');
      if (tab) { if (tab.dataset.tab !== active) { haptic('selection'); go(tab.dataset.tab, {}, { transition: 'fade', reset: true, replace: true }); } return; }
      if (e.target.closest('[data-center]')) openBloom(n);
    });
    return n;
  }

  function openBloom(bar) {
    const host = top().el;
    const center = bar.querySelector('[data-center]');
    haptic('light');
    center.classList.add('is-open');
    const bloom = el(`<div class="bloom">
      <div class="bloom__scrim"></div>
      <button class="bloom__item" data-i="0" data-action="look"><span class="bloom__circle">${icons.look}</span><span class="bloom__label">${t('center.look')}</span><span class="bloom__sub">${t('center.look.sub')}</span></button>
      <button class="bloom__item" data-i="1" data-action="teach"><span class="bloom__circle bloom__circle--teach">${icons.teach}</span><span class="bloom__label">${t('center.teach')}</span><span class="bloom__sub">${t('center.teach.sub')}</span></button>
      <button class="bloom__item" data-i="2" data-action="add"><span class="bloom__circle">${icons.add}</span><span class="bloom__label">${t('center.add')}</span><span class="bloom__sub">${t('center.add.sub')}</span></button>
    </div>`);
    host.insertBefore(bloom, bar);
    requestAnimationFrame(() => bloom.classList.add('is-open'));
    const close = async () => { bloom.classList.remove('is-open'); center.classList.remove('is-open'); await wait(dur('standard')); bloom.remove(); };
    bloom.querySelector('.bloom__scrim').addEventListener('click', close);
    center.onclick = e => { if (center.classList.contains('is-open')) { e.stopImmediatePropagation(); close(); } };
    bloom.addEventListener('click', async e => {
      const item = e.target.closest('[data-action]');
      if (!item) return;
      haptic('selection');
      const circle = item.querySelector('.bloom__circle');
      circle.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 120 });
      const action = item.dataset.action;
      bloom.querySelectorAll('.bloom__item').forEach(b => { if (b !== item) b.style.opacity = 0; });
      await go(action === 'look' ? 'look' : action === 'teach' ? 'teach' : 'addObject', {}, { transition: 'morph', from: circle });
      close();
    });
  }

  function topbar({ title = '', left = 'back', right = '', media = false, onLeft } = {}) {
    const leftBtn = left === 'back' ? `<button class="btn btn--icon ${media ? 'btn--onmedia' : 'btn--glass'}" data-back aria-label="${t('common.back')}">${icons.back}</button>`
      : left === 'close' ? `<button class="btn btn--icon ${media ? 'btn--onmedia' : 'btn--glass'}" data-back aria-label="${t('common.close')}">${icons.close}</button>` : '<span></span>';
    const n = el(`<div class="topbar ${media ? 'topbar--media' : ''}">${leftBtn}<span class="topbar__title">${title}</span><span>${right || ''}</span></div>`);
    n.addEventListener('click', e => { if (e.target.closest('[data-back]')) { haptic('light'); onLeft ? onLeft() : back({ transition: media ? 'fade' : undefined }); } });
    return n;
  }

  function objectCard(o, { size = 'object' } = {}) {
    const memories = window.DATA.memoriesFor(o.id);
    const n = el(`<button class="card card--${size}" data-object="${o.id}">
      <img class="card__img" src="${o.photo}" style="object-position:${o.focus}" alt="">
      <div class="card__scrim"></div>
      <div class="card__body"><div class="card__title">${o.name}</div><div class="card__sub">${t('object.procedures', { n: memories.length })}${o.lastUsed ? ` · ${t('object.lastUsed', { when: o.lastUsed }).replace('Last used ', '')}` : ''}</div></div>
    </button>`);
    n.addEventListener('click', () => { haptic('light'); go('object', { id: o.id }, { transition: 'morph', from: n }); });
    return n;
  }

  function memoryRow(m, { showObject = false } = {}) {
    const o = window.DATA.objects[m.object];
    const person = window.DATA.people[m.taughtBy];
    const risk = m.risk === 'high' ? `<span class="chip chip--danger" style="height:24px;font-size:12px;padding:0 8px">${icons.warning.replace('class="icon"', 'class="icon icon--sm"')} Care</span>` : '';
    const n = el(`<button class="row" data-memory="${m.id}">
      <img class="row__thumb" src="${(m.steps?.[0]?.photo) || o.photo}" style="object-position:${o.focus}" alt="">
      <div class="row__body"><div class="row__title">${m.title}</div><div class="row__sub">${showObject ? o.name + ' · ' : ''}${t('people.taughtBy', { person: person.name })} · ${m.shortDate}</div></div>
      <div class="row__trail">${risk}${icons.chevron}</div>
    </button>`);
    n.addEventListener('click', () => { haptic('light'); go('procedure', { id: m.id }); });
    return n;
  }

  // ---------- Reviewer controls ----------
  const jumpTargets = [
    ['launch', 'Launch (logo)'], ['onboarding', 'Onboarding'], ['auth', 'Authentication'], ['firstrun', 'First-use introduction'],
    ['memory', 'Memory home'], ['memory-empty', 'Memory home — empty'], ['memory-offline', 'Memory home — offline'], ['search', 'Search'], ['results', 'Search results'],
    ['look', 'Look camera'], ['look-recognised', 'Recognition acquired'], ['look-uncertain', 'Recognition uncertain'], ['look-unknown', 'Unknown object'], ['look-error', 'Recognition error'],
    ['teach', 'Teach pre-recording'], ['teach-recording', 'Teach recording'], ['processing', 'Processing'], ['review', 'Generated procedure'], ['review-edit', 'Edit procedure'], ['objectCreate', 'Object creation'], ['save', 'Save memory'],
    ['object', 'Object detail'], ['procedure', 'Procedure detail'], ['do', 'Do mode'], ['do-handsfree', 'Hands-free Do'], ['ask', 'Ask memory'], ['complete', 'Procedure completed'],
    ['spaces', 'Spaces'], ['space', 'Space detail'], ['people', 'People'], ['people-empty', 'People — empty'], ['person', 'Person detail'], ['household', 'Household'], ['share', 'Share memory'], ['qr', 'QR import'], ['notifications', 'Notifications'],
    ['you', 'You (profile)'], ['settings', 'Settings'], ['privacy', 'Privacy'], ['haptics', 'Haptics settings'], ['subscription', 'Subscription'], ['paywall', 'Paywall'],
    ['offline', 'Offline'], ['error-upload', 'Error — upload'], ['error-generic', 'Error — generic'], ['permission-camera', 'Permission — camera'], ['permission-mic', 'Permission — microphone'], ['permission-notifications', 'Permission — notifications'],
  ];
  const jumpParams = {
    'memory-empty': ['memory', { empty: true }], 'memory-offline': ['memory', { offline: true }],
    'look-recognised': ['look', { state: 'recognised' }], 'look-uncertain': ['look', { state: 'uncertain' }], 'look-unknown': ['look', { state: 'unknown' }], 'look-error': ['look', { state: 'error' }],
    'teach-recording': ['teach', { state: 'recording' }], 'review-edit': ['review', { edit: true }], 'do-handsfree': ['do', { handsFree: true }],
    'people-empty': ['people', { empty: true }], 'error-upload': ['error', { kind: 'upload' }], 'error-generic': ['error', { kind: 'generic' }],
    'permission-camera': ['permission', { kind: 'camera' }], 'permission-mic': ['permission', { kind: 'mic' }], 'permission-notifications': ['permission', { kind: 'notifications' }],
    'object': ['object', { id: 'boiler' }], 'procedure': ['procedure', { id: 'repressurise' }], 'do': ['do', { id: 'repressurise', step: 2 }], 'ask': ['do', { id: 'repressurise', step: 2, ask: true }],
    'space': ['space', { id: 'utility' }], 'person': ['person', { id: 'dad' }], 'share': ['share', { id: 'boiler' }], 'results': ['search', { query: 'thing dad showed me for boiler' }],
  };
  function updateJump() { const sel = q('[data-jump]'); const name = top()?.name; if (name && [...sel.options].some(o => o.value === name)) sel.value = name; }
  async function jump(id, opts = {}) {
    const [name, params] = jumpParams[id] || [id, {}];
    state.stack.forEach(s => s.el.remove()); state.stack = [];
    q('.launch')?.remove();
    await go(name, { ...params, ...opts }, { transition: 'none' });
  }

  function setupReviewer() {
    const sel = q('[data-jump]');
    sel.innerHTML = jumpTargets.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    sel.addEventListener('change', () => jump(sel.value));
    q('[data-theme-toggle]').addEventListener('click', () => { state.theme = state.theme === 'auto' ? 'dark' : state.theme === 'dark' ? 'light' : 'auto'; applyTheme(); });
    q('[data-motion-toggle]').addEventListener('click', () => { state.reduceMotion = !state.reduceMotion; applyTheme(); });
    q('[data-voice-sim]').addEventListener('click', e => { const b = e.target.closest('[data-say]'); if (b) document.dispatchEvent(new CustomEvent('voice', { detail: b.dataset.say })); });
  }

  async function start() {
    setupReviewer();
    const params = new URLSearchParams(location.hash.slice(1));
    if (params.get('theme')) state.theme = params.get('theme');
    if (params.get('motion') === 'reduced') state.reduceMotion = true;
    applyTheme();
    const screen = params.get('screen');
    if (screen && screen !== 'launch') { await jump(screen); return; }
    await go('launch', { full: params.get('launch') !== 'short' }, { transition: 'none' });
  }

  return { state, t, q, el, go, back, haptic, wait, dur, toast, openSheet, setIsland, icons, tabbar, topbar, objectCard, memoryRow, register, start, jump, applyTheme, phone, root, top };
})();
