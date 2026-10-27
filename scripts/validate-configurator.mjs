import { chromium } from "file:///C:/Users/muman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { createInitialState } from "../build-your-site/configurator-data.mjs";
import { createQuoteSnapshot, decodeConfiguration, encodeConfiguration } from "../build-your-site/configuration-code.mjs";

const DEFAULT_ORIGIN = "http://127.0.0.1:48621/";
const argumentsAsUrls = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const targetUrls = argumentsAsUrls.length ? argumentsAsUrls.map((argument) => new URL(argument)) : [new URL("build-your-site/", DEFAULT_ORIGIN), new URL("dist/build-your-site/", DEFAULT_ORIGIN)];
const browser = await chromium.launch({ headless: true });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const expectedSections = ["pages", "selling", "customers", "managing", "growth", "advanced", "finishing", "hosting", "estimate"];

function historicalDiscountCode() {
  const snapshot = createQuoteSnapshot(createInitialState());
  snapshot.pricingVersion = "historical-discount-pricing";
  snapshot.quote.lines = [{ name: "Historical website", price: [531, 531], group: "Pages" }];
  snapshot.quote.originalTotals = { min: 531, max: 531 };
  snapshot.quote.discountTotals = { min: 3.1, max: 3.1 };
  snapshot.quote.totals = { min: 527.9, max: 527.9 };
  snapshot.quote.money.originalCents = { min: 53_100, max: 53_100 };
  snapshot.quote.money.discountCents = { min: 310, max: 310 };
  snapshot.quote.money.finalCents = { min: 52_790, max: 52_790 };
  snapshot.quote.money.discountRuleVersion = "historical-10-over-500-v1";
  snapshot.quote.money.thresholdCents = 50_000;
  snapshot.quote.money.rateBasisPoints = 1_000;
  return encodeConfiguration(snapshot);
}

async function noOverflow(page, name, stage) {
  const size = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  assert(size.document === size.viewport, `${name}: horizontal overflow during ${stage} (${size.document}px > ${size.viewport}px)`);
}

async function assertStructure(page, name) {
  const result = await page.evaluate(() => ({
    sections: Array.from(document.querySelectorAll(".config-section"), (section) => section.id), presets: document.querySelectorAll("[data-preset]").length,
    oldPackages: document.querySelectorAll('[data-tier="pages"], [data-add-extra], [data-extra-name]').length, pages: document.querySelectorAll("[data-page]").length,
    homeDisabled: document.querySelector('[data-page="home"]')?.disabled, logo: document.querySelector(".wordmark-logo")?.naturalWidth,
    startHeading: document.querySelector("#preset-title")?.textContent.trim(), nextSteps: document.querySelectorAll(".whats-next").length,
    discountVisible: document.querySelector("#bar-discount")?.checkVisibility(),
  }));
  assert(JSON.stringify(result.sections) === JSON.stringify(expectedSections), `${name}: section order is ${result.sections.join(", ")}`);
  assert(result.presets === 8, `${name}: expected eight presets, got ${result.presets}`);
  assert(result.oldPackages === 0, `${name}: legacy page-package controls remain`);
  assert(result.pages === 13 && result.homeDisabled, `${name}: direct page grid or required homepage is incorrect`);
  assert(result.logo > 0, `${name}: logo failed to load`);
  assert(result.startHeading === "Where would you like to start?", `${name}: preset heading is missing`);
  assert(result.nextSteps === 0, `${name}: next steps appeared before a quote number was generated`);
  assert(!result.discountVisible, `${name}: discount promotion appeared below the $400 threshold`);
}

