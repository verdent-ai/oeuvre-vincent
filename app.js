/* =========================================================
   OEUVRE — interaction layer
   ========================================================= */
(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const scroll      = $('#scroll');
  const scenes      = $$('.scene');
  const dotsWrap    = $('#dots');
  const counterNow  = $('#counterNow');
  const counterAll  = $('#counterAll');
  const progressBar = $('#progressBar');
  const painterCard = $('#painterCard');
  const counterEl   = $('.counter');
  const hint        = $('#hint');
  const loader      = $('#loader');

  /* ----------------- Loader ----------------- */
  loader.classList.add('loading');
  // Wait for the fold-visible images to be ready
  const firstImages = ['images/web/portrait_avatar.jpg', 'images/web/01_potato_eaters.jpg'];
  Promise.all(firstImages.map(src => new Promise(res => {
    const im = new Image(); im.onload = im.onerror = res; im.src = src;
  }))).then(() => {
    setTimeout(() => {
      loader.classList.add('done');
      painterCard.classList.add('show');
      counterEl.classList.add('show');
      dotsWrap.classList.add('show');
    }, 700);
  });

  /* ----------------- Counter & dots ----------------- */
  counterAll.textContent = String(scenes.length).padStart(2, '0');

  scenes.forEach((scene, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Go to scene ${i+1}`);
    b.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(b);
  });
  const dotButtons = $$('button', dotsWrap);

  function goTo(i) {
    scroll.scrollTo({ left: i * window.innerWidth, behavior: 'smooth' });
  }

  /* ----------------- Vertical wheel -> horizontal scroll ----------------- */
  // Trackpads send horizontal deltas natively; mouse wheel only sends vertical.
  // We translate vertical wheel to horizontal scroll, but leave native horizontal alone.
  let wheelLock = false;
  scroll.addEventListener('wheel', (e) => {
    // If user is producing real horizontal delta (trackpad swipe), let it through.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (wheelLock) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    const next = Math.min(scenes.length - 1, Math.max(0, currentIndex() + dir));
    goTo(next);
    wheelLock = true;
    setTimeout(() => { wheelLock = false; }, 650);
  }, { passive: false });

  /* ----------------- Keyboard ----------------- */
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault(); goTo(Math.min(scenes.length-1, currentIndex()+1));
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault(); goTo(Math.max(0, currentIndex()-1));
    } else if (e.key === 'Home') { goTo(0); }
    else if (e.key === 'End')   { goTo(scenes.length-1); }
  });

  /* ----------------- Touch swipe (vertical -> horizontal) ----------------- */
  let touchY = null;
  scroll.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, {passive:true});
  scroll.addEventListener('touchend',   e => {
    if (touchY == null) return;
    const dy = (e.changedTouches[0].clientY - touchY);
    if (Math.abs(dy) > 50) {
      goTo(Math.min(scenes.length-1, Math.max(0, currentIndex() + (dy < 0 ? 1 : -1))));
    }
    touchY = null;
  }, {passive:true});

  /* ----------------- Intro CTA ----------------- */
  const introCta = $('.intro-cta');
  if (introCta) introCta.addEventListener('click', () => goTo(1));

  /* ----------------- Scene tracking ----------------- */
  function currentIndex() {
    return Math.round(scroll.scrollLeft / window.innerWidth);
  }

  let lastActive = -1;
  function onScroll() {
    const total = (scenes.length - 1) * window.innerWidth;
    const pct   = total > 0 ? (scroll.scrollLeft / total) * 100 : 0;
    progressBar.style.width = pct + '%';

    const idx = currentIndex();
    if (idx !== lastActive) {
      scenes.forEach((s, i) => s.classList.toggle('active', i === idx));
      dotButtons.forEach((b, i) => b.setAttribute('aria-current', i === idx ? 'true' : 'false'));
      counterNow.textContent = String(idx + 1).padStart(2, '0');
      // hide hint after first move
      if (idx !== 0) hint.classList.add('gone');
      onSceneChange(idx, lastActive);
      lastActive = idx;
    }
  }
  scroll.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    // Re-snap to current scene on resize so we don't end up between frames.
    scroll.scrollLeft = lastActive * window.innerWidth;
  });

  /* ----------------- Typewriter ----------------- */
  const typers = new Map(); // index -> { node, raw, i, timer, done }

  function buildTyper(node) {
    const raw = node.dataset.text || '';
    return { node, raw, i: 0, timer: null, done: false };
  }
  scenes.forEach((s, i) => {
    const story = s.querySelector('.plate-story');
    if (story) typers.set(i, buildTyper(story));
  });

  function startTyper(idx) {
    const t = typers.get(idx);
    if (!t || t.done) return;
    if (t.i > 0) return; // already started
    const node = t.node;
    node.innerHTML = '<span class="cursor"></span>';
    const cursor = node.querySelector('.cursor');
    const tick = () => {
      if (t.i >= t.raw.length) {
        t.done = true;
        node.classList.add('done');
        return;
      }
      const ch = t.raw[t.i++];
      // Insert character before cursor
      cursor.insertAdjacentText('beforebegin', ch);
      // pacing
      let delay = 14 + Math.random() * 12;
      if (',;:'.includes(ch))   delay += 60;
      if ('.?!'.includes(ch))   delay += 180;
      if (ch === '\n')          delay += 120;
      t.timer = setTimeout(tick, delay);
    };
    tick();
  }

  function resetTyper(idx) {
    const t = typers.get(idx);
    if (!t) return;
    if (t.timer) clearTimeout(t.timer);
    t.i = 0; t.done = false;
    if (t.node) {
      t.node.classList.remove('done');
      t.node.textContent = '';
    }
  }

  function fastForward(idx) {
    const t = typers.get(idx);
    if (!t || t.done) return;
    if (t.timer) clearTimeout(t.timer);
    t.i = t.raw.length;
    t.done = true;
    t.node.textContent = t.raw;
    t.node.classList.add('done');
  }

  // click on a story panel to skip its typing
  scenes.forEach((s, i) => {
    const plate = s.querySelector('.plate');
    if (!plate) return;
    plate.addEventListener('click', () => fastForward(i));
  });

  function onSceneChange(idx, prev) {
    // Reset previous so re-entering replays the type
    if (prev >= 0 && prev !== idx) resetTyper(prev);
    // Slight delay so painting fade-in begins first
    setTimeout(() => startTyper(idx), 700);
  }

  /* initial activation */
  requestAnimationFrame(() => {
    scenes[0].classList.add('active');
    counterNow.textContent = '01';
    dotButtons[0].setAttribute('aria-current', 'true');
  });
})();
