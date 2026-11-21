import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'file:///C:/Users/muman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const root = new URL(process.argv[2] || 'http://127.0.0.1:48621/dist/');
const browser = await chromium.launch();
const waitForSlide = async (page, number) => {
  await page.waitForFunction(n => {
    const rail = document.querySelector('[data-gallery-rail]');
    const slide = rail.querySelector('.is-active');
    const a = rail.getBoundingClientRect();
    const b = slide.getBoundingClientRect();
    return document.querySelector('[data-gallery-position]').textContent === String(n).padStart(2, '0') && Math.abs(a.left + a.width / 2 - b.left - b.width / 2) < 2;
  }, number, { timeout: 8000 });
};
try {
  for (const width of [320, 390, 820, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
    await page.goto(new URL('apps/', root).href, { waitUntil: 'networkidle' });
    await page.locator('[data-gallery-rail]').scrollIntoViewIfNeeded();
    await waitForSlide(page, 1);
    assert.equal(await page.locator('.app-slide:not([aria-hidden])').count(), 7, 'Screen readers should receive seven slides');
    assert.equal(await page.locator('[data-gallery-pause]').textContent(), 'Play', 'Reduced motion must start paused');
    await page.locator('[data-gallery-previous]').first().click();
    await waitForSlide(page, 7);
    await page.waitForTimeout(250);
    await page.locator('[data-gallery-next]').first().click();
    await waitForSlide(page, 1);
    await page.locator('[data-gallery-rail]').focus();
    await page.keyboard.press('End');
    await waitForSlide(page, 7);
    await page.keyboard.press('Home');
    await waitForSlide(page, 1);
    await page.keyboard.press('ArrowRight');
    await waitForSlide(page, 2);
    const snapshot = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      ids: [...document.querySelectorAll('[id]')].map(el => el.id),
      hidden: [...document.querySelectorAll('[data-app-reveal]')].some(el => getComputedStyle(el).opacity !== '1'),
      mail: [...document.querySelectorAll('.app-closing a')].map(a => a.getAttribute('href')),
      controls: [...document.querySelectorAll('[data-carousel-controls] button')].every(el => el.getBoundingClientRect().height >= 44),
    }));
    assert.equal(snapshot.overflow, false, `Overflow at ${width}`);
    assert.equal(snapshot.ids.length, new Set(snapshot.ids).size);
    assert.equal(snapshot.hidden, false);
    assert.equal(snapshot.controls, true);
    const email = new URL(snapshot.mail[0]);
    assert.equal(email.pathname, 'matthew@andomail.com');
    assert(email.searchParams.get('body').includes('My idea:'));
    assert.equal(snapshot.mail[1], 'mailto:matthew@andomail.com');
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS layout, loop, keyboard, reduced motion and email: ${width}px`);
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(new URL('apps/', root).href, { waitUntil: 'networkidle' });
  await page.locator('[data-gallery-rail]').scrollIntoViewIfNeeded();
  const scrollPosition = () => page.locator('[data-gallery-rail]').evaluate(el => el.scrollLeft);
  const start = await scrollPosition();
  await page.waitForTimeout(1500);
  const afterGlide = await scrollPosition();
  assert(afterGlide - start > 20 && afterGlide - start < 65, 'Automatic motion should glide slowly to the right');
  await page.locator('[data-gallery-pause]').click();
  await page.waitForTimeout(600);
  const paused = await scrollPosition();
  await page.waitForTimeout(1500);
  assert.equal(await scrollPosition(), paused, 'Pause must stop automatic movement');
  await page.locator('[data-gallery-next]').last().click();
  await waitForSlide(page, 2);
  assert.equal(await page.locator('[data-carousel-cue]').isVisible(), true);
  await page.locator('[data-gallery-rail]').focus();
  await page.keyboard.press('End');
  await waitForSlide(page, 7);
  await page.locator('[data-gallery-next]').first().click();
  await waitForSlide(page, 1);
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 390, height: 844 });
  await waitForSlide(page, 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.close();
  console.log('PASS continuous slow scrolling, pause, bottom navigation, animated wrap and viewport resize');

  const fallback = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await fallback.goto(new URL('apps/', root).href, { waitUntil: 'networkidle' });
  assert.equal(await fallback.locator('.app-slide').count(), 7);
  assert.equal(await fallback.locator('[data-carousel-controls]').isVisible(), false);
  assert.equal(await fallback.locator('.app-closing a').count(), 2);
  assert.equal(await fallback.locator('.editorial-footer').count(), 1, 'Built page must retain footer without JavaScript');
  await fallback.close();
  const home = await browser.newPage();
  await home.goto(root.href, { waitUntil: 'domcontentloaded' });
  assert.equal(await home.locator('.dream-grid-link', { hasText: 'Apps' }).getAttribute('href'), './apps/');
  await home.close();
  console.log('PASS static fallback and homepage Apps link');
} finally {
  await browser.close();
}