async function assertImages(page, name, mobile) {
  await page.waitForTimeout(500);
  const failures = await page.locator("[data-visual-image]").evaluateAll((images) => images.filter((image) => !image.hidden && image.naturalWidth === 0).map((image) => image.dataset.visualImage));
  assert(failures.length === 0, `${name}: broken configurator images: ${failures.join(", ")}`);
  if (mobile) {
    assert(!(await page.locator(".visual-column").isVisible()), `${name}: desktop image column is visible on mobile`);
    const ratio = await page.locator("#payments > .mobile-visual").evaluate((element) => { const box = element.getBoundingClientRect(); return box.width / box.height; });
    assert(Math.abs(ratio - 16 / 9) < 0.02, `${name}: mobile image ratio is ${ratio}`);
  } else {
    const visual = await page.locator("#visual-stage").evaluate((element) => {
      const box = element.getBoundingClientRect(); const inner = element.querySelector(".visual-stage__inner"); const placeholder = element.querySelector(".visual-placeholder"); const image = element.querySelector("img");
      return { ratio: box.width / box.height, position: getComputedStyle(element.closest(".visual-column")).position, padding: getComputedStyle(inner).padding, border: getComputedStyle(placeholder).borderTopWidth, fit: getComputedStyle(image).objectFit, width: image.naturalWidth, height: image.naturalHeight };
    });
    assert(visual.position === "sticky", `${name}: visual column is not sticky`);
    assert(Math.abs(visual.ratio - 16 / 9) < 0.02, `${name}: desktop image ratio is ${visual.ratio}`);
    assert(visual.padding === "0px" && visual.border === "0px" && visual.fit === "cover", `${name}: image still has nested matting (${JSON.stringify(visual)})`);
    assert(visual.width === 1920 && visual.height === 1080, `${name}: visual asset dimensions are ${visual.width}×${visual.height}`);
  }
}

async function clickRow(page, selector) { await page.locator(`label.option-row:has(${selector})`).click(); }

async function assertDedicatedVisuals(page, name) {
  const checks = [
    ['[data-page="about"]', "pages", "pages-preview.webp"],
    ['label.option-row:has([data-toggle="dashboardExplicit"])', "dashboard", "dashboard-preview.webp"],
    ['label.option-row:has([data-tier="payments"][value="links"])', "paymentLinks", "payment-links-preview.webp"],
    ['label.option-row:has([data-tier="payments"][value="professional"])', "professionalPayments", "professional-payments-preview.webp"],
    ['label.option-row:has([data-tier="bookings"][value="online"])', "bookings", "bookings-preview.webp"],
    ['label.option-row:has([data-tier="rsvp"][value="public"])', "events", "events-preview.webp"],
    ['label.option-row:has([data-tier="accounts"][value="standard"])', "accounts", "accounts-preview.webp"],
    ['label.option-row:has([data-toggle="contactForm"])', "contact", "contact-preview.webp"],
    ['label.option-row:has([data-toggle="blog"])', "blog", "blog-preview.webp"],
    ['label.option-row:has([data-toggle="newsletter"])', "newsletter", "newsletter-preview.webp"],
    ['label.option-row:has([data-tier="liveChat"][value="ai"])', "pages", "pages-preview.webp"],
    ['label.option-row:has([data-toggle="search"])', "search", "search-preview.webp"],
    ['label.option-row:has([data-tier="cms"][value="basic"])', "cms", "cms-preview.webp"],
    ['label.option-row:has([data-tier="seo"][value="professional"])', "seo", "seo-preview.webp"],
    ['label.option-row:has([data-tier="analytics"][value="standard"])', "analytics", "analytics-preview.webp"],
    ['label.option-row:has([data-toggle="googleBusiness"])', "googleBusiness", "google-business-preview.webp"],
    ['label.option-row:has([data-tier="social"][value="3"])', "social", "social-preview.webp"],
    ['label.option-row:has([data-toggle="domainAssistance"])', "domainAssistance", "hosting-preview.webp"],
    ['[data-page="faq"]', "faq", "faq-preview.webp"],
    ['[data-page="testimonials"]', "reviews", "reviews-preview.webp"],
    ['[data-page="team"]', "staff", "staff-preview.webp"],
    ['[data-page="services"]', "services", "services-preview.webp"],
    ['[data-menu-tier="image"]', "menu", "menu-preview.webp"],
    ['[data-page="careers"]', "careers", "careers-preview.webp"],
    ['[data-page="donations"]', "donations", "donations-preview.webp"],
    ['[data-page="courses"]', "courses", "courses-preview.webp"],
    ['label.option-row:has([data-tier="reviews"][value="manual"])', "reviews", "reviews-preview.webp"],
    ['label.option-row:has([data-tier="multilingual"][value="3"])', "multilingual", "multilingual-preview.webp"],
    ['label.option-row:has([data-toggle="loyalty"])', "loyalty", "loyalty-preview.webp"],
    ['label.option-row:has([data-toggle="giftCards"])', "giftCards", "gift-cards-preview.webp"],
    ['label.option-row:has([data-toggle="digitalDownloads"])', "digitalDownloads", "digital-downloads-preview.webp"],
    ['label.option-row:has([data-toggle="automatedEmails"])', "emailAutomation", "email-automation-preview.webp"],
    ['label.option-row:has([data-tier="communityForms"][value="standard"])', "communityForms", "community-forms-preview.webp"],
  ];
  for (const [selector, key, filename] of checks) {
    await page.locator(selector).click();
    await page.waitForFunction(({ expectedKey, expectedFile }) => {
      const active = document.querySelector("#visual-stage [data-active-visual]");
      const image = document.querySelector("#visual-stage img");
      return active?.dataset.activeVisual === expectedKey
        && image?.currentSrc.endsWith(expectedFile)
        && image.naturalWidth === 1920
        && image.naturalHeight === 1080;
    }, { expectedKey: key, expectedFile: filename }, { timeout: 3_000 });
    const active = await page.locator("#visual-stage [data-active-visual]").getAttribute("data-active-visual");
    const image = await page.locator("#visual-stage img").evaluate((element) => ({ src: element.currentSrc, width: element.naturalWidth, height: element.naturalHeight }));
    assert(active === key, `${name}: ${selector} activated ${active}, expected ${key}`);
    assert(image.src.endsWith(filename) && image.width === 1920 && image.height === 1080, `${name}: ${key} did not load ${filename}`);
  }
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#estimate");
}

