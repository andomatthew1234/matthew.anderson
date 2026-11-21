(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const reveals = [...document.querySelectorAll('[data-app-reveal]')];
  if (!motion.matches && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('app-motion');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    reveals.forEach(node => observer.observe(node));
  }

  const gallery = document.querySelector('[data-app-gallery]');
  const rail = gallery?.querySelector('[data-gallery-rail]');
  if (!rail) return;
  const originals = [...rail.querySelectorAll('.app-slide')];
  const count = originals.length;
  // Duplicate only the visual rail; assistive technology still receives seven concepts.
  const copies = () => originals.map(slide => {
    const clone = slide.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.removeAttribute('aria-label');
    clone.removeAttribute('aria-roledescription');
    clone.removeAttribute('role');
    return clone;
  });
  rail.prepend(...copies());
  rail.append(...copies());
  const slides = [...rail.querySelectorAll('.app-slide')];
  const pause = gallery.querySelector('[data-gallery-pause]');
  const position = gallery.querySelector('[data-gallery-position]');
  const announcement = gallery.querySelector('[data-gallery-announcement]');
  let active = count;
  let centers = [];
  let timer;
  let scrollFrame;
  let settleTimer;
  let measuring = false;
  let measureFrame;
  let inView = false;
  let hovering = false;
  let userPaused = motion.matches;

  const stop = () => { clearTimeout(timer); timer = undefined; };
  const updatePause = () => {
    pause.textContent = userPaused ? 'Play' : 'Pause';
    pause.setAttribute('aria-label', userPaused ? 'Start automatic gallery movement' : 'Pause automatic gallery movement');
  };
  const announce = () => { announcement.textContent = `${active % count + 1} of ${count}: ${slides[active].querySelector('figcaption').textContent}`; };
  const select = index => {
    active = index;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
      slide.dataset.side = i < index ? 'left' : 'right';
    });
    position.textContent = String(index % count + 1).padStart(2, '0');
  };
  const measure = () => {
    measuring = true;
    clearTimeout(settleTimer);
    cancelAnimationFrame(scrollFrame);
    scrollFrame = undefined;
    const railRect = rail.getBoundingClientRect();
    centers = slides.map(slide => {
      const rect = slide.getBoundingClientRect();
      return rect.left - railRect.left + rail.scrollLeft + rect.width / 2;
    });
    rail.scrollTo({ left: centers[active] - rail.clientWidth / 2, behavior: 'instant' });
    cancelAnimationFrame(measureFrame);
    measureFrame = requestAnimationFrame(() => {
      measureFrame = requestAnimationFrame(() => { measuring = false; });
    });
  };
  const go = (index, manual = false) => {
    const next = (index + slides.length) % slides.length;
    select(next);
    rail.scrollTo({ left: centers[next] - rail.clientWidth / 2, behavior: motion.matches ? 'instant' : 'smooth' });
    if (manual) announce();
  };
  const recenter = () => {
    if (active >= count && active < count * 2) return;
    rail.classList.add('is-recentering');
    select(count + active % count);
    // The matching middle copy has identical neighbours, making the loop invisible.
    rail.scrollTo({ left: centers[active] - rail.clientWidth / 2, behavior: 'instant' });
    requestAnimationFrame(() => requestAnimationFrame(() => rail.classList.remove('is-recentering')));
  };
  const schedule = () => {
    stop();
    if (!inView || hovering || userPaused || document.hidden) return;
    timer = setTimeout(() => { go(active + 1); schedule(); }, 4800);
  };
  const pauseForInteraction = () => { userPaused = true; stop(); updatePause(); };
  gallery.querySelector('[data-carousel-controls]').hidden = false;
  gallery.querySelector('[data-gallery-previous]').addEventListener('click', () => { pauseForInteraction(); go(active - 1, true); });
  gallery.querySelector('[data-gallery-next]').addEventListener('click', () => { pauseForInteraction(); go(active + 1, true); });
  pause.addEventListener('click', () => { userPaused = !userPaused; updatePause(); schedule(); });
  rail.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    pauseForInteraction();
    go(event.key === 'Home' ? count : event.key === 'End' ? count * 2 - 1 : active + (event.key === 'ArrowRight' ? 1 : -1), true);
  });
  rail.addEventListener('pointerdown', pauseForInteraction, { passive: true });
  rail.addEventListener('wheel', pauseForInteraction, { passive: true });
  gallery.addEventListener('focusin', event => { if (event.target !== pause) pauseForInteraction(); });
  rail.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovering = true; stop(); } });
  rail.addEventListener('pointerleave', () => { hovering = false; schedule(); });
  rail.addEventListener('scroll', () => {
    if (measuring) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(recenter, 180);
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = undefined;
      if (measuring) return;
      const center = rail.scrollLeft + rail.clientWidth / 2;
      const nearest = centers.reduce((best, value, i) => Math.abs(value - center) < Math.abs(centers[best] - center) ? i : best, 0);
      if (nearest !== active) select(nearest);
    });
  }, { passive: true });
  const resize = new ResizeObserver(measure);
  resize.observe(rail);
  // Resize can dispatch scroll before ResizeObserver; hold selection until remeasured.
  window.addEventListener('resize', measure, { passive: true });
  const visibility = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; schedule(); }, { threshold: .25 });
  visibility.observe(rail);
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => { userPaused = true; stop(); updatePause(); });
  window.addEventListener('pagehide', () => { stop(); clearTimeout(settleTimer); cancelAnimationFrame(scrollFrame); cancelAnimationFrame(measureFrame); });
  window.addEventListener('pageshow', schedule);
  select(count);
  updatePause();
  measure();
})();
