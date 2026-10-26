import { chromium } from "file:///C:/Users/muman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const configuratorUrl = new URL(process.argv[2] || "http://127.0.0.1:48621/build-your-site/");
const siteRoot = new URL("../", configuratorUrl);
const browser = await chromium.launch({ headless: true });

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function smoke(name, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(configuratorUrl.href, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-preset='contact']");

  const initial = await page.evaluate(() => ({
    heading: document.querySelector(".step-heading h2")?.textContent.trim(),
    docWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    logoLoaded: document.querySelector(".wordmark-logo")?.naturalWidth > 0,
    progressButtons: document.querySelectorAll("[data-step-jump]").length,
    summaryVisible: !document.querySelector("#summary-content").hidden,
  }));
  assert(initial.heading === "How many pages does your site need?", `${name}: wrong initial step`);
  assert(initial.docWidth === initial.clientWidth, `${name}: horizontal overflow`);
  assert(initial.logoLoaded, `${name}: logo did not load`);
  assert(initial.progressButtons === 4, `${name}: progress is incomplete`);
  assert(initial.summaryVisible, `${name}: summary unavailable`);
  assert(errors.length === 0, `${name}: browser errors: ${errors.join(" | ")}`);

  await page.locator("[data-custom-pages]").click();
  await page.locator("[data-page='about']").uncheck();
  await page.locator("[data-add-extra]").click();
  await page.locator("[data-extra-name]").fill("Services");
  await page.locator("[data-preset='home']").click();
  await page.locator("[data-custom-pages]").click();
  assert(!(await page.locator("[data-page='about']").isChecked()), `${name}: custom page choices were not preserved`);
  assert((await page.locator("[data-extra-name]").inputValue()) === "Services", `${name}: custom page name was not preserved`);
  await page.locator("#next-step").click();
  await page.locator("[data-category='customers'] > summary").click();
  await page.locator("[data-toggle='contactForm']").click();

  const dependency = await page.evaluate(() => ({
    summary: document.querySelector("#summary-content")?.textContent,
    note: document.querySelector("#dependency-note")?.textContent,
    docWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert(dependency.summary.includes("Contact form"), `${name}: summary did not update`);
  assert(dependency.summary.includes("Admin dashboard"), `${name}: dashboard dependency missing`);
  assert(dependency.note.includes("Interactive hosting selected"), `${name}: hosting change was silent`);
  assert(dependency.docWidth === dependency.clientWidth, `${name}: feature step overflow`);

  await page.locator("#next-step").click();
  assert(!(await page.locator("[data-hosting='static']").isEnabled()), `${name}: static hosting should be disabled`);
  assert((await page.locator("[data-hosting='firebase']").getAttribute("aria-pressed")) === "true", `${name}: Firebase not selected`);
  await page.locator("#next-step").click();
  await page.locator("[data-generate]").click();
  const quote = await page.evaluate(() => ({
    total: document.querySelector(".quote-total")?.textContent.replace(/\s+/g, " ").trim(),
    dashboardLines: Array.from(document.querySelectorAll(".quote-line"), (node) => node.textContent).filter((text) => /dashboard/i.test(text)),
    hasSeo: document.querySelector("#generated-quote")?.textContent.includes("Basic SEO"),
    docWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert(quote.total.includes("$230–340 AUD"), `${name}: unexpected generated total: ${quote.total}`);
  assert(quote.dashboardLines.length === 2, `${name}: dashboard lines incorrect`);
  assert(quote.hasSeo, `${name}: included SEO missing`);
  assert(quote.docWidth === quote.clientWidth, `${name}: quote overflow`);
  assert(errors.length === 0, `${name}: browser errors after interaction: ${errors.join(" | ")}`);

  await context.close();
  return { name, ...initial, total: quote.total };
}

const homeContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const home = await homeContext.newPage();
await home.goto(siteRoot.href, { waitUntil: "load" });
const ctaHref = await home.locator(".project-link").getAttribute("href");
assert(ctaHref === "./build-your-site/", `Homepage CTA points to ${ctaHref}`);
await homeContext.close();

const results = [];
results.push(await smoke("desktop", { width: 1440, height: 900 }));
results.push(await smoke("tablet", { width: 1024, height: 768 }));
results.push(await smoke("mobile", { width: 390, height: 844 }));
results.push(await smoke("reduced-motion", { width: 1440, height: 900 }, "reduce"));

await browser.close();
console.log(JSON.stringify({ ok: true, configuratorUrl: configuratorUrl.href, results }, null, 2));