async function exercise(page, name) {
  await page.locator("[data-generate]").click();
  await page.waitForTimeout(2100);
  const belowThreshold = await page.locator("#generated-quote").textContent();
  assert(belowThreshold.includes("progressive discount applies 20% above $400") && !belowThreshold.includes("Discount (20% above $400)"), `${name}: below-threshold quote should show only the subtle discount threshold note`);
  await page.locator("[data-reset]").click();
  await page.locator('[data-preset="smallBusiness"]').click();
  const preset = await page.evaluate(() => ({ pages: document.querySelectorAll("[data-page].is-selected").length, contact: document.querySelector('[data-toggle="contactForm"]')?.checked, total: document.querySelector("#bar-total")?.textContent.trim(), hosting: window.__CONFIGURATOR_STATE__.hosting }));
  assert(preset.pages === 3 && preset.contact && preset.total === "$220.00–$330.00 AUD" && preset.hosting === "firebase", `${name}: Small business preset is wrong: ${JSON.stringify(preset)}`);
  await page.locator('[data-page="faq"]').click();
  await page.locator("[data-custom-page-count]").fill("2"); await page.locator("[data-custom-page-count]").press("Tab");
  await clickRow(page, '[data-toggle="loyalty"]');
  const dependencies = await page.evaluate(() => ({ accounts: document.querySelector('[data-tier="accounts"][value="full"]')?.checked, checkout: document.querySelector('[data-tier="payments"][value="professional"]')?.checked, staticDisabled: document.querySelector('[data-tier="hosting"][value="static"]')?.disabled, dashboard: window.__CONFIGURATOR_ESTIMATE__.dashboardDependencies }));
  assert(dependencies.accounts && dependencies.checkout && dependencies.staticDisabled, `${name}: Loyalty dependencies were not applied`);
  assert(dependencies.dashboard.includes("loyalty") && dependencies.dashboard.includes("fullAccounts"), `${name}: Loyalty dashboard dependencies are incomplete`);
  await clickRow(page, '[data-tier="multilingual"][value="more"]');
  await page.locator("[data-language-count]").fill("10"); await page.locator("[data-language-count]").press("Tab");
  await clickRow(page, '[data-tier="translation"][value="ai"]');
  const pricing = await page.evaluate(() => ({
    original: window.__CONFIGURATOR_ESTIMATE__.money.originalCents,
    discount: window.__CONFIGURATOR_ESTIMATE__.money.discountCents,
    final: window.__CONFIGURATOR_ESTIMATE__.money.finalCents,
    total: document.querySelector("#bar-total")?.textContent.trim(),
    discountHint: document.querySelector("#bar-discount")?.textContent.trim(),
    discountHidden: document.querySelector("#bar-discount")?.hidden,
  }));
  assert(JSON.stringify(pricing.original) === JSON.stringify({ min: 72800, max: 112800 }), `${name}: original range is wrong: ${JSON.stringify(pricing)}`);
  assert(JSON.stringify(pricing.discount) === JSON.stringify({ min: 6560, max: 14560 }), `${name}: discount range is wrong: ${JSON.stringify(pricing)}`);
  assert(JSON.stringify(pricing.final) === JSON.stringify({ min: 66240, max: 98240 }), `${name}: discounted range is wrong: ${JSON.stringify(pricing)}`);
  assert(pricing.total === "$662.40–$982.40 AUD" && !pricing.discountHidden && pricing.discountHint === "20% off the amount over $400", `${name}: sticky discounted total is incomplete: ${JSON.stringify(pricing)}`);
  await noOverflow(page, name, "configured state");
  await page.locator("[data-scroll-estimate]").click(); await page.locator("[data-generate]").click();
  assert(await page.locator(".preparing-panel").isVisible(), `${name}: two-second preparation state did not appear`);
  assert(!(await page.locator("#generated-quote").count()), `${name}: quote appeared before preparation completed`);
  await page.waitForTimeout(2100);
  assert(await page.locator("#generated-quote").isVisible(), `${name}: quote did not appear after preparation`);
  const generatedText = await page.locator("#generated-quote").textContent();
  assert(generatedText.includes("automatically included"), `${name}: quote does not identify automatic dependencies`);
  assert(generatedText.includes("Original estimate") && generatedText.includes("$728.00–$1,128.00 AUD"), `${name}: quote original range is missing`);
  assert(generatedText.includes("Discount (20% above $400)") && generatedText.includes("−$65.60–$145.60 AUD"), `${name}: quote discount range is missing`);
  assert(generatedText.includes("Your estimated total") && generatedText.includes("$662.40–$982.40 AUD"), `${name}: quote final range is missing`);
  await page.locator("[data-copy]").click();
  const copiedEstimate = await page.evaluate(() => navigator.clipboard.readText());
  assert(copiedEstimate.includes("Original estimate: $728.00–$1,128.00 AUD") && copiedEstimate.includes("Discount (20% above $400): −$65.60–$145.60 AUD") && copiedEstimate.includes("Your estimated total: $662.40–$982.40 AUD"), `${name}: copied estimate does not preserve discount breakdown`);
  await page.evaluate(() => { window.__PRINT_CALLED__ = false; window.print = () => { window.__PRINT_CALLED__ = true; }; });
  await page.locator("[data-print]").click();
  assert(await page.evaluate(() => window.__PRINT_CALLED__), `${name}: print action did not use the rendered discounted quote`);
  await page.locator("[data-continue]").click();
  const code = await page.locator("[data-generated-code]").inputValue();
  assert(code.startsWith("BBM1-") && code.length > 1000, `${name}: deterministic code was not generated in full`);
  const next = await page.evaluate(() => ({
    heading: document.querySelector("#whats-next-title")?.textContent.trim(),
    intro: document.querySelector(".whats-next__header p")?.textContent.trim(),
    steps: Array.from(document.querySelectorAll(".next-step"), (step) => step.querySelector("h4")?.textContent.trim()),
    email: document.querySelector("[data-email-quote]")?.getAttribute("href"),
  }));
  assert(next.heading === "What's next?", `${name}: What's next heading is incorrect`);
  assert(next.intro === "Let's get your website built! Here's what's next for your site.", `${name}: What's next supporting copy is incorrect`);
  assert(JSON.stringify(next.steps) === JSON.stringify(["Check everything looks right", "Send us an email", "We'll get started on your site!"]), `${name}: next-step content/order is incorrect`);
  const decodedEmail = decodeURIComponent(next.email || "");
  assert(decodedEmail.startsWith("mailto:matthew@andomail.com?subject=Website enquiry — "), `${name}: email recipient or subject is incorrect`);
  assert(decodedEmail.includes(`Website enquiry — ${code}`) && decodedEmail.includes(`My quote number: ${code}`), `${name}: email does not contain the actual quote number`);
  assert(decodedEmail.includes("My name:\nWebsite name (if decided):\nBrief description:"), `${name}: email body prompts are incomplete`);
  await page.locator("[data-copy-next-code]").click();
  await page.waitForFunction(() => document.querySelector("[data-next-feedback]")?.textContent.includes("copied"), null, { timeout: 2000 });
  assert((await page.locator("[data-next-feedback]").textContent()).includes("copied"), `${name}: copy quote number success feedback is missing`);
  assert(await page.evaluate(() => navigator.clipboard.readText()) === code, `${name}: copy quote number did not copy the current code`);
  await page.locator('[data-page="team"]').click();
  assert(!(await page.locator(".whats-next").count()), `${name}: next steps remained enabled after the configuration changed`);
  assert(await page.locator(".outdated-quote-note").isVisible(), `${name}: outdated quote state was not shown after an edit`);
  assert(!(await page.locator("[data-email-quote]").count()), `${name}: email action remained enabled for an outdated quote`);
  await page.locator("#code-recovery summary").click(); await page.locator("[data-recovery-code]").fill(code); await page.locator("[data-recover]").click();
  assert((await page.locator("#generated-quote").textContent()).includes("Recovered historical estimate"), `${name}: recovered quote is not labelled historical`);
  assert((await page.locator("#generated-quote").textContent()).includes("has not been recalculated"), `${name}: historical-price disclosure is missing`);
  assert((await page.locator("#generated-quote").textContent()).includes("$662.40–$982.40 AUD"), `${name}: recovered quote changed its discounted total`);
  assert(await page.locator(".whats-next").isVisible(), `${name}: next steps did not return with a recovered valid quote number`);
  await page.locator("#code-recovery summary").click();
  await page.locator("[data-recovery-code]").fill(historicalDiscountCode()); await page.locator("[data-recover]").click();
  const historical = await page.evaluate(() => ({
    quote: document.querySelector("#generated-quote")?.textContent,
    barTotal: document.querySelector("#bar-total")?.textContent.trim(),
    barDiscount: document.querySelector("#bar-discount")?.textContent.trim(),
  }));
  assert(historical.quote.includes("Discount (10% above $500)") && historical.quote.includes("−$3.10 AUD") && historical.quote.includes("$527.90 AUD"), `${name}: historical discount rule was relabelled or recalculated`);
  assert(historical.barTotal === "$527.90 AUD" && historical.barDiscount === "10% off the amount over $500", `${name}: sticky bar did not use the recovered historical quote: ${JSON.stringify(historical)}`);
  await clickRow(page, '[data-toggle="loyalty"]');
  await page.locator("[data-generate]").click(); await page.waitForTimeout(2100);
  const regeneratedText = await page.locator("#generated-quote").textContent();
  assert(regeneratedText.includes("Pricing 2026.10.1") && regeneratedText.includes("Discount (20% above $400)") && regeneratedText.includes("$432.00–$672.00 AUD"), `${name}: edited historical quote did not regenerate with current pricing`);
  assert(!regeneratedText.includes("10% above $500") && !regeneratedText.includes("$527.90 AUD"), `${name}: regenerated quote retained historical discount values`);
  await page.locator("[data-continue]").click();
  const regenerated = decodeConfiguration(await page.locator("[data-generated-code]").inputValue());
  assert(regenerated.pricingVersion === "2026.10.1" && regenerated.quote.money.discountRuleVersion === "progressive-20-over-400-v1", `${name}: regenerated quote code did not store the current discount rule`);
  return code;
}

