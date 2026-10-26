import { chromium } from "file:///C:/Users/muman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.argv[2] || "http://127.0.0.1:48621/";
const browser = await chromium.launch({ headless: true });
const expectedProjects = [
  "Doxa Treasury",
  "Chromecraft Browser Website",
  "Sydney Bush Dances",
  "King Royalty Eggs",
];

const results = [];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function runScenario(name, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForSelector(".project-card");
  await page.waitForTimeout(300);

  const snapshot = await page.evaluate(() => ({
    docWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    projects: Array.from(document.querySelectorAll(".project-name"), (node) => node.textContent.trim()),
    imagesLoaded: Array.from(document.querySelectorAll(".project-card img"), (image) => image.complete && image.naturalWidth > 0),
    horizontalTrigger: Boolean(window.ScrollTrigger?.getById("portfolio-horizontal")),
    triggerEnd: window.ScrollTrigger?.getById("portfolio-horizontal")?.end ?? null,
    maxScroll: document.documentElement.scrollHeight - innerHeight,
    overflow: getComputedStyle(document.querySelector(".portfolio-viewport")).overflowX,
    stageDisplay: getComputedStyle(document.querySelector(".portfolio-stage")).display,
  }));

  assert(snapshot.docWidth === snapshot.clientWidth, `${name}: document has horizontal overflow`);
  assert(JSON.stringify(snapshot.projects) === JSON.stringify(expectedProjects), `${name}: project order changed`);
  assert(snapshot.imagesLoaded.every(Boolean), `${name}: one or more screenshots failed to load`);
  assert(errors.length === 0, `${name}: browser errors: ${errors.join(" | ")}`);

  if (viewport.width >= 768 && reducedMotion === "no-preference") {
    assert(snapshot.horizontalTrigger, `${name}: desktop ScrollTrigger was not created`);
    assert(snapshot.maxScroll > snapshot.triggerEnd, `${name}: pinned gallery cannot fully release`);
    const triggerRange = await page.evaluate(() => {
      const trigger = window.ScrollTrigger.getById("portfolio-horizontal");
      const viewport = document.querySelector(".portfolio-viewport");
      const track = document.querySelector(".portfolio-track");
      const thirdCard = document.querySelectorAll(".project-card")[2];
      const overflow = track.scrollWidth - viewport.clientWidth;
      const inset = Math.min(viewport.clientWidth * 0.035, 30);
      const thirdProgress = Math.max(0, Math.min(1, (thirdCard.offsetLeft - inset) / overflow)) * 0.86;
      return {
        start: trigger.start,
        end: trigger.end,
        thirdProgress,
        maxScroll: document.documentElement.scrollHeight - innerHeight,
      };
    });
    await page.evaluate(
      ({ start, end, thirdProgress }) =>
        window.scrollTo({ top: start + (end - start) * thirdProgress, behavior: "instant" }),
      triggerRange,
    );
    await page.waitForTimeout(1200);
    const forwardCount = await page.locator(".portfolio-count").innerText();
    const observed = await page.evaluate(() => {
      const trigger = window.ScrollTrigger.getById("portfolio-horizontal");
      return { progress: trigger.progress, start: trigger.start, end: trigger.end, scrollY: window.scrollY };
    });
    assert(
      forwardCount === "03 / 04",
      `${name}: forward scroll did not focus project 03 (got ${forwardCount}, trigger ${observed.progress.toFixed(3)}, target ${triggerRange.thirdProgress.toFixed(3)}, range ${observed.start.toFixed(0)}-${observed.end.toFixed(0)}, scroll ${observed.scrollY.toFixed(0)}, max ${triggerRange.maxScroll})`,
    );

    await page.evaluate(
      ({ start, end }) => window.scrollTo({ top: start + (end - start) * 0.05, behavior: "instant" }),
      triggerRange,
    );
    await page.waitForTimeout(900);
    const reverseCount = await page.locator(".portfolio-count").innerText();
    assert(reverseCount === "01 / 04", `${name}: reverse scroll did not return to project 01 (got ${reverseCount})`);

    const readTrackX = () =>
      page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".portfolio-track")).transform).m41);
    await page.evaluate(
      ({ start, end }) => window.scrollTo({ top: start + (end - start) * 0.9, behavior: "instant" }),
      triggerRange,
    );
    await page.waitForTimeout(900);
    const holdStartX = await readTrackX();
    const holdStartCount = await page.locator(".portfolio-count").innerText();

    await page.evaluate(
      ({ start, end }) => window.scrollTo({ top: start + (end - start) * 0.98, behavior: "instant" }),
      triggerRange,
    );
    await page.waitForTimeout(900);
    const holdEndX = await readTrackX();
    const holdEndCount = await page.locator(".portfolio-count").innerText();
    assert(holdStartCount === "04 / 04" && holdEndCount === "04 / 04", `${name}: final project hold is not active`);
    assert(Math.abs(holdStartX - holdEndX) < 1, `${name}: track keeps moving during the final hold`);

    await page.evaluate(({ end }) => window.scrollTo({ top: end + 10, behavior: "instant" }), triggerRange);
    await page.waitForTimeout(300);
    const stagePosition = await page.locator(".portfolio-stage").evaluate((element) => getComputedStyle(element).position);
    assert(stagePosition !== "fixed", `${name}: pinned gallery did not release after its end`);
  } else {
    assert(!snapshot.horizontalTrigger, `${name}: pinned ScrollTrigger should be disabled`);
    assert(snapshot.overflow === "auto", `${name}: fallback gallery must remain horizontally scrollable`);
  }

  results.push({ name, ...snapshot });
  await context.close();
}

try {
  await runScenario("desktop", { width: 1440, height: 900 });
  await runScenario("tablet", { width: 1024, height: 768 });
  await runScenario("mobile", { width: 390, height: 844 });
  await runScenario("reduced-motion", { width: 1440, height: 900 }, "reduce");
  console.log(JSON.stringify({ ok: true, results }, null, 2));
} finally {
  await browser.close();
}
