// Do mode: one instruction per screen, hands-free, ask, completion.
(() => {
  const { register, go, back, el, t, haptic, wait, icons, state, openSheet, setIsland } = DO;
  const LOGO = 'M 21 51.5 C 27 53.5, 32.5 58.5, 37.6 64.4 A 26 26 0 1 0 32.4 35.0';

  register('do', ({ id = 'repressurise', step = 1, handsFree = false, ask = false, title } = {}) => {
    const m = DATA.byId(id); const o = DATA.objects[m.object]; const p = DATA.people[m.taughtBy];
    const steps = m.steps || Array.from({ length: m.stepsCount || 3 }, (_, i) => ({ n: i + 1, instruction: ['Open the panel.', 'Find the control.', 'Do the thing carefully.', 'Check the result.', 'Close up.', 'Test it.', 'Done.'][i], from: i * 8, photo: o.photo, focus: o.focus }));
    let i = Math.min(step, steps.length) - 1; let hf = handsFree || state.prefs.handsFree;
    const n = el(`<div class="do">
      <div class="do__media"><img data-media src="" alt=""></div>
      <div class="do__top">
        <button class="btn btn--icon btn--onmedia" data-close aria-label="${t('common.close')}">${icons.close}</button>
        <div class="do__counter"><b data-counter></b><div class="segments">${steps.map(() => '<i></i>').join('')}</div></div>
        <button class="btn btn--icon btn--onmedia" data-hf aria-label="${t('do.handsFree')}">${icons.ear}</button>
      </div>
      <div class="autochip" data-auto>${icons.check}<span></span></div>
      <div class="do__body">
        <div class="do__instruction" data-instruction></div>
        <div class="do__detail" data-detail></div>
        <div data-warning></div>
        <div class="do__provenance"><span class="avatar">${p.initials}</span><span>${t('do.taughtBy', { person: p.name, date: m.shortDate })}</span></div>
      </div>
      <div class="do__controls">
        <div class="handsfree" data-hfbar hidden><div class="wave"><i></i><i></i><i></i><i></i><i></i></div><span>${t('do.handsFreeOn')} · ${t('do.voice.hint')}</span></div>
        <button class="btn btn--primary btn--block" data-done style="min-height:60px;font-size:19px">${t('do.done')}</button>
        <div class="do__secondary">
          <button class="btn btn--secondary btn--small" data-replay>${icons.replay.replace('class="icon"', 'class="icon icon--sm"')} ${t('do.replay')}</button>
          <button class="btn btn--secondary btn--small" data-original>${t('do.seeOriginal')}</button>
          <button class="btn btn--secondary btn--small" data-ask>${icons.ask.replace('class="icon"', 'class="icon icon--sm"')} ${t('do.ask')}</button>
        </div>
      </div>
    </div>`);
    const E = 'cubic-bezier(0.2,0,0,1)';
    function render(dir = 0) {
      const s = steps[i];
      const img = n.querySelector('[data-media]');
      if (dir) img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished.then(() => { img.src = s.photo; img.style.objectPosition = s.focus; img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'forwards' }); });
      else { img.src = s.photo; img.style.objectPosition = s.focus; }
      n.querySelector('[data-counter]').textContent = t('do.of', { i: i + 1, n: steps.length });
      n.querySelectorAll('.segments i').forEach((seg, k) => { seg.classList.toggle('is-done', k < i); seg.classList.toggle('is-current', k === i); });
      const body = n.querySelector('.do__body');
      const swap = () => {
        n.querySelector('[data-instruction]').textContent = s.instruction;
        n.querySelector('[data-detail]').textContent = s.detail || '';
        n.querySelector('[data-warning]').innerHTML = s.warning ? `<div class="callout">${icons.warning}<div><b>${t('do.warning')}.</b> ${s.warning}</div></div>` : (s.provenance === 'unclear' ? `<div class="callout callout--neutral">${icons.ask}<div>${t('review.unclear')}</div></div>` : '');
        if (s.warning) haptic('warning');
      };
      if (dir && !state.reduceMotion) body.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-24 * dir}px)` }], { duration: 180, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'forwards' }).finished.then(() => { swap(); body.animate([{ opacity: 0, transform: `translateX(${24 * dir}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: E, fill: 'forwards' }); });
      else swap();
      n.querySelector('[data-done]').textContent = i === steps.length - 1 ? 'Finish' : t('do.done');
      setIsland(`<span style="width:8px;height:8px;border-radius:50%;background:var(--signal)"></span>${i + 1} / ${steps.length}`);
      n.querySelector('[data-auto]').classList.remove('is-in');
      // Automatic completion where vision confidence is high (simulated for step 3: the gauge reaches 1.5 bar).
      if (s.completion) setTimeout(async () => { if (steps[i] !== s) return; const chip = n.querySelector('[data-auto]'); chip.querySelector('span').textContent = t('do.autoGood', { value: s.completion.value }); chip.classList.add('is-in'); haptic('success'); }, state.reduceMotion ? 400 : 2200);
    }
    const next = () => { haptic('selection'); if (i < steps.length - 1) { i++; render(1); } else finish(); };
    const prev = () => { haptic('selection'); if (i > 0) { i--; render(-1); } };
    async function finish() { setIsland(''); await go('complete', { id }, { transition: 'fade', replace: true }); }
    n.querySelector('[data-done]').addEventListener('click', next);
    n.querySelector('[data-close]').addEventListener('click', () => { haptic('light'); setIsland(''); back({ transition: 'zoom' }); });
    n.querySelector('[data-replay]').addEventListener('click', () => { haptic('light'); const img = n.querySelector('[data-media]'); img.style.animation = 'none'; requestAnimationFrame(() => img.style.animation = ''); DO.toast('Replaying clip', 900); });
    n.querySelector('[data-original]').addEventListener('click', () => { haptic('light'); DO.showOriginal(m, steps[i].from); });
    n.querySelector('[data-ask]').addEventListener('click', () => { haptic('light'); openAsk(); });
    n.querySelector('[data-hf]').addEventListener('click', () => { haptic('light'); hf = !hf; applyHF(); });
    function applyHF() {
      n.querySelector('[data-hfbar]').hidden = !hf; n.querySelector('[data-hf]').classList.toggle('btn--signal', hf);
      document.querySelector('[data-voice-sim]').hidden = !hf;
      // The bar itself says hands-free is on; no toast, it would collide with the step counter.
    }
    // Voice (simulated from the reviewer panel; on device: SFSpeechRecognizer + intent parser in DoOnceCore)
    const onVoice = e => {
      if (!hf || !n.isConnected) return; const u = e.detail.toLowerCase();
      if (u.includes('next')) next(); else if (u.includes('back')) prev(); else if (u.includes('repeat')) DO.toast(`“${steps[i].instruction}”`, 1600);
      else if (u.includes('what did')) openAsk('What did he say about this valve?'); else if (u.includes('done')) finish();
    };
    document.addEventListener('voice', onVoice);
    // Swipe to progress
    let sx = 0; n.addEventListener('pointerdown', e => sx = e.clientX); n.addEventListener('pointerup', e => { const dx = e.clientX - sx; if (Math.abs(dx) > 60 && !e.target.closest('button')) dx < 0 ? next() : prev(); });

    function openAsk(question = 'What did he say about this valve?') {
      const seg = m.transcript ? m.transcript[3] : null;
      const { sheet } = openSheet(`<div style="display:flex;flex-direction:column;gap:14px">
        <div class="ask__q">${question}</div>
        <div><div class="ask__a">${seg ? `${p.name} said to turn it <b>slowly</b> because it becomes stiff near the end, and never to force it.` : `${p.name} didn't say anything specific about that.`}</div>
          ${seg ? `<button class="ask__src" data-src>${icons.play.replace('class="icon icon--fill"', 'class="icon icon--fill icon--sm"')} ${t('ask.source', { time: '0:19' })}</button>` : ''}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${['What pressure?', 'Which valve?', 'How long does it take?'].map(x => `<button class="chip" data-chip>${x}</button>`).join('')}</div>
        <div class="ask__input"><span>${t('ask.placeholder')}</span><span class="btn btn--icon">${icons.mic}</span></div></div>`);
      sheet.querySelector('[data-src]')?.addEventListener('click', () => { haptic('light'); DO.showOriginal(m, 19); });
      sheet.addEventListener('click', e => { const c = e.target.closest('[data-chip]'); if (c) { haptic('selection'); const a = sheet.querySelector('.ask__a'); sheet.querySelector('.ask__q').textContent = c.textContent; a.innerHTML = c.textContent.startsWith('What pressure') ? `${p.name} said to stop at <b>1.5 bar</b> and never go above 2, which is the red zone.` : c.textContent.startsWith('Which') ? `The <b>blue filling valve</b>, on the left.` : `About a minute after reset, ${p.name} said.`; sheet.querySelector('[data-src]').innerHTML = `${icons.play.replace('class="icon icon--fill"', 'class="icon icon--fill icon--sm"')} ${t('ask.source', { time: c.textContent.startsWith('What pressure') ? '0:27' : c.textContent.startsWith('Which') ? '0:12' : '0:41' })}`; } });
    }
    render(0); applyHF();
    n.addEventListener('screen:shown', () => { if (ask && !n.dataset.asked) { n.dataset.asked = 1; setTimeout(() => openAsk(), 300); } });
    return n;
  });

  register('complete', ({ id = 'repressurise' } = {}) => {
    const n = el(`<div class="complete">
      <svg class="complete__loop" viewBox="0 0 100 100"><path d="${LOGO}" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h1 class="complete__title" data-title style="opacity:0">${t('do.complete.title')}</h1>
      <p class="complete__sub" data-sub style="opacity:0">${t('do.complete.sub')}</p>
      <div data-ask style="opacity:0;display:flex;flex-direction:column;align-items:center"><p class="complete__ask">${t('do.complete.accurate')}</p>
        <div class="complete__actions"><button class="btn btn--secondary" data-yes>${t('do.complete.yes')}</button><button class="btn btn--secondary" data-update>${t('do.complete.update')}</button></div></div>
      <div class="floating-cta" style="opacity:0" data-cta><button class="btn btn--primary btn--block" data-home>${t('save.done')}</button></div>
    </div>`);
    n.addEventListener('screen:shown', async () => {
      if (n.dataset.ran) return; n.dataset.ran = 1;
      document.querySelector('[data-voice-sim]').hidden = true;
      const rm = state.reduceMotion; const path = n.querySelector('path');
      if (rm) path.style.strokeDashoffset = 0; else { path.animate([{ strokeDashoffset: 186 }, { strokeDashoffset: 0 }], { duration: 520, easing: 'cubic-bezier(0.2,0,0,1)', fill: 'forwards' }); await wait(520); }
      haptic('success');
      n.querySelector('.complete__loop').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)', offset: .4 }, { transform: 'scale(1)' }], { duration: rm ? 1 : 260, easing: 'cubic-bezier(0.34,1.35,0.5,1)' });
      n.querySelector('[data-title]').animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, fill: 'forwards' });
      await wait(rm ? 0 : 120);
      n.querySelector('[data-sub]').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'forwards' });
      await wait(rm ? 0 : 500);
      n.querySelector('[data-ask]').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'forwards' });
      n.querySelector('[data-cta]').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'forwards' });
    });
    const home = () => go('memory', {}, { transition: 'fade', reset: true, replace: true });
    n.querySelector('[data-yes]').addEventListener('click', () => { haptic('selection'); DO.toast('Confirmed accurate · today', 1200); setTimeout(home, 900); });
    n.querySelector('[data-update]').addEventListener('click', () => { haptic('light'); go('teach', { object: DATA.byId(id).object }, { transition: 'zoom' }); });
    n.querySelector('[data-home]').addEventListener('click', () => { haptic('light'); home(); });
    return n;
  });
})();
