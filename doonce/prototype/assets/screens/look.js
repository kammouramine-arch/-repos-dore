// Look: camera as the interface, recognition as the signature moment.
(() => {
  const { register, go, back, el, t, haptic, wait, icons, state, topbar, openSheet } = DO;

  // Closed Catmull-Rom spline → cubic béziers, so the contour reads as a soft hull, not a box.
  const smoothPath = pts => {
    const n = pts.length; let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1]}`;
    }
    return d + ' Z';
  };
  // Shared recognition sequence (also used by onboarding scene 3). ~500–750 ms.
  DO.recognition = async (host, o, { scale = 1, offsetY = 0, uncertain = false } = {}) => {
    const hull = o.hull.map(([x, y]) => [50 + (x - 50) * scale, 50 + (y - 50) * scale + offsetY]);
    const r = el(`<div class="recog">
      ${hull.map(([x, y]) => `<i class="recog__anchor" style="left:${x + (Math.random() * 6 - 3)}%;top:${y + (Math.random() * 6 - 3)}%"></i>`).join('')}
      ${hull.slice(0, 3).map(([x, y]) => `<i class="recog__anchor" style="left:${(x + 50) / 2}%;top:${(y + 50) / 2}%"></i>`).join('')}
      <svg class="recog__contour" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${smoothPath(hull)}" vector-effect="non-scaling-stroke"/></svg>
      <div class="recog__label" style="left:${50 + (o.labelAt[0] - 50) * scale}%;top:${50 + (o.labelAt[1] - 50) * scale + offsetY}%"><b>${o.model || o.name}</b><span>${t('object.procedures', { n: DATA.memoriesFor(o.id).length })}</span></div>
    </div>`);
    host.appendChild(r);
    const rm = state.reduceMotion;
    const anchors = [...r.querySelectorAll('.recog__anchor')];
    const path = r.querySelector('path'); const label = r.querySelector('.recog__label');
    if (!rm) {
      anchors.forEach((a, i) => a.animate([{ opacity: 0, transform: 'translate(2px,-2px)' }, { opacity: .55, transform: 'none' }], { duration: 200, delay: i * 14, fill: 'forwards', easing: 'ease-out' }));
      await wait(220);
      path.animate([{ opacity: 0, strokeDashoffset: 1000 }, { opacity: uncertain ? .5 : 1, strokeDashoffset: 0 }], { duration: 240, fill: 'forwards', easing: 'cubic-bezier(0.2,0,0,1)' });
      anchors.forEach(a => a.animate([{ opacity: .55 }, { opacity: 0 }], { duration: 200, delay: 120, fill: 'forwards' }));
      await wait(220);
    } else { path.style.opacity = uncertain ? .5 : 1; path.style.strokeDashoffset = 0; }
    if (!uncertain) {
      // Signal pulse + lock
      haptic('medium');
      path.animate([{ opacity: 1, strokeWidth: '1.6px' }, { opacity: .6, strokeWidth: '3px', offset: .5 }, { opacity: 1, strokeWidth: '1.6px' }], { duration: rm ? 1 : 180 });
      r.querySelector('svg').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.015)', offset: .5 }, { transform: 'scale(1)' }], { duration: rm ? 1 : 180, easing: 'cubic-bezier(0.34,1.35,0.5,1)' });
      await wait(rm ? 0 : 60);
    }
    label.animate([{ opacity: 0, transform: 'translate(-50%, 8px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: rm ? 160 : 220, fill: 'forwards', easing: 'cubic-bezier(0.2,0,0,1)' });
    if (uncertain) label.querySelector('b').textContent = t('look.maybe', { object: o.name.toLowerCase() }).replace(/\?$/, '?');
    await wait(rm ? 0 : 200);
    return r;
  };

  register('look', ({ state: initial = 'auto', object = 'boiler' } = {}) => {
    const o = DATA.objects[object];
    const unknown = initial === 'unknown' || initial === 'error';
    const feed = unknown ? DATA.photos + 'hands-tools.jpg' : o.photo;
    const n = el(`<div class="screen--media" data-media="1">
      <div class="camera">
        <img class="camera__feed" src="${feed}" style="object-position:${unknown ? '50% 50%' : o.focus}" alt="">
        <div class="camera__grain"></div><div class="camera__vignette"></div>
        <div data-recog-host style="position:absolute;inset:0"></div>
        <div class="camera__bottom" data-bottom><div class="status-pill" data-status><i></i>${t('look.looking')}</div></div>
      </div>
    </div>`);
    n.appendChild(topbar({ media: true, left: 'close', right: `<button class="btn btn--icon btn--onmedia" data-torch aria-label="Torch">${icons.torch}</button>` }));
    n.querySelector('[data-torch]').addEventListener('click', e => { haptic('selection'); e.currentTarget.classList.toggle('btn--signal'); });
    const host = n.querySelector('[data-recog-host]');
    const status = n.querySelector('[data-status]');

    n.addEventListener('screen:shown', async () => {
      if (n.dataset.ran) return; n.dataset.ran = 1;
      await wait(initial === 'auto' ? 900 : 300);
      if (initial === 'unknown') return showUnknown();
      if (initial === 'error') return showError();
      if (initial === 'uncertain') { await DO.recognition(host, o, { uncertain: true }); return showUncertain(); }
      // Multiple objects: best match gets the contour, a second known object gets a small dot.
      status.querySelector('i').remove(); status.innerHTML = `<i></i>${t('look.looking')}`;
      await DO.recognition(host, o);
      host.appendChild(el(`<i class="recog__dot" style="left:84%;top:78%"></i>`));
      status.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
      await wait(120);
      showRecognised();
    });

    function showRecognised() {
      const mems = DATA.memoriesFor(o.id); const first = mems[0]; const rest = mems.slice(1);
      const { sheet } = openSheet(`
        <button data-view style="display:flex;align-items:center;gap:12px;width:100%;text-align:left"><div style="flex:1"><div class="hero__title" style="font-size:28px;line-height:32px">${o.name}</div><div class="muted" style="font-size:15px;margin-top:2px">${o.model} · ${DATA.spaces[o.space].name}</div></div>
          <span class="chip chip--signal">${icons.check.replace('class="icon"', 'class="icon icon--sm"')} ${t('object.procedures', { n: mems.length })}</span><span class="faint">${icons.chevron}</span></button>
        <div class="eyebrow" style="margin:22px 0 6px">${t('look.mostRelevant')}</div>
        <button class="card" data-first style="height:auto;width:100%;text-align:left;background:var(--fill-subtle);border-radius:var(--radius-medium)"><div style="display:flex;align-items:center;gap:14px;padding:12px">
          <img src="${first.steps?.[0]?.photo || o.photo}" style="width:72px;height:72px;border-radius:12px;object-fit:cover;object-position:${o.focus}" alt="">
          <div style="flex:1"><div style="font-size:19px;font-weight:700;letter-spacing:-0.02em">${first.title}</div><div class="muted" style="font-size:14px;margin-top:2px">${t('people.taughtBy', { person: DATA.people[first.taughtBy].name })} · ${first.duration} · ${first.steps?.length || first.stepsCount} steps</div></div>
          <span class="btn btn--signal btn--small" style="min-height:40px">${t('look.start')}</span></div></button>
        <div class="eyebrow" style="margin:20px 0 4px">${t('look.otherMemories')}</div>
        <div data-rest></div>`, { media: true });
      rest.forEach(m => sheet.querySelector('[data-rest]').appendChild(DO.memoryRow(m)));
      sheet.querySelector('[data-first]').addEventListener('click', () => { haptic('medium'); go('do', { id: first.id, step: 1 }, { transition: 'zoom' }); });
      sheet.querySelector('[data-view]').addEventListener('click', () => { haptic('light'); go('object', { id: o.id }, { transition: 'morph', from: sheet.querySelector('[data-first] img') }); });
    }
    function showUncertain() {
      haptic('warning');
      const { sheet, close } = openSheet(`
        <div class="hero__title" style="font-size:26px;line-height:30px">${t('look.maybe', { object: o.name.toLowerCase() })}</div>
        <p class="muted" style="margin-top:6px;font-size:16px">${o.model} · ${DATA.spaces[o.space].name}</p>
        <div style="display:flex;gap:10px;margin-top:20px"><button class="btn btn--primary" style="flex:1" data-yes>${t('look.yes')}</button><button class="btn btn--secondary" style="flex:1" data-no>${t('look.no')}</button></div>`, { media: true });
      sheet.querySelector('[data-yes]').addEventListener('click', async () => { haptic('medium'); await close(); host.innerHTML = ''; await DO.recognition(host, o); showRecognised(); });
      sheet.querySelector('[data-no]').addEventListener('click', async () => { haptic('selection'); await close(); showUnknown(); });
    }
    function showUnknown() {
      status.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
      const { sheet } = openSheet(`
        <div class="hero__title" style="font-size:28px;line-height:32px">${t('look.unknown.title')}</div>
        <p class="muted" style="margin-top:6px;font-size:16px">Show me once and I'll know it next time.</p>
        <button class="btn btn--signal btn--block" data-remember style="margin-top:20px">${icons.add}${t('look.unknown.cta')}</button>
        <button class="btn btn--ghost btn--block" data-similar>${t('look.unknown.secondary')}</button>`, { media: true });
      sheet.querySelector('[data-remember]').addEventListener('click', () => { haptic('light'); go('addObject', {}, { transition: 'fade' }); });
      sheet.querySelector('[data-similar]').addEventListener('click', () => { haptic('light'); go('search', { query: 'tools' }, { transition: 'fade' }); });
    }
    function showError() {
      status.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
      n.querySelector('.camera__feed').style.filter = 'brightness(.35)';
      const { sheet, close } = openSheet(`
        <div class="hero__title" style="font-size:26px;line-height:30px">${t('look.error.title')}</div>
        <p class="muted" style="margin-top:6px;font-size:16px">${t('look.error.sub')}</p>
        <div style="display:flex;gap:10px;margin-top:20px"><button class="btn btn--primary" style="flex:1" data-retry>${t('look.error.retry')}</button><button class="btn btn--secondary" style="flex:1" data-manual>${t('look.error.manual')}</button></div>`, { media: true });
      sheet.querySelector('[data-retry]').addEventListener('click', async () => { haptic('light'); await close(); n.querySelector('.camera__feed').style.filter = ''; status.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' }); await wait(700); await DO.recognition(host, o); showRecognised(); });
      sheet.querySelector('[data-manual]').addEventListener('click', () => { haptic('light'); go('search', {}, { transition: 'fade' }); });
    }
    return n;
  });

  // ---- Add: remember an object without a procedure ----
  register('addObject', () => {
    const n = el(`<div class="screen--media" data-media="1">
      <div class="camera"><img class="camera__feed" src="${DATA.objects.thermostat.photo}" alt=""><div class="camera__grain"></div><div class="camera__vignette"></div>
        <div class="camera__bottom"><div class="camera__hint">Frame the object.<small>A few angles help me recognise it later.</small></div>
          <button class="record" data-shot aria-label="Capture"><span class="record__ring"></span><span class="record__core" style="background:var(--text-on-media)"></span></button></div></div></div>`);
    let shots = 0;
    n.querySelector('[data-shot]').addEventListener('click', async () => {
      haptic('light'); shots++;
      n.querySelector('.camera').animate([{ opacity: 1 }, { opacity: .3 }, { opacity: 1 }], { duration: 160 });
      if (shots === 1) DO.toast('One more angle');
      else go('objectCreate', { object: 'thermostat', add: true }, { transition: 'fade' });
    });
    n.appendChild(topbar({ media: true, left: 'close' }));
    return n;
  });
})();
