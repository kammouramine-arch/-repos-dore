// Teach: pre-recording, recording with live intelligence, processing, review, object creation, save.
(() => {
  const { register, go, back, el, t, haptic, wait, icons, state, topbar, openSheet, setIsland } = DO;
  const m = () => DATA.byId('repressurise');
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  register('teach', ({ state: initial = 'idle', object } = {}) => {
    const o = DATA.objects.boiler;
    const n = el(`<div class="screen--media" data-media="1">
      <div class="camera">
        <img class="camera__feed" src="${o.photo}" style="object-position:${o.focus}" alt="">
        <div class="camera__grain"></div><div class="camera__vignette"></div><div class="camera__shade"></div>
        <div data-obs style="position:absolute;inset:0;pointer-events:none"></div>
        <div class="transcript" data-transcript hidden></div>
        <div class="ribbon" data-ribbon hidden><b data-ribbon-fill style="width:0"></b></div>
        <button class="btn btn--small btn--onmedia remember-this" data-mark hidden>${icons.spark.replace('class="icon"', 'class="icon icon--sm"')} ${t('teach.rememberThis')}</button>
        <div class="camera__bottom">
          <div class="camera__hint" data-hint>${t('teach.instruction')}<small>${t('teach.hint')}</small></div>
          <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
            <button class="btn btn--icon btn--onmedia" data-import aria-label="${t('teach.import')}" style="width:48px;min-height:48px">${icons.photos}</button>
            <button class="record" data-record aria-label="Record"><span class="record__pulse"></span><span class="record__ring"></span><span class="record__core"></span></button>
            <button class="btn btn--icon btn--onmedia" data-object aria-label="${t('teach.existingObject')}" style="width:48px;min-height:48px">${object ? `<img src="${DATA.objects[object].photo}" style="width:48px;height:48px;border-radius:50%;object-fit:cover">` : icons.add}</button>
          </div>
        </div>
      </div>
    </div>`);
    const tb = topbar({ media: true, left: 'close', right: `<span class="status-pill" data-timer hidden><span style="width:8px;height:8px;border-radius:50%;background:var(--recording)"></span><span class="timer">0:00</span></span>` });
    n.appendChild(tb);
    const rec = n.querySelector('[data-record]'); const hint = n.querySelector('[data-hint]');
    let recording = false, start = 0, timerId, elapsed = 0;

    n.querySelector('[data-import]').addEventListener('click', () => { haptic('light'); go('permission', { kind: 'photos', then: 'processing' }, { transition: 'sheet' }); });
    n.querySelector('[data-object]').addEventListener('click', () => { haptic('light'); openSheet(`<div class="hero__title" style="font-size:24px">${t('teach.existingObject')}</div><div data-objs style="margin-top:12px"></div>`, { media: true }).sheet.querySelector('[data-objs]').append(...Object.values(DATA.objects).map(ob => { const r = el(`<button class="row" data-sheet-close><img class="row__thumb row__thumb--sm" src="${ob.photo}" style="object-position:${ob.focus}"><div class="row__body"><div class="row__title">${ob.name}</div><div class="row__sub">${ob.model}</div></div></button>`); r.addEventListener('click', () => haptic('selection')); return r; })); });

    rec.addEventListener('click', () => recording ? stop() : begin());
    async function begin() {
      recording = true; haptic('medium');
      rec.classList.add('is-recording');
      hint.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
      const timer = tb.querySelector('[data-timer]'); timer.hidden = false;
      timer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 200, fill: 'forwards' });
      setIsland(`<span class="island__dot"></span><span data-island-timer>0:00</span>`);
      n.querySelector('[data-transcript]').hidden = false; n.querySelector('[data-ribbon]').hidden = false; n.querySelector('[data-mark]').hidden = false;
      start = performance.now();
      const speed = state.reduceMotion ? 6 : 3; // prototype: time runs faster so the demo takes ~16 s
      timerId = setInterval(() => {
        elapsed = (performance.now() - start) / 1000 * speed;
        const s = fmt(elapsed); timer.querySelector('.timer').textContent = s; const it = document.querySelector('[data-island-timer]'); if (it) it.textContent = s;
        n.querySelector('[data-ribbon-fill]').style.width = `${Math.min(100, elapsed / 50 * 100)}%`;
        // Amplitude-tied pulse (simulated)
        rec.querySelector('.record__pulse').style.transform = `scale(${1 + 0.04 * Math.abs(Math.sin(elapsed * 2.1))})`;
      }, 50);
      liveIntelligence();
    }
    async function liveIntelligence() {
      const tr = n.querySelector('[data-transcript]'); const obs = n.querySelector('[data-obs]'); const ribbon = n.querySelector('[data-ribbon]');
      const events = [
        { at: 5,  transcript: 0 }, { at: 8, obs: ['Step detected', 46, 62] },
        { at: 12, transcript: 1 }, { at: 14, obs: ['Valve detected', 26, 56] },
        { at: 19, transcript: 2 }, { at: 21, obs: ['“Turn it slowly” · Important', 40, 30, true] },
        { at: 27, transcript: 3 }, { at: 30, obs: ['Stop at 1.5 bar', 52, 40] },
        { at: 34, transcript: 4 }, { at: 36, obs: ['“Never above two” · Important', 34, 34, true] },
        { at: 41, transcript: 5 }, { at: 43, obs: ['Step detected', 50, 64] },
      ];
      const lines = m().transcript.slice(1);
      for (const ev of events) {
        while (recording && elapsed < ev.at) await wait(60);
        if (!recording) return;
        if (ev.transcript !== undefined) {
          const seg = lines[ev.transcript]; let html = seg.text; (seg.key || []).forEach(k => { html = html.replace(k, `<mark>${k}</mark>`); });
          tr.innerHTML = html; tr.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 200, fill: 'forwards' });
        }
        if (ev.obs) {
          const [label, x, y, important] = ev.obs;
          const c = el(`<div class="observation ${important ? 'observation--important' : ''}" style="left:${x}%;top:${y}%"><i></i>${label}</div>`);
          obs.appendChild(c);
          c.animate([{ opacity: 0, transform: 'translateY(6px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 220, fill: 'forwards', easing: 'cubic-bezier(0.2,0,0,1)' });
          const tick = el(`<i style="left:${ev.at / 50 * 100}%"></i>`); if (important) tick.style.background = 'var(--warning)';
          setTimeout(() => { if (!recording) return; c.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(30px) scale(.8)' }], { duration: 320, fill: 'forwards', easing: 'cubic-bezier(0.4,0,1,1)' }).finished.then(() => c.remove()); ribbon.appendChild(tick); }, state.reduceMotion ? 600 : 1500);
        }
      }
      while (recording && elapsed < 50) await wait(60);
      if (recording) stop();
    }
    n.querySelector('[data-mark]').addEventListener('click', e => {
      haptic('selection');
      e.currentTarget.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 180 });
      n.querySelector('[data-ribbon]').appendChild(el(`<i class="is-marked" style="left:${elapsed / 50 * 100}%"></i>`));
      DO.toast(t('teach.marked'), 900);
    });
    async function stop() {
      recording = false; clearInterval(timerId); haptic('light');
      rec.classList.remove('is-recording'); setIsland('');
      // Freeze on the last frame and carry it into Processing (matched geometry).
      const feed = n.querySelector('.camera__feed'); feed.style.animation = 'none';
      n.querySelectorAll('.observation, [data-transcript], [data-mark], .camera__bottom, .ribbon, .topbar').forEach(x => x.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }));
      const wrap = n.querySelector('.camera');
      await wrap.animate([{ transform: 'none', borderRadius: '0px' }, { transform: 'translateY(64px) scale(.9)', borderRadius: '24px' }], { duration: DO.dur('navigation'), easing: 'cubic-bezier(0.32,0.72,0,1)', fill: 'forwards' }).finished;
      await go('processing', { duration: Math.max(elapsed, 48), marked: n.querySelectorAll('.is-marked').length }, { transition: 'fade', replace: true });
    }
    if (initial === 'recording') n.addEventListener('screen:shown', () => { if (!recording) begin(); }, { once: true });
    return n;
  });

  // ---- Processing: video becoming structured memory ----
  register('processing', ({ duration = 48 } = {}) => {
    const mem = m();
    const n = el(`<div>
      <div class="screen__scroll safe-top" style="padding-top:70px">
        <div class="proc__hero"><img src="${DATA.objects.boiler.photo}" style="object-position:${DATA.objects.boiler.focus}" alt=""></div>
        <h1 class="gutter" style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin-top:22px">${t('processing.title')}</h1>
        <div class="proc__status" data-status><i></i><span>${t('processing.listening')}</span></div>
        <div class="proc__timeline"><div class="line"><b data-fill></b></div><div data-ticks></div><span class="stamp" style="left:0">0:00</span><span class="stamp" style="left:100%">${fmt(duration)}</span></div>
        <div class="proc__words" data-words></div>
        <div class="proc__steps" data-steps></div>
      </div>
      <div class="floating-cta" style="opacity:0" data-cta><button class="btn btn--primary btn--block">${t('review.title')}</button></div>
    </div>`);
    n.querySelector('[data-cta]').addEventListener('click', () => { haptic('light'); go('review', {}, { transition: 'push', replace: true }); });
    n.addEventListener('screen:shown', async () => {
      if (n.dataset.ran) return; n.dataset.ran = 1;
      const status = n.querySelector('[data-status] span'); const words = n.querySelector('[data-words]'); const ticks = n.querySelector('[data-ticks]'); const fill = n.querySelector('[data-fill]'); const steps = n.querySelector('[data-steps]');
      const setStatus = s => { status.textContent = s; status.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 }); };
      setIsland(`<span style="width:8px;height:8px;border-radius:50%;background:var(--signal)"></span>Remembering`);
      const rm = state.reduceMotion;
      // Stage 1: listening — transcript words stream in at word cadence, key phrases light up.
      const segs = mem.transcript;
      for (const seg of segs) {
        fill.style.width = `${seg.t / duration * 100}%`;
        let html = seg.text; (seg.key || []).forEach(k => { html = html.replace(k, `<mark>${k}</mark>`); });
        words.innerHTML = ''; const ws = html.split(' ');
        for (let i = 0; i < ws.length; i++) { words.innerHTML = ws.slice(0, i + 1).join(' '); await wait(rm ? 0 : 42); }
        if (seg.important || seg.value) { const tk = el(`<i class="tick" style="left:${seg.t / duration * 100}%;${seg.important ? 'background:var(--warning)' : ''}"></i>`); ticks.appendChild(tk); haptic('selection'); }
        await wait(rm ? 0 : 120);
      }
      fill.style.width = '100%';
      // Stage 2: finding steps — tick marks for step boundaries, then frames lift into a sequence.
      setStatus(t('processing.steps'));
      for (const s of mem.steps) { ticks.appendChild(el(`<i class="tick" style="left:${s.from / duration * 100}%"></i>`)); await wait(rm ? 0 : 140); }
      await wait(rm ? 0 : 300);
      words.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
      for (const s of mem.steps) {
        const row = el(`<div class="proc__step"><img src="${s.photo}" style="object-position:${s.focus}" alt=""><div><b>${s.instruction}</b><span>${fmt(s.from)} – ${fmt(s.to)}</span></div></div>`);
        steps.appendChild(row);
        row.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: rm ? 160 : 240, fill: 'forwards', easing: 'cubic-bezier(0.32,0.72,0,1)' });
        await wait(rm ? 0 : 160);
      }
      // Stage 3: matching object (real embedding match in the app; simulated here).
      setStatus(t('processing.object')); await wait(rm ? 0 : 700);
      setStatus(t('processing.guide')); await wait(rm ? 0 : 600);
      n.querySelector('[data-status] i').style.background = 'var(--signal)';
      setStatus('Ready to review.');
      setIsland('');
      haptic('light');
      n.querySelector('[data-cta]').animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 260, fill: 'forwards', easing: 'cubic-bezier(0.32,0.72,0,1)' });
    });
    n.appendChild(topbar({ left: 'none', title: '' }));
    return n;
  });

  // ---- Generated procedure / review / edit ----
  register('review', ({ edit = false, existing } = {}) => {
    const mem = existing ? DATA.byId(existing) : m(); const o = DATA.objects[mem.object]; const p = DATA.people[mem.taughtBy];
    const n = el(`<div>
      <div class="screen__scroll" style="padding-bottom:120px">
        <div class="hero"><img src="${o.photo}" style="object-position:${o.focus}" alt=""><div class="hero__scrim"></div>
          <div class="hero__body"><button class="chip chip--onmedia" style="margin-bottom:10px" data-edit-title>${icons.edit.replace('class="icon"', 'class="icon icon--sm"')} ${t('review.editTitle')}</button><h1 class="hero__title">${mem.title}</h1></div></div>
        <div class="meta">
          <div class="meta__item"><small>Object</small><span>${existing ? o.model : `<span class="signal-text">Probably</span> ${o.model}`}</span></div>
          <div class="meta__item"><small>${t('review.demonstratedBy')}</small><span>${p.name}</span></div>
          <div class="meta__item"><small>${t('review.duration')}</small><span>${mem.duration}</span></div>
          <div class="meta__item"><small>${t('review.steps')}</small><span>${mem.steps.length}</span></div>
        </div>
        <div class="gutter" style="margin-top:14px"><div class="callout callout--neutral" style="font-size:14px">${icons.eye}<div>Steps marked <b>${t('review.observed')}</b> were seen and heard. Anything unclear is flagged, never invented.</div></div></div>
        <div class="gutter" style="margin-top:8px" data-steps>${mem.steps.map(s => `<div class="step" data-step="${s.n}">
            <div class="step__media"><img src="${s.photo}" style="object-position:${s.focus}" alt=""><span class="step__n">${s.n}</span><button class="btn btn--small btn--onmedia step__clip" data-see="${s.from}">${icons.play.replace('class="icon icon--fill"', 'class="icon icon--fill icon--sm"')} ${t('review.originalClip', { from: fmt(s.from), to: fmt(s.to) })}</button></div>
            <div class="step__instruction" contenteditable="${edit}" spellcheck="false">${s.instruction}</div>
            ${s.detail ? `<div class="muted" style="font-size:17px">${s.detail}</div>` : ''}
            <p class="step__quote">${s.quote}</p>
            ${s.warning ? `<div class="callout">${icons.warning}<div>${s.warning}</div></div>` : ''}
            ${s.provenance === 'unclear' ? `<div class="callout callout--neutral">${icons.ask}<div>${t('review.unclear')} ${s.unclear || ''}</div></div>` : ''}
            <div class="step__foot"><span class="chip ${s.provenance === 'observed' ? 'chip--signal' : ''}">${s.provenance === 'observed' ? t('review.observed') : s.provenance === 'inferred' ? t('review.inferred') : 'Unclear'}</span>
              ${edit ? `<button class="chip" data-warn="${s.n}">${icons.warning.replace('class="icon"', 'class="icon icon--sm"')} ${s.warning ? 'Warning set' : t('review.markWarning')}</button><button class="chip" data-more="${s.n}">${icons.more.replace('class="icon"', 'class="icon icon--sm"')}</button>` : ''}
            </div>
          </div>`).join('')}</div>
        ${edit ? `<div class="gutter"><button class="btn btn--secondary btn--block">${icons.add} Add a step</button></div>` : ''}
      </div>
      <div class="floating-cta">${edit ? `<button class="btn btn--primary btn--block" data-save>${t('common.save')}</button>` : `<button class="btn btn--secondary" style="width:52px;min-height:52px;padding:0;border-radius:50%" data-edit aria-label="${t('common.edit')}">${icons.edit}</button><button class="btn btn--signal btn--block" data-remember>${icons.loop}${t('review.remember')}</button>`}</div>
    </div>`);
    n.querySelector('[data-remember]')?.addEventListener('click', () => { haptic('light'); go('objectCreate', { object: 'boiler' }, { transition: 'sheet' }); });
    n.querySelector('[data-edit]')?.addEventListener('click', () => { haptic('light'); go('review', { edit: true }, { transition: 'fade', replace: true }); });
    n.querySelector('[data-save]')?.addEventListener('click', () => { haptic('success'); existing ? back() : go('review', {}, { transition: 'fade', replace: true }); });
    n.querySelector('[data-edit-title]').addEventListener('click', () => { haptic('light'); openSheet(`<div class="hero__title" style="font-size:24px">${t('review.editTitle')}</div><div class="search search--active" style="margin-top:16px"><span class="search__label" style="color:var(--text-primary)">${mem.title}</span><span class="search__caret"></span></div><button class="btn btn--primary btn--block" style="margin-top:16px" data-sheet-close>${t('common.save')}</button>`); });
    n.addEventListener('click', e => {
      const s = e.target.closest('[data-see]'); if (s) { haptic('light'); DO.showOriginal(mem, +s.dataset.see); }
      const w = e.target.closest('[data-warn]'); if (w) { haptic('warning'); w.textContent = 'Warning set'; w.classList.add('chip--warning'); }
      const mo = e.target.closest('[data-more]'); if (mo) { haptic('light'); openSheet(`<div class="list">${[t('review.replaceFrame'), t('review.splitStep'), t('review.combine'), 'Move up', 'Move down', t('review.remove')].map((x, i) => `<button class="row" data-sheet-close style="${i === 5 ? 'color:var(--danger)' : ''}"><div class="row__body"><div class="row__title">${x}</div></div></button>`).join('')}</div>`); }
    });
    n.appendChild(topbar({ media: true, left: edit ? 'close' : 'back', title: edit ? '' : '' }));
    return n;
  });

  // ---- Object creation ----
  register('objectCreate', ({ object = 'boiler', add = false } = {}) => {
    const o = DATA.objects[object];
    const n = el(`<div style="background:var(--background-elevated)">
      <div class="screen__scroll safe-top" style="padding-top:80px">
        <div class="gutter">
          <div style="width:120px;height:120px;border-radius:28px;overflow:hidden;box-shadow:var(--elev-raised)"><img src="${o.photo}" style="width:100%;height:100%;object-fit:cover;object-position:${o.focus}" alt=""></div>
          <h1 class="hero__title" style="margin-top:22px">${t('objectCreate.suggest', { object: o.model })}</h1>
          <p class="muted" style="font-size:17px;margin-top:8px">${add ? 'I’ll recognise it next time you look.' : 'This memory will live with it.'}</p>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:24px">
            <button class="btn btn--primary btn--block" data-correct>${icons.check}${t('objectCreate.correct')}</button>
            <div style="display:flex;gap:8px"><button class="btn btn--secondary" style="flex:1" data-edit>${t('objectCreate.edit')}</button><button class="btn btn--secondary" style="flex:1" data-generic>${t('objectCreate.generic', { category: o.category })}</button></div>
          </div>
          <div class="eyebrow" style="margin:28px 0 10px">${t('objectCreate.whichSpace')}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap" data-spaces>${Object.values(DATA.spaces).map(s => `<button class="chip chip--photo ${s.id === o.space ? 'is-selected' : ''}" data-space="${s.id}"><img src="${s.photo}" alt="">${s.name}</button>`).join('')}<button class="chip">${icons.add.replace('class="icon"', 'class="icon icon--sm"')} New</button></div>
        </div>
      </div></div>`);
    n.querySelector('[data-spaces]').addEventListener('click', e => { const c = e.target.closest('[data-space]'); if (c) { haptic('selection'); n.querySelectorAll('[data-space]').forEach(x => x.classList.toggle('is-selected', x === c)); } });
    const proceed = () => { haptic('success'); add ? go('object', { id: object, fresh: true }, { transition: 'fade', reset: true, replace: true }) : go('save', { object }, { transition: 'fade', replace: true }); };
    n.querySelector('[data-correct]').addEventListener('click', proceed);
    n.querySelector('[data-generic]').addEventListener('click', proceed);
    n.querySelector('[data-edit]').addEventListener('click', () => { haptic('light'); openSheet(`<div class="hero__title" style="font-size:24px">Name</div><div class="search search--active" style="margin-top:16px"><span class="search__label" style="color:var(--text-primary)">${o.model}</span><span class="search__caret"></span></div><button class="btn btn--primary btn--block" style="margin-top:16px" data-sheet-close>${t('common.save')}</button>`); });
    n.appendChild(topbar({ left: 'close' }));
    return n;
  });

  // ---- Save moment: the procedure is absorbed by the object ----
  register('save', ({ object = 'boiler' } = {}) => {
    const o = DATA.objects[object]; const mem = m();
    const n = el(`<div class="save">
      <div class="save__card" data-card><img src="${o.photo}" style="object-position:${o.focus}" alt=""><div class="body"><b>${mem.title}</b><span>${mem.steps.length} steps · ${t('people.taughtBy', { person: DATA.people[mem.taughtBy].name })}</span></div></div>
      <div class="save__object" data-obj><img src="${o.photo}" style="object-position:${o.focus}" alt=""></div>
      <div class="save__count" data-count>${t('object.procedures', { n: DATA.memoriesFor(o.id).length - 1 })}</div>
      <div class="save__row" data-row><img src="${mem.steps[0].photo}" style="object-position:${mem.steps[0].focus}" alt=""><div><div style="font-size:16px;font-weight:600">${mem.title}</div><div class="muted" style="font-size:13px">${o.name}</div></div></div>
      <div class="save__title" data-title>${t('save.remembered')}</div>
      <div class="save__sub" data-sub>${t('save.next', { object: o.name.toLowerCase() })}</div>
      <div class="floating-cta" style="opacity:0" data-cta><button class="btn btn--primary btn--block" data-done>${t('save.done')}</button></div>
    </div>`);
    n.querySelector('[data-done]').addEventListener('click', () => { haptic('light'); state.savedMemories.add('repressurise'); go('memory', {}, { transition: 'fade', reset: true, replace: true }); });
    n.addEventListener('screen:shown', async () => {
      if (n.dataset.ran) return; n.dataset.ran = 1;
      const rm = state.reduceMotion; const E = 'cubic-bezier(0.32,0.72,0,1)';
      const card = n.querySelector('[data-card]'), obj = n.querySelector('[data-obj]'), count = n.querySelector('[data-count]'), row = n.querySelector('[data-row]');
      await wait(rm ? 100 : 500);
      // 1. object appears
      obj.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1)' }], { duration: rm ? 160 : 320, fill: 'forwards', easing: E });
      count.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: rm ? 0 : 200, fill: 'forwards' });
      await wait(rm ? 100 : 420);
      // 2. procedure compresses toward the object
      const cr = card.getBoundingClientRect(), orr = obj.getBoundingClientRect();
      const dx = (orr.left + orr.width / 2) - (cr.left + cr.width / 2), dy = (orr.top + orr.height / 2) - (cr.top + cr.height / 2);
      await card.animate([{ transform: 'none', opacity: 1, filter: 'blur(0)' }, { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0, filter: 'blur(6px)' }], { duration: rm ? 160 : 620, fill: 'forwards', easing: E }).finished;
      // 3. object absorbs it: count rolls, thumbnail beats
      obj.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: .4 }, { transform: 'scale(1)' }], { duration: rm ? 1 : 300, easing: 'cubic-bezier(0.34,1.35,0.5,1)' });
      count.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-8px)', opacity: 0 }], { duration: 120, fill: 'forwards' }).finished.then(() => { count.textContent = t('object.procedures', { n: DATA.memoriesFor(o.id).length }); count.animate([{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 160, fill: 'forwards' }); });
      haptic('success');
      // 4. settles as a row beneath, then the words
      await wait(rm ? 60 : 200);
      row.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240, fill: 'forwards', easing: E });
      await wait(rm ? 60 : 260);
      n.querySelector('[data-title]').animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, fill: 'forwards', easing: E });
      await wait(rm ? 0 : 140);
      n.querySelector('[data-sub]').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'forwards' });
      n.querySelector('[data-cta]').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: rm ? 0 : 300, fill: 'forwards' });
    });
    return n;
  });
})();
