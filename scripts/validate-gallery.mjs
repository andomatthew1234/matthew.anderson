import { chromium } from "file:///C:/Users/muman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.argv[2] || "http://127.0.0.1:48621/websites/";
const browser = await chromium.launch({ headless: true });
const expected = [
  { name: "Doxa Treasury", category: "Church history collection", url: "https://doxatreasury.com/", image: "doxa-treasury.webp" },
  { name: "Chromecraft Browser Website", category: "Browser product website", url: "https://andomatthew1234.github.io/Chromecraft", image: "chromecraft.webp" },
  { name: "Sydney Bush Dances", category: "Community & events", url: "https://sydneybushdances.com/", image: "sydney-bush-dances.webp" },
  { name: "King Royalty Eggs", category: "Farm & produce", url: "https://kingroyaltyeggs.com/", image: "king-royalty-eggs.jpg" },
];
const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function waitForPreview(page, name, imageName) {
  await page.waitForFunction(
    ({ expectedName, expectedImage }) => {
      const image = document.querySelector("[data-project-image]");
      return document.querySelector("[data-project-name]")?.textContent.trim() === expectedName && image?.src.includes(expectedImage) && image.complete && image.naturalWidth > 0;
    },
    { expectedName: name, expectedImage: imageName },
    { timeout: 5_000 },
  );
}

async function runScenario(name, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const response = await page.goto(baseUrl, { waitUntil: "load" });
  assert(response?.ok(), `${name}: HTTP ${response?.status()}`);
  await page.waitForSelector(".project-index__item");
  await waitForPreview(page, expected[0].name, expected[0].image);

  const initial = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    items: [...document.querySelectorAll(".project-index__item strong")].map((node) => node.textContent.trim()),
    cards: [...document.querySelectorAll(".why-card")].map((card) => {
      const rect = card.getBoundingClientRect();
      const facesFit = [...card.querySelectorAll(".why-card__face")].every((face) => face.scrollHeight <= face.clientHeight + 1);
      return { width: rect.width, height: rect.height, scrollHeight: card.scrollHeight, facesFit };
    }),
    previewPosition: getComputedStyle(document.querySelector(".project-index__preview")).position,
    scrollTrigger: Boolean(window.ScrollTrigger),
  }));
  assert(initial.documentWidth === initial.clientWidth, `${name}: document has horizontal overflow`);
  assert(JSON.stringify(initial.items) === JSON.stringify(expected.map((project) => project.name)), `${name}: project order is incorrect`);
  assert(initial.cards.length === 4 && initial.cards.every((card) => Math.abs(card.width - card.height) <= 1 && card.scrollHeight <= card.height + 1 && card.facesFit), `${name}: a flip card is not square or clips internally`);
  assert(!initial.scrollTrigger, `${name}: legacy ScrollTrigger loaded on project index page`);
  if (viewport.width <= 900) assert(initial.previewPosition === "relative", `${name}: mobile project preview uses the wrong flow position`);

  for (let index = 0; index < expected.length; index += 1) {
    await page.locator(`.project-index__item:nth-child(${index + 1})`).click();
    await waitForPreview(page, expected[index].name, expected[index].image);
    const state = await page.evaluate(() => ({
      name: document.querySelector("[data-project-name]").textContent.trim(),
      category: document.querySelector("[data-project-category]").textContent.trim(),
      count: document.querySelector("[data-project-count]").textContent.trim(),
      url: document.querySelector(".project-index__meta [data-project-link]").href,
      image: document.querySelector("[data-project-image]").src,
      alt: document.querySelector("[data-project-image]").alt,
      selected: [...document.querySelectorAll(".project-index__item")].findIndex((item) => item.getAttribute("aria-selected") === "true"),
    }));
    assert(state.name === expected[index].name && state.category === expected[index].category, `${name}: project ${index + 1} metadata did not update`);
    assert(state.count === `${String(index + 1).padStart(2, "0")} / 04`, `${name}: project ${index + 1} count is wrong`);
    assert(state.url === expected[index].url && state.image.includes(expected[index].image) && state.alt.length > 12, `${name}: project ${index + 1} link or image is wrong`);
    assert(state.selected === index, `${name}: project ${index + 1} selection state is wrong`);
  }

  const firstTab = page.locator(".project-index__item").first();
  await firstTab.focus();
  await firstTab.press("ArrowDown");
  assert(await page.locator(".project-index__item").nth(1).getAttribute("aria-selected") === "true", `${name}: keyboard project navigation failed`);

  const firstCard = page.locator(".why-card").first();
  const secondCard = page.locator(".why-card").nth(1);
  await firstCard.click();
  assert(await firstCard.getAttribute("aria-pressed") === "true", `${name}: first flip card did not open`);
  assert(await firstCard.locator(".why-card__back").getAttribute("aria-hidden") === "false", `${name}: open flip card is hidden from assistive technology`);
  await secondCard.click();
  assert(await firstCard.getAttribute("aria-pressed") === "false" && await secondCard.getAttribute("aria-pressed") === "true", `${name}: flip cards did not synchronize`);

  if (reducedMotion === "reduce") {
    const motion = await secondCard.locator(".why-card__inner").evaluate((node) => getComputedStyle(node).transitionDuration);
    assert(motion.split(",").every((duration) => parseFloat(duration) <= 0.001), `${name}: flip animation ignores reduced motion`);
    assert(await page.locator("[data-offering-reveal]").evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).opacity === "1")), `${name}: reduced-motion content remains hidden`);
  }

  assert(errors.length === 0, `${name}: browser errors: ${errors.join(" | ")}`);
  results.push({ name, ...initial });
  await context.close();
}

try {
  await runScenario("desktop", { width: 1440, height: 900 });
  await runScenario("tablet", { width: 820, height: 900 });
  await runScenario("mobile", { width: 390, height: 844 });
  await runScenario("reduced-motion", { width: 1440, height: 900 }, "reduce");
  console.log(JSON.stringify({ ok: true, results }, null, 2));
} finally {
  await browser.close();
}
