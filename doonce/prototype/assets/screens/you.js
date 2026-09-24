// You: profile, settings, privacy, haptics, subscription, paywall; household, share, QR import, notifications; offline, errors, permissions.
(() => {
  const { register, go, back, el, t, haptic, wait, icons, state, tabbar, topbar, openSheet } = DO;
  const sm = s => s.replace('class="icon"', 'class="icon icon--sm"');
  const list = (rows, cls = '') => `<div class="list">${rows.map(r => `<button class="row ${cls}" ${r.attr || ''}><div class="row__body"><div class="row__title">${r.title}</div>${r.sub ? `<div class="row__sub">${r.sub}</div>` : ''}</div><div class="row__trail">${r.trail ?? icons.chevron}</div></button>`).join('')}</div>`;

  register('you', () => {
    const n = el(`<div><div class="screen__scroll safe-top safe-bottom"><div class="gutter">
      <div style="display:flex;align-items:center;gap:16px;margin-top:8px"><span class="avatar avatar--lg">A</span><div><h1 class="hero__title" style="font-size:30px;line-height:34px">Amine</h1><p class="muted">Home · ${t('household.members', { n: 2 })}</p></div></div>
      <div class="section" style="margin-top:24px">${list([{ title: t('household.title'), sub: '2 members · 42 objects · 87 memories', attr: 'data-go="household"' }, { title: 'DoOnce+', sub: 'Free · 5 memories used', trail: `<span class="chip chip--signal" style="height:26px;font-size:13px">Upgrade</span>`, attr: 'data-go="paywall"' }])}</div>
      <div class="section" style="margin-top:16px">${list([{ title: t('settings.notifications'), attr: 'data-go="notifications"' }, { title: t('settings.haptics'), sub: 'Full', attr: 'data-go="haptics"' }, { title: t('settings.privacy'), attr: 'data-go="privacy"' }, { title: t('settings.offline'), sub: '3 objects downloaded' }, { title: 'Settings', attr: 'data-go="settings"' }])}</div>
      <div class="section" style="margin-top:16px">${list([{ title: 'Import from QR', sub: 'Knowledge a professional left for you', attr: 'data-go="qr"' }])}</div>
    </div></div></div>`);
    n.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { haptic('light'); go(g.dataset.go, {}, g.dataset.go === 'paywall' ? { transition: 'sheet' } : {}); } });
    n.appendChild(tabbar('you'));
    return n;
  });

  register('settings', () => {
    const n = el(`<div><div class="screen__scroll safe-top safe-bottom"><div class="gutter">
      <h1 class="hero__title" style="margin-top:8px">Settings</h1>
      <div class="section">${list([{ title: t('settings.haptics'), sub: 'Full', attr: 'data-go="haptics"' }, { title: t('settings.sounds'), trail: '<span class="toggle is-on" data-toggle></span>' }, { title: 'Appearance', sub: 'Automatic' }, { title: 'Recording quality', sub: '1080p · balanced' }, { title: 'Language', sub: 'English' }])}</div>
      <div class="section">${list([{ title: t('settings.privacy'), attr: 'data-go="privacy"' }, { title: t('settings.export') }, { title: t('settings.download') }])}</div>
      <div class="section">${list([{ title: 'Sign out', trail: '' }])}</div>
    </div></div></div>`);
    n.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { haptic('light'); go(g.dataset.go); } const tg = e.target.closest('[data-toggle]'); if (tg) { haptic('selection'); tg.classList.toggle('is-on'); } });
    n.appendChild(topbar()); return n;
  });

  register('privacy', () => {
    const n = el(`<div><div class="screen__scroll safe-top safe-bottom"><div class="gutter">
      <h1 class="hero__title" style="margin-top:8px">${t('settings.privacy')}</h1>
      <p class="muted" style="font-size:17px;margin-top:8px;line-height:24px">DoOnce records your home and the people who help you. Here is exactly what happens with it.</p>
      <div class="section">${list([
        { title: t('settings.privacy.upload'), sub: 'A compressed copy of each recording, for transcription and step detection. Encrypted in transit.' },
        { title: t('settings.privacy.private'), sub: 'The original video stays on this phone until upload is confirmed. Face data is never stored.' },
        { title: t('settings.privacy.who'), sub: 'You, and the household members you invite. Nothing is public.' },
        { title: t('settings.privacy.training'), sub: t('settings.privacy.training.value'), trail: '' },
        { title: t('settings.privacy.delete'), sub: 'Any recording, guide, person or household access. Deletion is immediate.' },
      ])}</div>
      <div class="section">${list([{ title: t('settings.deleteSource'), trail: '' }, { title: t('settings.deleteGuide'), trail: '' }, { title: 'Remove a person', trail: '' }, { title: 'Remove household access', trail: '' }])}</div>
    </div></div></div>`);
    n.appendChild(topbar()); return n;
  });

  register('haptics', () => {
    const n = el(`<div><div class="screen__scroll safe-top safe-bottom"><div class="gutter">
      <h1 class="hero__title" style="margin-top:8px">${t('settings.haptics')}</h1>
      <p class="muted" style="font-size:17px;margin-top:8px;line-height:24px">DoOnce taps back only when something changes: a recognition, a saved memory, a step confirmed.</p>
      <div class="segmented" style="margin-top:24px" data-seg><button class="${state.haptics === 'full' ? 'is-selected' : ''}" data-v="full">${t('settings.haptics.full')}</button><button class="${state.haptics === 'reduced' ? 'is-selected' : ''}" data-v="reduced">${t('settings.haptics.reduced')}</button><button class="${state.haptics === 'off' ? 'is-selected' : ''}" data-v="off">${t('settings.haptics.off')}</button></div>
      <p class="faint" style="font-size:13px;margin-top:12px;line-height:18px">Reduced keeps recognition, save and completion, and removes selection ticks. System accessibility settings always win.</p>
      <div class="section"><div class="eyebrow" style="margin-bottom:8px">Try them</div>${list([['Object recognised', 'medium'], ['Memory saved', 'success'], ['Step confirmed', 'selection'], ['Dangerous step', 'warning']].map(([a, b]) => ({ title: a, sub: b, trail: `<span class="btn btn--small btn--secondary" data-try="${b}">Play</span>` })))}</div>
    </div></div></div>`);
    n.querySelector('[data-seg]').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { state.haptics = b.dataset.v; haptic('selection'); n.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('is-selected', x === b)); } });
    n.addEventListener('click', e => { const b = e.target.closest('[data-try]'); if (b) haptic(b.dataset.try); });
    n.appendChild(topbar()); return n;
  });

  register('subscription', () => {
    const n = el(`<div><div class="screen__scroll safe-top safe-bottom"><div class="gutter">
      <h1 class="hero__title" style="margin-top:8px">DoOnce+</h1>
      <div class="list" style="margin-top:20px;padding:16px"><div style="font-size:17px;font-weight:600">Free plan</div><div class="muted" style="margin-top:4px">5 of 5 memories used</div><div class="progress" style="background:var(--fill-medium)"><i style="width:100%"></i></div></div>
      <button class="btn btn--signal btn--block" style="margin-top:16px" data-up>${t('paywall.headline')}</button>
      <div class="section">${list([{ title: t('paywall.restore'), trail: '' }, { title: 'Manage in App Store' }])}</div>
    </div></div></div>`);
    n.querySelector('[data-up]').addEventListener('click', () => { haptic('light'); go('paywall', {}, { transition: 'sheet' }); });
    n.appendChild(topbar()); return n;
  });

  register('paywall', () => {
    const n = el(`<div><div class="screen__scroll safe-top" style="padding-bottom:40px"><div class="gutter">
      <div class="mark" style="width:48px;height:48px;color:var(--signal-text);margin-top:8px">${icons.loop}</div>
      <h1 class="hero__title" style="margin-top:14px">${t('paywall.headline')}</h1>
      <div style="margin-top:20px">${[['f1', icons.loop], ['f2', icons.look], ['f3', icons.home], ['f4', icons.ear], ['f5', icons.download]].map(([k, ic]) => `<div class="paywall__feature">${ic}${t('paywall.' + k)}</div>`).join('')}</div>
      <div style="margin-top:20px" data-plans>
        <button class="plan is-selected" data-plan style="width:100%;text-align:left"><div><b>Yearly</b><span>${t('paywall.yearly', { price: '€59.99' })} · €5 / month</span></div><span class="badge">Save 30%</span></button>
        <button class="plan" data-plan style="width:100%;text-align:left"><div><b>Monthly</b><span>${t('paywall.monthly', { price: '€7.99' })}</span></div></button>
      </div>
      <button class="btn btn--primary btn--block" style="margin-top:20px" data-trial>${t('paywall.trial')}</button>
      <button class="btn btn--ghost btn--block" data-close>${t('paywall.notNow')}</button>
      <p class="legal">Cancel anytime in Settings. ${t('paywall.restore')}.</p>
    </div></div></div>`);
    n.querySelector('[data-plans]').addEventListener('click', e => { const p = e.target.closest('[data-plan]'); if (p) { haptic('selection'); n.querySelectorAll('[data-plan]').forEach(x => x.classList.toggle('is-selected', x === p)); } });
    n.querySelector('[data-trial]').addEventListener('click', () => { haptic('success'); DO.toast('Welcome to DoOnce+', 1400); setTimeout(() => back({ transition: 'sheet' }), 900); });
    n.querySelector('[data-close]').addEventListener('click', () => { haptic('light'); back({ transition: 'sheet' }); });
    n.appendChild(topbar({ left: 'close', onLeft: () => back({ transition: 'sheet' }) })); return n;
  });

  register('household', () => {
    const n = el(`<div><div class="screen__scroll safe-top safe-bottom"><div class="gutter">
      <h1 class="hero__title" style="margin-top:8px">Home</h1><p class="muted" style="font-size:17px;margin-top:6px">42 objects · 87 memories</p>
      <div class="section"><div class="list">${[['A', 'Amine', 'Owner · you'], ['AL', 'Alex', 'Member · 12 memories added']].map(([i, nm, s]) => `<div class="row"><span class="avatar">${i}</span><div class="row__body"><div class="row__title">${nm}</div><div class="row__sub">${s}</div></div></div>`).join('')}</div>
        <button class="btn btn--secondary btn--block" style="margin-top:12px">${icons.add} Invite someone</button></div>
      <div class="section"><div class="eyebrow" style="margin-bottom:8px">Shared spaces</div><div style="display:flex;gap:8px;flex-wrap:wrap">${Object.values(DATA.spaces).map(s => `<span class="chip chip--photo"><img src="${s.photo}">${s.name}</span>`).join('')}</div></div>
      <div class="section">${list([{ title: 'Leave household', trail: '' }])}</div>
    </div></div></div>`);
    n.appendChild(topbar()); return n;
  });

  register('share', ({ id = 'boiler', memory } = {}) => {
    const o = DATA.objects[id]; const mems = memory ? [DATA.byId(memory)] : DATA.memoriesFor(id);
    const n = el(`<div style="background:var(--background-elevated)"><div class="screen__scroll safe-top" style="padding-top:80px"><div class="gutter">
      <h1 class="hero__title">${t('share.title', { thing: memory ? mems[0].title : o.name })}</h1>
      <p class="muted" style="font-size:17px;margin-top:6px">They'll see ${t('share.preview', { n: mems.length })} without needing an account.</p>
      <div class="card" style="margin-top:20px;height:auto;background:var(--background-sunken)"><div style="display:flex;gap:14px;padding:14px;align-items:center"><img src="${o.photo}" style="width:72px;height:72px;border-radius:14px;object-fit:cover;object-position:${o.focus}"><div><div style="font-size:19px;font-weight:700;letter-spacing:-0.02em">${memory ? mems[0].title : o.name}</div><div class="muted" style="font-size:14px">${o.model} · ${t('share.preview', { n: mems.length })}</div></div></div></div>
      <div class="section" style="margin-top:20px">${list([{ title: 'Anyone with the link', sub: 'Can view. Revoke anytime.', trail: '<span class="toggle is-on"></span>' }, { title: 'Include original recordings', sub: 'Off — steps and frames only', trail: '<span class="toggle"></span>' }])}</div>
      <button class="btn btn--primary btn--block" style="margin-top:20px" data-share>${icons.share}Share link</button>
      <button class="btn btn--secondary btn--block" style="margin-top:8px" data-qr>${icons.qr}Show QR</button>
    </div></div></div>`);
    n.querySelector('[data-share]').addEventListener('click', () => { haptic('success'); DO.toast('Link copied', 1200); });
    n.querySelector('[data-qr]').addEventListener('click', () => { haptic('light'); go('qr', { from: id }, { transition: 'fade', replace: true }); });
    n.appendChild(topbar({ left: 'close', onLeft: () => back({ transition: 'sheet' }) })); return n;
  });

  register('qr', ({ from } = {}) => {
    const o = DATA.objects.boiler;
    const qr = `<svg viewBox="0 0 21 21" shape-rendering="crispEdges"><rect width="21" height="21" fill="none"/>${Array.from({ length: 21 }, (_, y) => Array.from({ length: 21 }, (_, x) => ((x * 7 + y * 13 + (x * y) % 5) % 3 === 0 || (x < 7 && y < 7 && (x === 0 || y === 0 || x === 6 || y === 6 || (x > 1 && x < 5 && y > 1 && y < 5))) || (x > 13 && y < 7 && (x === 14 || y === 0 || x === 20 || y === 6 || (x > 15 && x < 19 && y > 1 && y < 5))) || (x < 7 && y > 13 && (x === 0 || y === 14 || x === 6 || y === 20 || (x > 1 && x < 5 && y > 15 && y < 19)))) ? `<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor"/>` : '').join('')).join('')}</svg>`;
    const n = el(`<div><div class="screen__scroll safe-top safe-bottom"><div class="gutter" style="text-align:center">
      ${from ? `<h1 class="hero__title" style="margin-top:8px">${t('share.import.title')}</h1><p class="muted" style="font-size:17px;margin-top:6px">${o.name} · ${t('share.preview', { n: 3 })}</p><div class="qr" style="color:var(--text-primary)">${qr}</div><p class="faint" style="font-size:14px">The customer scans this. The object and ${DATA.people.julien.fullName}'s contact arrive together.</p>`
      : `<h1 class="hero__title" style="margin-top:8px">Import from QR</h1><p class="muted" style="font-size:17px;margin-top:6px">Point at the code a professional left you.</p>
        <div style="position:relative;height:340px;border-radius:var(--radius-large);overflow:hidden;margin-top:20px;background:#0A0B0A"><img src="${DATA.photos}hands-tools.jpg" style="width:100%;height:100%;object-fit:cover;opacity:.7"><div class="ob__frame" style="left:22%;top:22%;width:56%;height:56%"><i></i></div></div>
        <div class="list" style="margin-top:16px;text-align:left"><div class="row" style="padding:12px 16px"><img class="row__thumb row__thumb--sm" src="${o.photo}" style="object-position:${o.focus}"><div class="row__body"><div class="row__title">${o.name} · 3 memories</div><div class="row__sub">From ${DATA.people.julien.fullName} · Plumber</div></div><span class="btn btn--small btn--signal" data-import>Import</span></div></div>`}
    </div></div></div>`);
    n.querySelector('[data-import]')?.addEventListener('click', () => { haptic('success'); go('object', { id: 'boiler', fresh: true }, { transition: 'morph', from: n.querySelector('.row__thumb') }); });
    n.appendChild(topbar({ left: from ? 'close' : 'back' })); return n;
  });

  register('notifications', () => {
    const n = el(`<div><div class="screen__scroll safe-top safe-bottom"><div class="gutter">
      <h1 class="hero__title" style="margin-top:8px">${t('settings.notifications')}</h1>
      <p class="muted" style="font-size:17px;margin-top:8px;line-height:24px">Only when it's useful. Never “we miss you”.</p>
      <div class="section">${list(DATA.notifications.map(x => ({ title: x.title, sub: x.sub, trail: `<span class="faint" style="font-size:13px">${x.when}</span>` })), 'row--wrap')}</div>
      <div class="section">${list([{ title: 'Yearly checks people recommended', trail: '<span class="toggle is-on"></span>' }, { title: 'Household additions', trail: '<span class="toggle is-on"></span>' }, { title: 'Maintenance reminders', trail: '<span class="toggle is-on"></span>' }, { title: 'Tips and news', sub: 'Off by default', trail: '<span class="toggle"></span>' }])}</div>
    </div></div></div>`);
    n.addEventListener('click', e => { const tg = e.target.closest('.toggle'); if (tg) { haptic('selection'); tg.classList.toggle('is-on'); } });
    n.appendChild(topbar()); return n;
  });

  register('offline', () => {
    const n = el(`<div><div class="screen__scroll safe-top safe-bottom"><div class="gutter">
      <div class="banner">${icons.wifiOff}<div><b>${t('offline.title')}</b><span>${t('offline.sub')}</span></div></div>
      <h1 class="hero__title" style="margin-top:24px">${t('memory.greeting')}</h1>
      <div class="section"><div class="section__head"><h2 class="section__title">Available offline</h2></div><div data-list></div></div>
      <div class="section"><div class="section__head"><h2 class="section__title">Needs connection</h2></div><div style="opacity:.5">${['Reset router', 'Check tyre pressure'].map(x => `<div class="row"><div class="row__thumb skeleton"></div><div class="row__body"><div class="row__title">${x}</div><div class="row__sub">Frames not downloaded</div></div></div>`).join('')}</div></div>
    </div></div></div>`);
    ['repressurise', 'restart', 'grouphead'].forEach(id => n.querySelector('[data-list]').appendChild(DO.memoryRow(DATA.byId(id), { showObject: true })));
    n.appendChild(tabbar('memory')); return n;
  });

  register('error', ({ kind = 'generic' } = {}) => {
    const upload = kind === 'upload';
    const n = el(`<div><div class="screen__scroll safe-top" style="padding-top:70px">
      <div class="proc__hero"><img src="${DATA.objects.boiler.photo}" style="object-position:${DATA.objects.boiler.focus};filter:saturate(.6)" alt=""></div>
      <div class="gutter" style="margin-top:24px"><h1 class="hero__title" style="font-size:28px;line-height:32px">${upload ? t('error.upload.title') : t('error.generic.title')}</h1>
        <p class="muted" style="font-size:17px;margin-top:8px;line-height:24px">${upload ? t('error.upload.sub') : t('error.generic.sub')}</p>
        <div class="callout callout--neutral" style="margin-top:20px">${icons.lock}<div>The original video is saved on this phone. Nothing is lost.</div></div>
        ${upload ? `<div class="progress" style="background:var(--fill-medium);margin-top:20px"><i style="width:62%;background:var(--text-secondary)"></i></div><p class="faint" style="font-size:13px;margin-top:6px">62% uploaded · will resume automatically</p>` : ''}
      </div></div>
      <div class="floating-cta"><button class="btn btn--primary btn--block" data-retry>${t('error.retry')}</button></div></div>`);
    n.querySelector('[data-retry]').addEventListener('click', () => { haptic('light'); go('processing', {}, { transition: 'fade', replace: true }); });
    n.appendChild(topbar({ left: 'close' })); return n;
  });

  register('permission', ({ kind = 'camera', then } = {}) => {
    const map = { camera: [icons.camera, t('permission.camera.title'), t('permission.camera.sub')], mic: [icons.mic, t('permission.mic.title'), t('permission.mic.sub')], photos: [icons.photos, t('permission.photos.title'), ''], notifications: [icons.bell, t('permission.notifications.title'), t('permission.notifications.sub')] };
    const [ic, title, sub] = map[kind];
    const n = el(`<div style="background:transparent"><div class="sheet__scrim is-open"></div><div class="perm"><div class="perm__card">
      <div class="perm__icon">${ic}</div><h1 class="perm__title">${title}</h1>${sub ? `<p class="perm__sub">${sub}</p>` : ''}
      <div class="perm__actions"><button class="btn btn--primary btn--block" data-allow>${t('permission.allow')}</button><button class="btn btn--ghost btn--block" data-later>${t('permission.notNow')}</button></div>
      <p class="legal">The system prompt appears next. You can change this any time in Settings.</p></div></div></div>`);
    n.querySelector('[data-allow]').addEventListener('click', async () => { haptic('light'); if (then) { const prev = DO.top(); await go(then, kind === 'photos' ? { duration: 48 } : {}, { transition: 'zoom', replace: true }); } else back({ transition: 'sheet' }); });
    n.querySelector('[data-later]').addEventListener('click', () => { haptic('light'); back({ transition: 'sheet' }); });
    return n;
  });
})();