async function validateViewer(baseUrl, code, name) {
  const url = new URL(baseUrl.pathname.replace(/build-your-site\/$/u, "quote-viewer/"), baseUrl.origin);
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage(); const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); }); page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(url.href, { waitUntil: "networkidle" }); assert(response?.ok(), `${name}: quote viewer returned ${response?.status()}`);
  await page.locator("[data-viewer-code]").fill(code); await page.locator("[data-decode]").click();
  assert(await page.locator("#decoded-quote").isVisible(), `${name}: quote viewer did not decode valid code`);
  assert((await page.locator("#decoded-quote").textContent()).includes("Recovered historical estimate"), `${name}: viewer historical label is missing`);
  const recoveredText = await page.locator("#decoded-quote").textContent();
  assert(recoveredText.includes("$728.00–$1,128.00 AUD") && recoveredText.includes("−$65.60–$145.60 AUD") && recoveredText.includes("$662.40–$982.40 AUD"), `${name}: viewer did not preserve the saved discount breakdown`);
  await page.locator("[data-copy-viewer]").click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert(copied.includes("Original estimate: $728.00–$1,128.00 AUD") && copied.includes("Discount (20% above $400): −$65.60–$145.60 AUD") && copied.includes("Your estimated total: $662.40–$982.40 AUD"), `${name}: viewer copy does not preserve the saved discount breakdown`);
  await page.locator("[data-viewer-code]").fill(`${code.slice(0, -1)}0`); await page.locator("[data-decode]").click();
  assert((await page.locator("[data-viewer-status]").textContent()).match(/corrupt|invalid|incomplete/i), `${name}: viewer did not reject corrupted code`);
  await noOverflow(page, name, "quote viewer"); assert(errors.length === 0, `${name}: quote viewer browser errors: ${errors.join(" | ")}`); await context.close();
}

