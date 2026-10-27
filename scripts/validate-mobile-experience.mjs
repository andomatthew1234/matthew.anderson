import { chromium } from "file:///C:/Users/muman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const roots = process.argv.slice(2).length
  ? process.argv.slice(2).map((value) => new URL(value))
  : [new URL("http://127.0.0.1:48621/"), new URL("http://127.0.0.1:48621/dist/")];
const widths = [320, 360, 375, 390, 430, 768, 820, 1024, 1180, 1440];
const routes = ["", "build-your-site/", "quote-viewer/", "terms/"];
const browser = await chromium.launch({ headless: true });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function open(root, route, width, options = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, ...options });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const response = await page.goto(new URL(route, root).href, { waitUntil: "domcontentloaded" });
  assert(response?.ok(), `${root.pathname}${route} ${width}: HTTP ${response?.status()}`);
  await page.waitForTimeout(100);
  return { context, page, errors, requests };
}

async function assertGeneric(root, route, width) {
  const { context, page, errors } = await open(root, route, width);
  const result = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    viewport: document.querySelector('meta[name="viewport"]')?.content || "",
    duplicateIds: [...document.querySelectorAll("[id]")].map((node) => node.id).filter((id, index, ids) => ids.indexOf(id) !== index),
  }));
  assert(result.documentWidth <= result.viewportWidth, `${root.pathname}${route} ${width}: horizontal overflow ${result.documentWidth}/${result.viewportWidth}`);
  assert(result.viewport.includes("width=device-width") && !/maximum-scale|user-scalable\s*=\s*no/i.test(result.viewport), `${root.pathname}${route}: inaccessible viewport meta`);
  assert(result.duplicateIds.length === 0, `${root.pathname}${route}: duplicate IDs ${result.duplicateIds.join(", ")}`);
  assert(errors.length === 0, `${root.pathname}${route} ${width}: ${errors.join(" | ")}`);
  await context.close();
}

async function assertNavigation(root, width) {
  const { context, page } = await open(root, "", width);
  const trigger = page.locator(".mobile-nav__trigger");
  if (width <= 900) {
    assert(await trigger.isVisible(), `${root.pathname} ${width}: mobile menu trigger missing`);
    const box = await trigger.boundingBox();
    assert(box.width >= 44 && box.height >= 44, `${root.pathname} ${width}: menu trigger is too small`);
    await trigger.click();
    assert(await page.locator(".mobile-nav__panel[data-open='true']").isVisible(), `${root.pathname} ${width}: menu did not open`);
    assert(await page.evaluate(() => document.documentElement.classList.contains("mobile-menu-open")), `${root.pathname} ${width}: menu did not lock scrolling`);
    await page.keyboard.press("Escape");
    assert(await trigger.getAttribute("aria-expanded") === "false", `${root.pathname} ${width}: Escape did not close menu`);
    assert(await trigger.evaluate((node) => document.activeElement === node), `${root.pathname} ${width}: focus did not return to menu trigger`);
  } else {
    assert(!(await trigger.isVisible()), `${root.pathname} ${width}: mobile trigger visible on desktop`);
    assert(await page.locator(".nav-links").isVisible(), `${root.pathname} ${width}: desktop navigation hidden`);
  }
  await context.close();
}

async function assertHomepage(root, width) {
  const { context, page } = await open(root, "", width);
  if (width <= 360) {
    const title = await page.locator(".title-mask:first-child .title-line").evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      parent: node.parentElement.getBoundingClientRect().width,
      whiteSpace: getComputedStyle(node).whiteSpace,
    }));
    assert(title.whiteSpace === "nowrap" && title.width <= title.parent + 1, `${root.pathname} ${width}: hero title is clipped or wraps awkwardly`);
  }
  if (width <= 900) {
    const gallery = await page.locator(".portfolio-viewport").evaluate((node) => ({
      overflow: getComputedStyle(node).overflowX,
      snap: getComputedStyle(node).scrollSnapType,
      card: node.querySelector(".project-card").getBoundingClientRect().width,
      width: node.getBoundingClientRect().width,
      trigger: Boolean(window.ScrollTrigger?.getById("portfolio-horizontal")),
    }));
    assert(gallery.overflow === "auto" && gallery.snap.startsWith("x") && !gallery.trigger, `${root.pathname} ${width}: gallery is not touch-native`);
    assert(gallery.card < gallery.width * 0.92, `${root.pathname} ${width}: next project does not peek into view`);
    await page.locator(".portfolio-arrow--next").click();
    await page.waitForTimeout(500);
    assert((await page.locator(".portfolio-count").textContent()).trim() === "02 / 04", `${root.pathname} ${width}: gallery controls did not sync`);
  }
  await context.close();
}

