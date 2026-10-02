(() => {
  const stage = document.getElementById('stage');
  const media = document.getElementById('media');
  const hero = document.getElementById('hero');
  const problems = document.getElementById('problems');
  const slot = document.getElementById('videoSlot');
  const nav = document.getElementById('nav');
  const video = document.getElementById('heroVideo');
  const artboard = document.getElementById('artboard');
  const cards = [...problems.querySelectorAll('.card')];
  const targetCard = slot.closest('.card');
  const targetBody = targetCard.querySelector('.card__body');
  const statement = problems.querySelector('.statement');
  const veil = document.getElementById('veil');
  const ctas = hero.querySelector('.hero__ctas');

  // Where the people sit in assets/hero.mp4 (1280x1060, wall extended upward),
  // as fractions of the frame height
  const VIDEO_ASPECT = 1280 / 1060;
  const HEADS = 0.675;
  const FEET = 0.93;

  // Wrap each word of the statement so it can be revealed on its own
  const words = [];
  statement.querySelectorAll('p').forEach(para => {
    const frag = document.createDocumentFragment();
    para.textContent.trim().split(/\s+/).forEach((word, i) => {
      if (i) frag.append(' ');
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = word;
      span.style.setProperty('--i', words.length);
      frag.append(span);
      words.push(span);
    });
    para.replaceChildren(frag);
  });

  // Fit the 1440x1024 Figma artboard to the viewport (CSS stacks it on phones)
  let boardScale = 1;
  const fit = () => {
    boardScale = Math.min(innerWidth / 1440, innerHeight / 1024);
    artboard.style.setProperty('--s', boardScale.toFixed(4));
  };
  fit();
  window.addEventListener('resize', fit);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Some mobile browsers ignore autoplay until nudged
  video.play?.().catch(() => {});

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, start, end) => clamp((p - start) / (end - start));
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  // Choreography, as fractions of the stage's scroll distance
  const T = {
    video:   [0.04, 0.60], // full-bleed -> card thumbnail
    heroOut: [0.00, 0.26], // hero copy + top blur fade away
    sceneIn: [0.10, 0.46], // section two cards blur in
    label:   [0.52, 0.64], // the landed card's label appears
  };

  let ticking = false;
  let lastDrift = 0;
  let baseW = 0, baseH = 0; // the footage's laid-out size; only changes on resize

  function render() {
    ticking = false;

    // ---- Read everything first (no layout is dirty yet) ----
    const vh = window.innerHeight;
    const vw = document.documentElement.clientWidth;
    const track = stage.offsetHeight - vh;
    const p = clamp(-stage.getBoundingClientRect().top / track);
    const slotRect = slot.getBoundingClientRect();
    const ctaBottom = ctas.offsetTop + ctas.offsetHeight;
    const phone = vw <= 760;

    // Cards drift sideways for the whole run, like the reference
    // (artboard pixels on desktop, so it scales with the layout)
    const drift = (p - 0.6) * (phone ? 36 : 110);
    // The slot moves with its card; account for this frame's drift without
    // measuring again after writing
    const slotShift = (drift - lastDrift) * Number(targetCard.dataset.drift) * (phone ? 1 : boardScale);
    const r = { left: slotRect.left + slotShift, top: slotRect.top, width: slotRect.width, height: slotRect.height };
    lastDrift = drift;

    // ---- Then write: transforms, opacity, filters, clip only ----
    cards.forEach(card => {
      card.style.translate = `${drift * Number(card.dataset.drift)}px 0`;
    });

    // Hero copy: blur + fade + lift
    const h = easeOut(range(p, ...T.heroOut));
    hero.style.opacity = 1 - h;
    hero.style.filter = h > 0.001 ? `blur(${(h * 10).toFixed(2)}px)` : 'none';
    hero.style.transform = `translate3d(0,${-h * 40}px,0)`;
    hero.style.visibility = h >= 1 ? 'hidden' : 'visible';
    veil.style.opacity = 1 - h;

    // Section two: everything except the landing card blurs in
    const s = easeOut(range(p, ...T.sceneIn));
    const blur = (1 - s) * 16;
    cards.forEach(el => {
      if (el === targetCard) return;
      el.style.opacity = s;
      el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
    });
    problems.classList.toggle('is-live', s > 0.9);

    // Statement: once section two is in view the words play their reveal
    // (time-based CSS transition, not tied to scroll); resets back at the hero
    statement.style.opacity = s;
    if (s > 0.6) statement.classList.add('is-revealed');
    else if (s < 0.05) statement.classList.remove('is-revealed');

    const l = easeOut(range(p, ...T.label));
    targetBody.style.opacity = l;
    targetBody.style.transform = `translate3d(${(1 - l) * -10}px,0,0)`;

    // Video: the visible box interpolates from the viewport to the slot
    const v = easeInOut(range(p, ...T.video));
    const boxL = lerp(0, r.left, v);
    const boxT = lerp(0, r.top, v);
    const boxW = lerp(vw, r.width, v);
    const boxH = lerp(vh, r.height, v);
    const radius = lerp(0, 4, v);
    media.style.clipPath =
      `inset(${boxT.toFixed(2)}px ${(vw - boxL - boxW).toFixed(2)}px ${(vh - boxT - boxH).toFixed(2)}px ${boxL.toFixed(2)}px round ${radius.toFixed(2)}px)`;

    // Footage framing inside that box.
    // Hero: cover the viewport with the people's heads below the buttons and
    // their feet just above the bottom edge, like the Figma frame.
    const H0 = Math.max(vh, vw / VIDEO_ASPECT);
    const W0 = H0 * VIDEO_ASPECT;
    const wanted = Math.max(
      vh - vh * 0.035 - FEET * H0,                     // feet ~3.5% above the bottom
      ctaBottom + Math.max(32, vh * 0.05) - HEADS * H0 // heads clear of the buttons
    );
    // (may sit a few px below the top on phones; that strip is under the wash)
    const T0 = clamp(wanted, vh - H0, vh - FEET * H0 - 8);
    // Thumbnail: framed tight on the couch like the Figma card image.
    // In between, interpolate relative to the box (footage height as a multiple
    // of the box, and where the feet sit) so the people stay in frame.
    const scale0 = H0 / vh, scale1 = 2.4;
    const feet0 = (T0 + FEET * H0) / vh, feet1 = 0.94;
    const vH = Math.max(boxH * lerp(scale0, scale1, v), boxW / VIDEO_ASPECT);
    const vW = vH * VIDEO_ASPECT;

    // Lay the footage out once at hero size, then only scale/translate it
    if (Math.abs(baseW - W0) > 0.5 || Math.abs(baseH - H0) > 0.5) {
      baseW = W0; baseH = H0;
      video.style.width = `${W0}px`;
      video.style.height = `${H0}px`;
    }
    const x = boxL + (boxW - vW) / 2;
    const y = boxT + boxH * lerp(feet0, feet1, v) - FEET * vH;
    video.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${(vW / baseW).toFixed(5)})`;

    nav.classList.toggle('is-solid', p > 0.2 || window.scrollY > stage.offsetTop + track);
  }

  const request = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  };

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  document.fonts?.ready.then(request);
  render();
})();