async function smoke(url, scenario, viewport, full = false, reducedMotion = "no-preference") {
  const name = `${url.pathname} · ${scenario}`; const context = await browser.newContext({ viewport, reducedMotion, permissions: ["clipboard-read", "clipboard-write"] }); const page = await context.newPage(); const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); }); page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(url.href, { waitUntil: "networkidle" }); assert(response?.ok(), `${name}: page returned ${response?.status()}`); await page.waitForSelector("#estimate");
  await assertStructure(page, name); await assertImages(page, name, viewport.width <= 820); await noOverflow(page, name, "initial render");
  if (full) await assertDedicatedVisuals(page, name);
  let code = ""; if (full) code = await exercise(page, name);
  assert(errors.length === 0, `${name}: browser errors: ${errors.join(" | ")}`);
  const output = { target: url.href, scenario, viewport, reducedMotion, total: (await page.locator("#bar-total").textContent()).trim() };
  await context.close(); return { output, code };
}

try {
  const results = [];
  for (const url of targetUrls) {
    const desktop = await smoke(url, "desktop", { width: 1440, height: 900 }, true); results.push(desktop.output); await validateViewer(url, desktop.code, `${url.pathname} · viewer`);
    results.push((await smoke(url, "tablet", { width: 1024, height: 768 })).output);
    results.push((await smoke(url, "mobile", { width: 390, height: 844 })).output);
    results.push((await smoke(url, "reduced-motion", { width: 1440, height: 900 }, false, "reduce")).output);
  }
  console.log(JSON.stringify({ ok: true, targets: targetUrls.map((url) => url.href), results }, null, 2));
} finally { await browser.close(); }