async function assertConfigurator(root, width) {
  const { context, page, requests } = await open(root, "build-your-site/", width);
  await page.waitForTimeout(250);
  const layout = await page.evaluate(() => {
    const group = document.querySelector(".config-group");
    const children = [...group.children];
    const index = (selector) => children.findIndex((node) => node.matches(selector));
    const bar = document.querySelector(".estimate-bar").getBoundingClientRect();
    return {
      order: [index("h3"), children.findIndex((node) => node.tagName === "P"), index(".mobile-visual"), index(".option-stack")],
      visualColumn: document.querySelector(".visual-column").checkVisibility(),
      mobileVisual: document.querySelector(".config-group .mobile-visual").checkVisibility(),
      barPosition: getComputedStyle(document.querySelector(".estimate-bar")).position,
      barBottom: Math.round(innerHeight - bar.bottom),
      barHeight: Math.round(bar.height),
      comparisonHeight: document.querySelector(".comparison summary").getBoundingClientRect().height,
      codeFont: parseFloat(getComputedStyle(document.querySelector(".recovery-panel textarea")).fontSize),
      pageColumns: getComputedStyle(document.querySelector(".page-grid")).gridTemplateColumns.split(" ").length,
    };
  });
  assert(layout.barPosition === "fixed" && Math.abs(layout.barBottom) <= 1, `${root.pathname} ${width}: estimate bar is not fixed to viewport`);
  assert(layout.comparisonHeight >= 44, `${root.pathname} ${width}: comparison target below 44px`);
  if (width <= 700) {
    assert(layout.order.every((value, index, values) => index === 0 || value > values[index - 1]), `${root.pathname} ${width}: mobile feature order is incorrect (${layout.order})`);
    assert(!layout.visualColumn && layout.mobileVisual, `${root.pathname} ${width}: wrong phone image layout`);
    assert(layout.barHeight <= 96, `${root.pathname} ${width}: mobile estimate bar is ${layout.barHeight}px tall`);
    assert(layout.codeFont >= 16, `${root.pathname} ${width}: quote-code field can trigger iOS zoom`);
    assert(layout.pageColumns === 1, `${root.pathname} ${width}: phone page grid is cramped`);
  } else if (width <= 820) {
    assert(layout.visualColumn && !layout.mobileVisual, `${root.pathname} ${width}: tablet should retain sticky preview`);
  }
  const row = page.locator('label.option-row:has([data-tier="payments"][value="links"])');
  const rowBox = await row.boundingBox();
  assert(rowBox.height >= 44, `${root.pathname} ${width}: option target below 44px`);
  await row.click();
  assert(await row.locator("input").isChecked(), `${root.pathname} ${width}: whole-row tap failed`);
  const requestedImages = requests.filter((url) => /preview\.webp/.test(url));
  if (width <= 700) assert(requestedImages.length <= 4, `${root.pathname} ${width}: eagerly requested ${requestedImages.length} preview images`);
  await context.close();
}

async function assertMobileQuoteShare(root) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__shareCalls = [];
    navigator.share = async (payload) => { window.__shareCalls.push(payload); };
  });
  await page.goto(new URL("build-your-site/", root).href, { waitUntil: "domcontentloaded" });
  await page.locator("[data-generate]").click();
  await page.waitForSelector("#generated-quote", { timeout: 3_500 });
  const share = page.locator("[data-share]");
  assert(await share.isVisible(), `${root.pathname}: native share action was not exposed when supported`);
  await share.click();
  assert(await page.evaluate(() => window.__shareCalls.length === 1 && window.__shareCalls[0].text.includes("INDICATIVE ESTIMATE")), `${root.pathname}: native share received the wrong estimate`);
  await context.close();
}

try {
  for (const root of roots) {
    for (const width of widths) {
      for (const route of routes) await assertGeneric(root, route, width);
      await assertNavigation(root, width);
      await assertHomepage(root, width);
      await assertConfigurator(root, width);
      process.stdout.write(`PASS ${root.pathname} ${width}px\n`);
    }

    const noJs = await open(root, "", 390, { javaScriptEnabled: false });
    assert(await noJs.page.locator(".nav-links").isVisible(), `${root.pathname}: no-JavaScript navigation disappeared`);
    await noJs.context.close();

    const reduced = await open(root, "", 390, { reducedMotion: "reduce" });
    const transition = await reduced.page.locator(".mobile-nav__panel").evaluate((node) => getComputedStyle(node).transitionDuration);
    assert(transition.split(",").every((value) => parseFloat(value) <= 0.001), `${root.pathname}: mobile menu ignores reduced motion`);
    await reduced.context.close();
    await assertMobileQuoteShare(root);
  }
  console.log("Mobile/tablet experience validation passed.");
} finally {
  await browser.close();
}
