// Memory home, search, object passport, procedure detail, spaces, people.
(() => {
  const { register, go, back, el, t, haptic, wait, icons, state, tabbar, topbar, objectCard, memoryRow, openSheet } = DO;

  // ---- Memory home ----
  register('memory', ({ empty = false, offline = false } = {}) => {
    const objs = Object.values(DATA.objects);
    const count = empty ? 0 : objs.length + 18;
    const cont = DATA.memories.find(m => m.inProgress);
    const n = el(`<div>
      <div class="screen__scroll safe-top safe-bottom">
        <div class="gutter">
          ${offline ? `<div class="banner" style="margin-bottom:16px">${icons.wifiOff}<div><b>${t('offline.title')}</b><span>${t('offline.sub')}</span></div></div>` : ''}
          <h1 class="t-largeTitle" style="font-size:34px;line-height:38px;font-weight:700;letter-spacing:-0.024em">${t('memory.greeting')}</h1>
          <p class="muted" style="font-size:17px;margin-top:6px">${t('memory.count', { n: count })}${count ? ` · ${t('memory.spacesCount', { n: Object.keys(DATA.spaces).length })} · ${t('memory.memoriesCount', { n: DATA.memories.length + 74 })}` : ''}</p>
          <button class="search" style="margin-top:20px;width:100%" data-search>
            <span class="search__label">${t('memory.search.placeholder')}</span>
            <span class="search__actions"><span class="btn btn--icon">${icons.mic}</span><span class="btn btn--icon" data-search-camera>${icons.camera}</span></span>
          </button>
        </div>
        ${empty ? `<div class="empty" style="margin-top:80px"><div class="empty__mark">${icons.loop}</div><div class="empty__title">${t('memory.empty.title')}</div><div class="empty__sub">${t('memory.empty.sub')}</div><button class="btn btn--signal" style="margin-top:16px" data-teach>${t('memory.empty.cta')}</button></div>` : `
        ${cont ? `<div class="gutter section" style="margin-top:28px"><div class="section__head"><h2 class="section__title">${t('memory.continue')}</h2></div>
          <button class="card card--continue" data-continue>
            <img class="card__img" src="${DATA.objects[cont.object].photo}" style="object-position:${DATA.objects[cont.object].focus}" alt="">
            <div class="card__scrim"></div>
            <div class="card__body"><div class="card__title">${cont.title}</div><div class="card__sub">${t('memory.continue.progress', { done: cont.inProgress.done, total: cont.inProgress.total })}</div>
              <div class="progress"><i style="width:${cont.inProgress.done / cont.inProgress.total * 100}%"></i></div></div>
          </button></div>` : ''}
        <div class="gutter section"><div class="section__head"><h2 class="section__title">${t('memory.recent')}</h2></div>
          <div class="hscroll" data-objects></div></div>
        <div class="gutter section"><div class="section__head"><h2 class="section__title">${t('memory.spaces')}</h2><button class="section__link" data-spaces>See all</button></div>
          <div class="hscroll" data-spaces-row>${Object.values(DATA.spaces).map(s => `<button class="chip chip--photo" data-space="${s.id}"><img src="${s.photo}" alt="">${s.name}</button>`).join('')}</div></div>
        <div class="gutter section"><div class="section__head"><h2 class="section__title">${t('memory.people')}</h2><button class="section__link" data-people>See all</button></div>
          <div class="hscroll">${Object.values(DATA.people).filter(p => p.id !== 'me').map(p => `<button class="chip chip--photo" data-person="${p.id}" style="padding-left:4px"><span class="avatar" style="width:32px;height:32px;font-size:13px">${p.initials}</span>${p.name}<span class="faint" style="font-weight:400">· ${DATA.memories.filter(m => m.taughtBy === p.id).length}</span></button>`).join('')}</div></div>
        <div class="gutter section"><div class="section__head"><h2 class="section__title">${t('memory.timeline')}</h2></div>
          ${DATA.timeline.map(g => `<div style="margin-top:14px"><div class="eyebrow" style="margin-bottom:2px">${g.label}</div><div data-timeline="${g.label}"></div></div>`).join('')}</div>`}
      </div>
    </div>`);
    if (!empty) {
      const row = n.querySelector('[data-objects]');
      objs.slice(0, 5).forEach(o => row.appendChild(objectCard(o)));
      DATA.timeline.forEach(g => { const host = n.querySelector(`[data-timeline="${g.label}"]`); g.items.forEach(id => host.appendChild(memoryRow(DATA.byId(id), { showObject: true }))); });
      n.querySelector('[data-continue]').addEventListener('click', () => { haptic('light'); go('do', { id: 'repressurise', step: 2, title: cont.title }); });
    }
    n.querySelector('[data-search]').addEventListener('click', e => { if (e.target.closest('[data-search-camera]')) { haptic('light'); go('look', {}, { transition: 'zoom' }); return; } haptic('light'); go('search', {}, { transition: 'fade' }); });
    n.querySelector('[data-teach]')?.addEventListener('click', () => { haptic('light'); go('teach', {}, { transition: 'zoom' }); });
    n.querySelector('[data-spaces]')?.addEventListener('click', () => { haptic('light'); go('spaces'); });
    n.querySelector('[data-people]')?.addEventListener('click', () => { haptic('light'); go('people'); });
    n.addEventListener('click', e => {
      const s = e.target.closest('[data-space]'); if (s) { haptic('light'); go('space', { id: s.dataset.space }); }
      const p = e.target.closest('[data-person]'); if (p) { haptic('light'); go('person', { id: p.dataset.person }); }
    });
    n.appendChild(tabbar('memory'));
    return n;
  });

  // ---- Search & results ----
  register('search', ({ query = '' } = {}) => {
    const n = el(`<div>
      <div class="screen__scroll safe-top">
        <div class="gutter" style="display:flex;gap:10px;align-items:center;padding-top:4px">
          <div class="search search--active" style="flex:1"><span class="search__label" data-q>${query || ''}</span>${query ? '' : '<span class="search__caret"></span>'}<span class="search__actions"><span class="btn btn--icon">${icons.mic}</span><span class="btn btn--icon" data-cam>${icons.camera}</span></span></div>
          <button class="btn btn--ghost" data-back style="padding:0 6px">${t('common.cancel')}</button>
        </div>
        <div class="gutter" data-results style="margin-top:24px"></div>
      </div></div>`);
    const results = n.querySelector('[data-results]');
    const render = qtext => {
      results.innerHTML = '';
      if (!qtext) {
        results.innerHTML = `<div class="eyebrow" style="margin-bottom:10px">Try</div>`;
        ['thing dad showed me for boiler', 'how do I reset the router', 'what pressure did the plumber say', 'things in the garage'].forEach(s => {
          const c = el(`<button class="row" style="min-height:48px"><span style="color:var(--text-tertiary)">${icons.spark.replace('class="icon"', 'class="icon icon--sm"')}</span><div class="row__body"><div class="row__title" style="font-weight:500">${s}</div></div></button>`);
          c.addEventListener('click', () => { haptic('selection'); typeIn(s); });
          results.appendChild(c);
        });
        return;
      }
      const ql = qtext.toLowerCase();
      // Best answer first, then grouped results (mirrors DoOnceCore.SearchIndex behaviour).
      if (ql.includes('pressure') || ql.includes('plumber')) {
        const m = DATA.byId('repressurise'), st = m.steps[2];
        results.appendChild(el(`<div class="eyebrow" style="margin-bottom:10px">Best answer</div>
          <button class="card" data-best style="height:auto;text-align:left;background:var(--background-elevated);box-shadow:var(--elev-raised)">
            <div style="padding:16px"><div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;line-height:25px">“Stop when it reaches <span class="signal-text">1.5 bar</span>.”</div>
            <div class="muted" style="margin-top:8px;font-size:15px">${DATA.people.julien.name} · ${m.title} · step 3</div>
            <div class="ask__src">${icons.play.replace('class="icon icon--fill"', 'class="icon icon--fill icon--sm"')} ${t('ask.source', { time: '0:27' })}</div></div></button>`));
        results.querySelector('[data-best]').addEventListener('click', () => { haptic('light'); go('do', { id: 'repressurise', step: 3 }); });
      }
      const qtok = ql.split(/\W+/).filter(w => w.length > 2 && !['the','for','how','did','say','thing','things','showed','what','from','last','with'].includes(w));
      const score = m => { const o = DATA.objects[m.object], p = DATA.people[m.taughtBy]; const hay = [m.title, o.name, o.model, o.category, p.name, p.relationship, DATA.spaces[o.space].name].join(' ').toLowerCase(); return qtok.reduce((a, w) => a + (hay.includes(w) ? 1 : 0), 0); };
      const matches = DATA.memories.map(m => [m, score(m)]).filter(([, sc]) => sc > 0).sort((a, b) => b[1] - a[1]).map(([m]) => m);
      if (matches.length) { results.appendChild(el(`<div class="eyebrow" style="margin:22px 0 4px">Memories</div>`)); matches.forEach(m => results.appendChild(memoryRow(m, { showObject: true }))); }
      const objs = Object.values(DATA.objects).filter(o => ql.includes(o.name.toLowerCase().split(' ')[0]) || ql.includes(DATA.spaces[o.space].name.toLowerCase()));
      if (objs.length) { results.appendChild(el(`<div class="eyebrow" style="margin:22px 0 10px">Objects</div>`)); const row = el('<div class="hscroll"></div>'); objs.forEach(o => row.appendChild(objectCard(o))); results.appendChild(row); }
      if (!matches.length && !objs.length) results.appendChild(el(`<div class="empty"><div class="empty__title">Nothing for that yet.</div><div class="empty__sub">Try the object's name, or who showed you.</div></div>`));
    };
    const typeIn = async s => { const q = n.querySelector('[data-q]'); q.textContent = ''; for (const ch of s) { q.textContent += ch; await wait(18); } render(s); };
    render(query);
    n.querySelector('[data-back]').addEventListener('click', () => back({ transition: 'fade' }));
    n.querySelector('[data-cam]').addEventListener('click', () => { haptic('light'); go('look', {}, { transition: 'zoom' }); });
    return n;
  });

  // ---- Object passport ----
  register('object', ({ id = 'boiler', fresh = false }) => {
    const o = DATA.objects[id];
    const mems = DATA.memoriesFor(id);
    const prov = o.serviceProvider ? DATA.people[o.serviceProvider] : null;
    const n = el(`<div>
      <div class="screen__scroll" style="padding-bottom:60px">
        <div class="hero" style="height:440px"><img src="${o.photo}" style="object-position:${o.focus}" alt=""><div class="hero__scrim"></div>
          <div class="hero__body" data-morph-content><h1 class="hero__title">${o.name}</h1><p class="hero__sub">${o.model || ''}${o.space ? ` · ${DATA.spaces[o.space].name}` : ''}</p></div></div>
        <div data-morph-content>
        <div class="gutter" style="margin-top:8px">
          ${fresh ? `<div class="callout callout--signal" style="margin-bottom:14px">${icons.check}<div><b>${t('save.remembered')}</b> ${t('save.next', { object: o.name.toLowerCase() })}</div></div>` : ''}
          <div class="section__head" style="margin-top:8px"><h2 class="section__title">${t('object.procedures', { n: mems.length })}</h2><button class="btn btn--small btn--secondary" data-teach-more>${icons.teach.replace('class="icon"', 'class="icon icon--sm"')} Teach</button></div>
          <div data-memories></div>
          ${o.lastConfirmed ? `<div class="callout callout--neutral" style="margin-top:16px">${icons.calendar}<div>${t('object.lastConfirmed', { date: o.lastConfirmed })}<br><span style="opacity:.8">${t('object.checkAccuracy')}</span></div></div>` : ''}
        </div>
        ${prov ? `<div class="gutter section"><div class="list" style="padding:16px"><div style="font-size:17px;font-weight:600;margin-bottom:12px">${t('object.needAgain', { person: prov.name })}</div>
          <div style="display:flex;gap:8px"><button class="btn btn--secondary btn--small" style="flex:1">${icons.phone.replace('class="icon"', 'class="icon icon--sm"')} ${t('object.call')}</button><button class="btn btn--secondary btn--small" style="flex:1">${icons.message.replace('class="icon"', 'class="icon icon--sm"')} ${t('object.message')}</button><button class="btn btn--secondary btn--small" style="flex:1">${icons.calendar.replace('class="icon"', 'class="icon icon--sm"')} ${t('object.book')}</button></div></div></div>` : ''}
        <div class="gutter section"><div class="section__head"><h2 class="section__title">${t('object.about')}</h2></div>
          <div class="list">
            ${[[t('object.installed'), o.installed || '—'], ['Model', o.model || '—'], [t('object.serviceProvider'), prov ? prov.fullName : '—'], [t('object.lastService'), o.lastService || '—'], [t('object.manual'), 'Add'], [t('object.warranty'), 'Add']].map(([k, v]) => `<div class="row"><div class="row__body"><div class="row__title">${k}</div></div><div class="row__trail"><span class="muted" style="font-size:16px">${v}</span></div></div>`).join('')}
          </div></div>
        <div class="gutter section" style="margin-top:20px"><button class="btn btn--secondary btn--block">${icons.download}${t('object.offline')}</button>
          <button class="btn btn--ghost btn--block" data-share style="margin-top:4px">${icons.share}${t('share.title', { thing: o.name })}</button></div>
        </div>
      </div>
    </div>`);
    const host = n.querySelector('[data-memories]');
    mems.forEach(m => host.appendChild(memoryRow(m)));
    n.querySelector('[data-share]').addEventListener('click', () => { haptic('light'); go('share', { id }, { transition: 'sheet' }); });
    n.querySelector('[data-teach-more]').addEventListener('click', () => { haptic('light'); go('teach', { object: id }, { transition: 'zoom' }); });
    n.appendChild(topbar({ media: true, right: `<button class="btn btn--icon btn--onmedia">${icons.more}</button>` }));
    return n;
  });

  // ---- Procedure detail ----
  register('procedure', ({ id = 'repressurise' }) => {
    const m = DATA.byId(id); const o = DATA.objects[m.object]; const p = DATA.people[m.taughtBy];
    const steps = m.steps || Array.from({ length: m.stepsCount || 3 }, (_, i) => ({ n: i + 1, instruction: ['Open the panel.', 'Find the control.', 'Do the thing carefully.', 'Check the result.', 'Close up.', 'Test it.', 'Done.'][i], detail: '', from: i * 8, to: i * 8 + 7, quote: '', provenance: 'observed', photo: o.photo, focus: o.focus }));
    const n = el(`<div>
      <div class="screen__scroll" style="padding-bottom:120px">
        <div class="hero"><img src="${steps[0].photo}" style="object-position:${steps[0].focus}" alt=""><div class="hero__scrim"></div>
          <div class="hero__body"><h1 class="hero__title">${m.title}</h1><p class="hero__sub">${o.name}${o.model ? ` · ${o.model}` : ''}</p></div></div>
        <div class="gutter" style="display:flex;align-items:center;gap:12px;margin-top:6px">
          <span class="avatar" style="width:36px;height:36px;font-size:14px">${p.initials}</span>
          <div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:600">${t('people.taughtBy', { person: p.name })}</div><div class="muted" style="font-size:14px">${m.date} · ${m.duration} · ${steps.length} steps</div></div></div>
        ${m.risk === 'high' ? `<div class="gutter" style="margin-top:14px"><div class="callout callout--danger">${icons.warning}<div><b>Take care.</b> This involves gas or mains. If unsure, call a qualified professional.</div></div></div>` : ''}
        ${m.summary ? `<p class="gutter" style="margin-top:14px;font-size:17px;line-height:24px">${m.summary}</p>` : ''}
        <div class="gutter" style="margin-top:8px">${steps.map(s => `<div class="step">
            <div class="step__media"><img src="${s.photo}" style="object-position:${s.focus}" alt=""><span class="step__n">${s.n}</span><button class="btn btn--small btn--onmedia step__clip" data-see="${s.from}">${icons.play.replace('class="icon icon--fill"', 'class="icon icon--fill icon--sm"')} ${t('review.seeOriginal')}</button></div>
            <div class="step__instruction">${s.instruction}</div>
            ${s.quote ? `<p class="step__quote">${s.quote}</p>` : ''}
            ${s.warning ? `<div class="callout">${icons.warning}<div>${s.warning}</div></div>` : ''}
            ${s.provenance === 'unclear' ? `<div class="callout callout--neutral">${icons.ask}<div>${t('review.unclear')}${s.unclear ? ' ' + s.unclear : ''}</div></div>` : ''}
          </div>`).join('')}
          <div class="faint" style="font-size:13px;margin-top:8px">Version ${m.version || 1} · ${t('object.lastConfirmed', { date: m.lastConfirmed || m.date })}</div>
        </div>
      </div>
      <div class="floating-cta"><button class="btn btn--primary btn--block" data-start>${icons.play}${t('look.start')}</button><button class="btn btn--glass btn--icon" style="width:52px;min-height:52px" data-share>${icons.share}</button></div>
    </div>`);
    n.querySelector('[data-start]').addEventListener('click', () => { haptic('medium'); go('do', { id, step: 1 }, { transition: 'zoom' }); });
    n.querySelector('[data-share]').addEventListener('click', () => { haptic('light'); go('share', { id: m.object, memory: id }, { transition: 'sheet' }); });
    n.addEventListener('click', e => { const s = e.target.closest('[data-see]'); if (s) { haptic('light'); DO.showOriginal(m, +s.dataset.see); } });
    n.appendChild(topbar({ media: true, right: `<button class="btn btn--icon btn--onmedia" data-edit>${icons.edit}</button>` }));
    n.querySelector('[data-edit]').addEventListener('click', () => { haptic('light'); go('review', { edit: true, existing: id }); });
    return n;
  });

  // "See original": the source video at that exact moment.
  DO.showOriginal = (m, at) => {
    const seg = (m.transcript || []).filter(s => s.t <= at + 2).pop();
    const mm = Math.floor(at / 60), ss = String(at % 60).padStart(2, '0');
    openSheet(`<div style="position:relative;height:220px;border-radius:var(--radius-medium);overflow:hidden;background:#000">
        <img src="${m.steps?.[0]?.photo || DATA.objects[m.object].photo}" style="width:100%;height:100%;object-fit:cover;opacity:.85" alt="">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span class="btn btn--icon btn--onmedia" style="width:64px;min-height:64px">${icons.play}</span></div>
        <div style="position:absolute;left:12px;bottom:12px;right:12px;display:flex;align-items:center;gap:8px;color:var(--text-on-media);font-size:13px;font-weight:600"><span class="tnum">${mm}:${ss}</span><div style="flex:1;height:2px;background:rgba(242,242,238,.3);border-radius:1px"><div style="width:${Math.min(100, at / 50 * 100)}%;height:100%;background:var(--signal)"></div></div><span class="tnum">0:50</span></div></div>
      <p style="margin-top:16px;font-size:17px;line-height:24px">${seg ? '“' + seg.text + '”' : ''}</p>
      <p class="muted" style="margin-top:6px;font-size:14px">${t('ask.source', { time: `${mm}:${ss}` })} · ${DATA.people[m.taughtBy].name}</p>`, { media: true });
  };

  // ---- Spaces ----
  register('spaces', () => {
    const n = el(`<div><div class="screen__scroll safe-top safe-bottom"><div class="gutter">
      <h1 class="hero__title" style="margin-top:8px">${t('spaces.title')}</h1>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px" data-grid></div>
      <button class="btn btn--secondary btn--block" style="margin-top:16px">${icons.add} New space</button>
    </div></div></div>`);
    const grid = n.querySelector('[data-grid]');
    Object.values(DATA.spaces).forEach(s => {
      const count = Object.values(DATA.objects).filter(o => o.space === s.id).length;
      const c = el(`<button class="card card--space" style="height:170px"><img class="card__img" src="${s.photo}" alt=""><div class="card__scrim"></div><div class="card__body" style="padding:14px"><div class="card__title" style="font-size:19px">${s.name}</div><div class="card__sub">${t('space.objects', { n: count })}</div></div></button>`);
      c.addEventListener('click', () => { haptic('light'); go('space', { id: s.id }, { transition: 'morph', from: c }); });
      grid.appendChild(c);
    });
    n.appendChild(topbar({ title: '' }));
    return n;
  });
  register('space', ({ id = 'utility' }) => {
    const s = DATA.spaces[id]; const objs = Object.values(DATA.objects).filter(o => o.space === id);
    const n = el(`<div><div class="screen__scroll" style="padding-bottom:60px">
      <div class="hero" style="height:360px"><img src="${s.photo}" alt=""><div class="hero__scrim"></div><div class="hero__body" data-morph-content><h1 class="hero__title">${s.name}</h1><p class="hero__sub">${t('space.objects', { n: objs.length })} · ${t('memory.memoriesCount', { n: objs.reduce((a, o) => a + DATA.memoriesFor(o.id).length, 0) })}</p></div></div>
      <div class="gutter" data-morph-content><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px" data-grid></div></div></div></div>`);
    const grid = n.querySelector('[data-grid]');
    objs.forEach(o => { const c = objectCard(o); c.style.width = '100%'; c.style.height = '220px'; grid.appendChild(c); });
    n.appendChild(topbar({ media: true }));
    return n;
  });

  // ---- People ----
  register('people', ({ empty = false } = {}) => {
    const n = el(`<div><div class="screen__scroll safe-top safe-bottom"><div class="gutter">
      <h1 class="hero__title" style="margin-top:8px">${t('memory.people')}</h1>
      ${empty ? `<div class="empty" style="margin-top:80px"><div class="empty__mark">${icons.person}</div><div class="empty__sub">${t('people.empty')}</div></div>` : `<div class="list" style="margin-top:20px" data-list></div>`}
    </div></div></div>`);
    if (!empty) Object.values(DATA.people).forEach(p => {
      const count = DATA.memories.filter(m => m.taughtBy === p.id).length;
      const r = el(`<button class="row"><span class="avatar">${p.initials}</span><div class="row__body"><div class="row__title">${p.name}</div><div class="row__sub">${p.relationship} · ${t('object.procedures', { n: count })}</div></div><span class="row__trail">${icons.chevron}</span></button>`);
      r.addEventListener('click', () => { haptic('light'); go('person', { id: p.id }); });
      n.querySelector('[data-list]').appendChild(r);
    });
    n.appendChild(topbar());
    return n;
  });
  register('person', ({ id = 'dad' }) => {
    const p = DATA.people[id]; const mems = DATA.memories.filter(m => m.taughtBy === id);
    const n = el(`<div><div class="screen__scroll safe-top" style="padding-bottom:60px"><div class="gutter">
      <div style="display:flex;align-items:center;gap:16px;margin-top:20px"><span class="avatar avatar--lg">${p.initials}</span><div><h1 class="hero__title" style="font-size:30px;line-height:34px">${p.name}</h1><p class="muted" style="font-size:16px">${p.fullName ? p.fullName + ' · ' : ''}${p.relationship} · ${t('object.procedures', { n: mems.length })}</p></div></div>
      ${p.phone ? `<div style="display:flex;gap:8px;margin-top:18px"><button class="btn btn--secondary btn--small" style="flex:1">${icons.phone.replace('class="icon"', 'class="icon icon--sm"')} ${t('object.call')}</button><button class="btn btn--secondary btn--small" style="flex:1">${icons.message.replace('class="icon"', 'class="icon icon--sm"')} ${t('object.message')}</button></div>` : ''}
      <div class="section"><div class="section__head"><h2 class="section__title">What ${p.name} showed you</h2></div><div data-list></div></div>
    </div></div></div>`);
    mems.forEach(m => n.querySelector('[data-list]').appendChild(memoryRow(m, { showObject: true })));
    n.appendChild(topbar());
    return n;
  });
})();
