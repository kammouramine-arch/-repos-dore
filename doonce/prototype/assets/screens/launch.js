// Launch, onboarding, authentication, first-use introduction.
(() => {
  const { register, go, el, t, haptic, wait, icons, state } = DO;
  const P = DATA.photos;
  const LOGO = 'M 21 51.5 C 27 53.5, 32.5 58.5, 37.6 64.4 A 26 26 0 1 0 32.4 35.0';

  // ---- 1. Launch: the logo forms (action → capture → memory) ----
  register('launch', ({ full = true }) => {
    const n = el(`<div class="launch">
      <svg class="launch__mark" viewBox="0 0 100 100" aria-label="DoOnce">
        <path class="echo" d="M 32.4 35.0 A 26 26 0 0 0 30.7 40.2" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" opacity="0"/>
        <path class="stroke" d="${LOGO}" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      </svg></div>`);
    let skipped = false;
    const finish = async () => {
      if (skipped) return; skipped = true;
      const next = state.onboarded ? 'memory' : 'onboarding';
      const mark = n.querySelector('.launch__mark');
      mark.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.6) translateY(-40px)', opacity: 0 }], { duration: DO.dur('standard'), easing: 'cubic-bezier(0.32,0.72,0,1)', fill: 'both' });
      await go(next, {}, { transition: 'fade', replace: true });
    };
    n.addEventListener('click', finish); // skip-safe
    n.addEventListener('screen:shown', async () => {
      const stroke = n.querySelector('.stroke'), echo = n.querySelector('.echo'), mark = n.querySelector('.launch__mark');
      const drawMs = state.reduceMotion ? 1 : (full ? 780 : 420);
      if (state.reduceMotion) { stroke.style.strokeDashoffset = 0; echo.style.opacity = .32; await wait(400); return finish(); }
      stroke.animate([{ strokeDashoffset: 186 }, { strokeDashoffset: 0 }], { duration: drawMs, easing: 'cubic-bezier(0.2,0,0,1)', fill: 'forwards' });
      await wait(drawMs);
      haptic('rigid');
      mark.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.035)', offset: .45 }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(0.34,1.35,0.5,1)' });
      n.style.background = 'var(--background-primary)';
      if (full) { await wait(40); echo.animate([{ opacity: 0 }, { opacity: .32 }], { duration: 320, fill: 'forwards' }); await wait(340); }
      else await wait(120);
      finish();
    });
    return n;
  });

  // ---- 2. Onboarding: an interactive product demo, four scenes + end ----
  register('onboarding', () => {
    const scenes = [
      { photo: P + 'espresso-kitchen-person.jpg', focus: '40% 50%', h: t('onboarding.1.headline'), s: t('onboarding.1.sub') },
      { photo: P + 'pipes-gauges.jpg', focus: '48% 42%', h: t('onboarding.2.headline'), s: t('onboarding.2.sub'), demo: 'teach' },
      { photo: P + 'pipes-gauges.jpg', focus: '48% 42%', h: t('onboarding.3.headline'), s: t('onboarding.3.sub'), demo: 'look' },
      { photo: P + 'pipes-gauges.jpg', focus: '30% 60%', h: t('onboarding.4.headline'), s: t('onboarding.4.sub'), demo: 'do' },
    ];
    const n = el(`<div class="ob" data-media="1">
      <div class="ob__pages">
        ${scenes.map((sc, i) => `<div class="ob__page" data-i="${i}">
          <div class="ob__photo"><img src="${sc.photo}" style="object-position:${sc.focus}" alt=""></div>
          <div class="ob__demo" data-demo="${sc.demo || ''}"></div>
          <div class="ob__text"><h1 class="ob__headline">${sc.h}</h1><p class="ob__sub">${sc.s}</p></div>
        </div>`).join('')}
        <div class="ob__page"><div class="ob__auth">
          <div class="mark" style="width:40px;height:40px;color:var(--text-primary);margin-bottom:auto;margin-top:70px">${icons.loop}</div>
          <h1 class="ob__headline">${t('onboarding.end.headline')}</h1>
          <button class="btn btn--primary btn--block" data-apple><svg class="icon" viewBox="0 0 24 24" style="fill:currentColor;stroke:none"><path d="M16.4 12.7c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.6-1-2.6-3.8zM14 5.6c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"/></svg>${t('auth.apple')}</button>
          <button class="btn btn--ghost btn--block" data-email>${t('auth.email')}</button>
          <p class="legal">${t('auth.legal')}</p>
        </div></div>
      </div>
      <div class="ob__foot">
        <div class="dots">${scenes.map((_, i) => `<i class="${i === 0 ? 'is-active' : ''}"></i>`).join('')}<i></i></div>
        <button class="btn btn--onmedia btn--small" data-next>${t('onboarding.continue')}</button>
      </div>
    </div>`);
    let i = 0;
    const pages = n.querySelector('.ob__pages');
    const show = idx => {
      i = Math.max(0, Math.min(scenes.length, idx));
      pages.style.transform = `translateX(-${i * 20}%)`;
      n.querySelectorAll('.dots i').forEach((d, k) => d.classList.toggle('is-active', k === i));
      const last = i === scenes.length;
      n.querySelector('[data-next]').style.opacity = last ? 0 : 1;
      n.querySelector('[data-next]').style.pointerEvents = last ? 'none' : '';
      DO.phone.classList.toggle('on-media', !last);
      if (i === 1) runTeachDemo(n.querySelector('[data-demo="teach"]'));
      if (i === 2) runLookDemo(n.querySelector('[data-demo="look"]'));
      if (i === 3) runDoDemo(n.querySelector('[data-demo="do"]'));
      // Parallax: headline 0.9×, photo 1.1× (subtle, ≤ 12 pt)
      if (!state.reduceMotion) n.querySelectorAll('.ob__page').forEach((p, k) => { const off = (k - i) * 12; p.querySelector('.ob__photo img')?.animate?.([{ transform: `translateX(${off * -1.1}px)` }], { duration: 620, fill: 'forwards', easing: 'cubic-bezier(0.32,0.72,0,1)' }); });
    };
    n.querySelector('[data-next]').addEventListener('click', () => { haptic('light'); show(i + 1); });
    let sx = 0;
    n.addEventListener('pointerdown', e => sx = e.clientX);
    n.addEventListener('pointerup', e => { const dx = e.clientX - sx; if (Math.abs(dx) > 50 && !e.target.closest('button')) { haptic('selection'); show(i + (dx < 0 ? 1 : -1)); } });
    n.querySelector('[data-apple]').addEventListener('click', async () => { haptic('light'); state.onboarded = true; await go('firstrun', {}, { transition: 'fade', replace: true }); });
    n.querySelector('[data-email]').addEventListener('click', async () => { haptic('light'); state.onboarded = true; await go('firstrun', {}, { transition: 'fade', replace: true }); });
    return n;

    // Scene 2 — live intelligence happening around the object
    async function runTeachDemo(host) {
      if (host.dataset.ran) return; host.dataset.ran = 1;
      host.innerHTML = `<div class="ob__frame"><i></i></div>
        <div class="transcript" style="bottom:auto;top:51%;font-size:16px;line-height:22px">Keep an eye on the gauge and stop when it reaches <mark>1.5 bar</mark>.</div>`;
      const chips = [['Valve', 24, 40], ['Pressure gauge', 56, 26], ['1.4 bar', 60, 36]];
      for (const [label, x, y] of chips) {
        const c = el(`<div class="observation" style="left:${x}%;top:${y}%"><i></i>${label}</div>`);
        host.appendChild(c);
        c.animate([{ opacity: 0, transform: 'translateY(6px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 220, fill: 'forwards', easing: 'cubic-bezier(0.2,0,0,1)' });
        await wait(state.reduceMotion ? 0 : 320);
      }
    }
    // Scene 3 — recognition, months later
    async function runLookDemo(host) {
      if (host.dataset.ran) return; host.dataset.ran = 1;
      const o = DATA.objects.boiler;
      const pill = el(`<div class="status-pill" style="position:absolute;left:50%;top:9%;transform:translateX(-50%)"><i></i>${t('look.looking')}</div>`); host.appendChild(pill);
      await DO.recognition(host, o, { scale: .8, offsetY: -8 });
      pill.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
      host.appendChild(el(`<div class="list" style="position:absolute;left:24px;right:24px;top:47%;padding:6px 0;background:var(--glass-on-media);backdrop-filter:blur(28px);color:var(--text-on-media)">
        ${['Repressurise', 'Restart', 'Emergency shutoff'].map(x => `<div class="row" style="padding:10px 16px;min-height:44px"><div class="row__body"><div class="row__title" style="color:inherit">${x}</div></div>${icons.chevron}</div>`).join('')}
      </div>`));
    }
    // Scene 4 — Do mode
    async function runDoDemo(host) {
      if (host.dataset.ran) return; host.dataset.ran = 1;
      host.innerHTML = `<div class="do-demo"><b>2 of 5</b><h3>Turn the left valve slowly.</h3><small>Julien showed you this · 18 March</small></div>`;
      host.firstElementChild.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, fill: 'forwards', easing: 'cubic-bezier(0.2,0,0,1)' });
    }
  });

  // ---- 3. Standalone auth (jump target) ----
  register('auth', () => {
    const n = el(`<div><div class="ob__auth">
      <div class="mark" style="width:40px;height:40px;color:var(--text-primary);margin-bottom:auto;margin-top:70px">${icons.loop}</div>
      <h1 class="ob__headline">${t('onboarding.end.headline')}</h1>
      <button class="btn btn--primary btn--block" data-apple>${t('auth.apple')}</button>
      <button class="btn btn--ghost btn--block" data-email>${t('auth.email')}</button>
      <p class="legal">${t('auth.legal')}</p></div></div>`);
    n.querySelector('[data-apple]').addEventListener('click', () => { haptic('light'); state.onboarded = true; go('firstrun', {}, { transition: 'fade', replace: true }); });
    return n;
  });

  // ---- 4. First-use introduction: a guided magical first task ----
  register('firstrun', () => {
    const examples = S => S;
    const n = el(`<div><div class="firstrun">
      <div class="mark" style="width:40px;height:40px;color:var(--text-primary);position:absolute;top:70px;left:28px">${icons.loop}</div>
      <h1 class="firstrun__title">${t('firstRun.title')}</h1>
      <p class="firstrun__sub">${t('firstRun.sub')}</p>
      <div class="firstrun__examples">${STRINGS.en['firstRun.examples'].map(x => `<span class="chip">${x}</span>`).join('')}</div>
      <div class="firstrun__foot">
        <button class="btn btn--signal btn--block" data-show>${icons.teach}${t('firstRun.cta')}</button>
        <button class="btn btn--ghost btn--block" data-later>${t('firstRun.later')}</button>
      </div></div></div>`);
    n.querySelector('.firstrun__examples').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) { haptic('selection'); n.querySelectorAll('.chip').forEach(x => x.classList.toggle('is-selected', x === c)); } });
    n.querySelector('[data-show]').addEventListener('click', () => { haptic('light'); go('permission', { kind: 'camera', then: 'teach' }, { transition: 'sheet' }); });
    n.querySelector('[data-later]').addEventListener('click', () => { haptic('light'); go('memory', { empty: true }, { transition: 'fade', replace: true }); });
    return n;
  });
})();
