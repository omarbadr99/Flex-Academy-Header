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

  // Wrap each word of the statement so it can be revealed on its own
  const words = [];
  statement.querySelectorAll('p').forEach(para => {
    const frag = document.createDocumentFragment();
    para.textContent.trim().split(/\s+/).forEach((word, i) => {
      if (i) frag.append(' ');
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = word;
      frag.append(span);
      words.push(span);
    });
    para.replaceChildren(frag);
  });

  // Fit the 1440x1024 Figma artboard to the viewport (CSS stacks it on phones)
  const fit = () => {
    const s = Math.min(innerWidth / 1440, innerHeight / 1024);
    artboard.style.setProperty('--s', s.toFixed(4));
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
    words:   [0.18, 0.88], // statement resolves word by word
    label:   [0.52, 0.64], // the landed card's label appears
  };
  const WORD_SPAN = 0.14; // share of the words range each word takes to resolve

  let ticking = false;

  function render() {
    ticking = false;
    const vh = window.innerHeight;
    const vw = document.documentElement.clientWidth;
    const track = stage.offsetHeight - vh;
    const p = clamp(-stage.getBoundingClientRect().top / track);

    // Cards drift sideways for the whole run, like the reference
    // (artboard pixels, so it scales with the layout)
    const drift = (p - 0.6) * (vw <= 760 ? 36 : 110);
    cards.forEach(card => {
      card.style.translate = `${drift * Number(card.dataset.drift)}px 0`;
    });

    // Hero copy: blur + fade + lift
    const h = easeOut(range(p, ...T.heroOut));
    hero.style.opacity = 1 - h;
    hero.style.filter = h > 0 ? `blur(${h * 14}px)` : 'none';
    hero.style.transform = `translate3d(0,${-h * 40}px,0)`;
    hero.style.visibility = h >= 1 ? 'hidden' : 'visible';
    veil.style.setProperty('--veil', (1 - h).toFixed(3));

    // Section two: everything except the landing card blurs in
    const s = easeOut(range(p, ...T.sceneIn));
    const blur = (1 - s) * 16;
    cards.filter(c => c !== targetCard).forEach(el => {
      el.style.opacity = s;
      el.style.filter = blur > 0.05 ? `blur(${blur}px)` : 'none';
    });
    problems.classList.toggle('is-live', s > 0.9);

    // Statement: each word goes from a faint blur to crisp, in reading order
    const u = range(p, ...T.words);
    const n = words.length;
    words.forEach((w, i) => {
      const start = (i / Math.max(1, n - 1)) * (1 - WORD_SPAN);
      const t = easeOut(clamp((u - start) / WORD_SPAN));
      w.style.opacity = (lerp(0.12, 1, t) * s).toFixed(3);
      w.style.filter = t < 1 ? `blur(${((1 - t) * 8).toFixed(2)}px)` : 'none';
      w.style.transform = t < 1 ? `translate3d(0,${((1 - t) * 0.25).toFixed(3)}em,0)` : 'none';
    });

    const l = easeOut(range(p, ...T.label));
    targetBody.style.opacity = l;
    targetBody.style.transform = `translate3d(${(1 - l) * -10}px,0,0)`;

    // Video: interpolate its box from the viewport to the slot (measured live,
    // so it stays locked on while the row drifts)
    const v = easeInOut(range(p, ...T.video));
    const r = slot.getBoundingClientRect();
    media.style.left = `${lerp(0, r.left, v)}px`;
    media.style.top = `${lerp(0, r.top, v)}px`;
    media.style.width = `${lerp(vw, r.width, v)}px`;
    media.style.height = `${lerp(vh, r.height, v)}px`;
    media.style.borderRadius = `${lerp(0, 4, v)}px`;
    // Hero framing matches Figma (1.19x, centred); the thumbnail is framed
    // tighter on the couch like the Figma card image
    media.style.setProperty('--zoom', lerp(1.19, 1.55, v).toFixed(4));
    media.style.setProperty('--origin-y', `${lerp(50, 82, v).toFixed(2)}%`);

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
