import { chromium } from "file:///C:/Users/muman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const DEFAULT_ORIGIN = "http://127.0.0.1:48621/";
const argumentsAsUrls = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const targetUrls = argumentsAsUrls.length
  ? argumentsAsUrls.map((argument) => new URL(argument))
  : [new URL("build-your-site/", DEFAULT_ORIGIN), new URL("dist/build-your-site/", DEFAULT_ORIGIN)];

const browser = await chromium.launch({ headless: true });

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const expectedSections = ["pages", "selling", "customers", "managing", "growth", "finishing", "hosting", "estimate"];

function option(page, selector) {
  return page.locator(`label.option-row:has(${selector})`);
}

async function assertNoOverflow(page, name, stage) {
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  assert(
    dimensions.documentWidth === dimensions.viewportWidth,
    `${name}: horizontal overflow during ${stage} (${dimensions.documentWidth}px > ${dimensions.viewportWidth}px)`,
  );
}

async function assertContinuousStructure(page, name) {
  const structure = await page.evaluate(() => ({
    sections: Array.from(document.querySelectorAll(".config-section"), (section) => section.id),
    wizardControls: document.querySelectorAll("[data-step-jump], #previous-step, #next-step, .step-progress").length,
    forbiddenButtons: Array.from(document.querySelectorAll("button"), (button) => button.textContent.trim()).filter((text) =>
      /^(?:continue|previous|add feature|choose package|confirm)$/i.test(text),
    ),
    logoLoaded: document.querySelector(".wordmark-logo")?.naturalWidth > 0,
    intro: document.querySelector(".builder-intro__copy")?.textContent.replace(/\s+/g, " ").trim(),
  }));

  assert(
    JSON.stringify(structure.sections) === JSON.stringify(expectedSections),
    `${name}: expected eight continuous sections in order, got ${structure.sections.join(", ")}`,
  );
  assert(structure.wizardControls === 0, `${name}: legacy wizard controls are still present`);
  assert(structure.forbiddenButtons.length === 0, `${name}: legacy multi-click controls remain: ${structure.forbiddenButtons.join(", ")}`);
  assert(structure.logoLoaded, `${name}: wordmark logo did not load`);
  assert(structure.intro?.includes("Make it yours."), `${name}: configurator introduction is missing`);

  const positions = await page.locator(".config-section").evaluateAll((sections) =>
    sections.map((section) => section.getBoundingClientRect().top + scrollY),
  );
  assert(
    positions.every((position, index) => index === 0 || position > positions[index - 1]),
    `${name}: configurator sections are not laid out as one continuous vertical flow`,
  );
}

async function assertVisualBehaviour(page, name, mobile) {
  const visualColumn = page.locator(".visual-column");
  const mobileVisuals = page.locator(".mobile-visual");

  if (mobile) {
    assert(!(await visualColumn.isVisible()), `${name}: desktop sticky visual should be hidden on mobile`);
    assert((await mobileVisuals.count()) > 0, `${name}: mobile section visuals are missing`);
    assert(await page.locator("#payments > .mobile-visual").isVisible(), `${name}: payment visual is not stacked above mobile controls`);

    const mobileOrder = await page.locator("#payments").evaluate((group) => {
      const visual = group.querySelector(":scope > .mobile-visual")?.getBoundingClientRect();
      const options = group.querySelector(":scope > .option-stack")?.getBoundingClientRect();
      return visual && options ? { visualBottom: visual.bottom, optionsTop: options.top } : null;
    });
    assert(mobileOrder && mobileOrder.visualBottom <= mobileOrder.optionsTop, `${name}: mobile visual does not precede its controls`);
  } else {
    assert(await visualColumn.isVisible(), `${name}: desktop visual column is hidden`);
    const position = await visualColumn.evaluate((element) => getComputedStyle(element).position);
    assert(position === "sticky", `${name}: desktop visual column is not sticky (computed ${position})`);

    await page.locator("#analytics").evaluate((element) => {
      const target = scrollY + element.getBoundingClientRect().top - innerHeight * 0.4;
      scrollTo({ top: target, behavior: "instant" });
    });
    await page.waitForTimeout(350);
    const activeVisual = await page.locator("#visual-stage [data-active-visual]").getAttribute("data-active-visual");
    assert(activeVisual === "analytics", `${name}: observer did not activate analytics visual (got ${activeVisual})`);
  }

  const fallback = await page.locator(".visual-placeholder").first().evaluate((placeholder) => {
    const image = placeholder.querySelector("img");
    const label = placeholder.querySelector(".visual-placeholder__label")?.textContent.trim();
    return {
      label,
      imageSafe: !image || image.hidden || image.naturalWidth > 0,
      placeholderVisible: getComputedStyle(placeholder).display !== "none",
    };
  });
  assert(fallback.placeholderVisible && fallback.label, `${name}: visual fallback is not present`);
  assert(fallback.imageSafe, `${name}: visual fallback exposes a broken image`);
}

async function choose(page, selector) {
  const row = option(page, selector);
  await row.click();
  assert(await page.locator(selector).isChecked(), `single-click selection failed for ${selector}`);
  assert(await row.evaluate((element) => element.classList.contains("is-selected")), `selected state missing for ${selector}`);
}

async function exerciseConfigurator(page, name) {
  // Custom-page choices must survive temporarily switching back to a preset.
  await choose(page, '[data-tier="pages"][value="custom"]');
  await page.locator('[data-page="about"]').uncheck();
  await page.locator("[data-add-extra]").click();
  await page.locator("[data-extra-name]").fill("Services");
  await choose(page, '[data-tier="pages"][value="home"]');
  await choose(page, '[data-tier="pages"][value="custom"]');
  assert(!(await page.locator('[data-page="about"]').isChecked()), `${name}: custom About choice was not preserved`);
  assert((await page.locator("[data-extra-name]").inputValue()) === "Services", `${name}: custom page name was not preserved`);

  // A row is the control: one click updates selection, dashboard dependencies, hosting and totals.
  await choose(page, '[data-toggle="contactForm"]');
  const contactDependency = await page.evaluate(() => ({
    staticDisabled: document.querySelector('[data-tier="hosting"][value="static"]')?.disabled,
    firebaseChecked: document.querySelector('[data-tier="hosting"][value="firebase"]')?.checked,
    dashboardSelected: document.querySelector('[data-toggle="dashboardExplicit"]')?.checked,
    dashboardDisabled: document.querySelector('[data-toggle="dashboardExplicit"]')?.disabled,
    total: document.querySelector("#bar-total")?.textContent.trim(),
    summary: document.querySelector("#bar-selection")?.textContent.trim(),
    notice: document.querySelector("#dependency-note")?.textContent.trim(),
  }));
  assert(contactDependency.staticDisabled, `${name}: Static hosting remains available for a contact form`);
  assert(contactDependency.firebaseChecked, `${name}: contact form did not select Firebase`);
  assert(contactDependency.dashboardSelected && contactDependency.dashboardDisabled, `${name}: required dashboard was not locked in`);
  assert(contactDependency.total === "$230–340 AUD", `${name}: live total is ${contactDependency.total}, expected $230–340 AUD`);
  assert(contactDependency.summary === "3 pages · 2 features", `${name}: live summary is incorrect: ${contactDependency.summary}`);
  assert(/Interactive hosting selected/i.test(contactDependency.notice), `${name}: automatic hosting change was not announced`);

  // Member-only RSVP must add accounts, and removing it must remove only the auto-added account.
  await choose(page, '[data-tier="rsvp"][value="member"]');
  const memberDependency = await page.evaluate(() => ({
    standardChecked: document.querySelector('[data-tier="accounts"][value="standard"]')?.checked,
    noneDisabled: document.querySelector('[data-tier="accounts"][value="none"]')?.disabled,
    autoAdded: window.__CONFIGURATOR_STATE__?.accountsAutoAdded,
  }));
  assert(memberDependency.standardChecked && memberDependency.noneDisabled && memberDependency.autoAdded, `${name}: member RSVP did not add and require Standard accounts`);
  await choose(page, '[data-tier="rsvp"][value="none"]');
  assert(await page.locator('[data-tier="accounts"][value="none"]').isChecked(), `${name}: auto-added accounts remained after member RSVP was removed`);

  // Return to the established deterministic $230–340 scenario and generate inline.
  assert((await page.locator("#bar-total").textContent()).trim() === "$230–340 AUD", `${name}: dependency reversal changed the established total`);
  await page.locator("[data-scroll-estimate]").click();
  await page.waitForTimeout(350);
  await page.locator("[data-generate]").click();
  const quote = await page.evaluate(() => ({
    total: document.querySelector(".quote-total")?.textContent.replace(/\s+/g, " ").trim(),
    text: document.querySelector("#generated-quote")?.textContent.replace(/\s+/g, " ").trim(),
    focused: document.activeElement?.id,
    dashboardLines: Array.from(document.querySelectorAll(".quote-line"), (line) => line.textContent).filter((text) => /dashboard/i.test(text)).length,
  }));
  assert(quote.total?.includes("$230–340 AUD"), `${name}: generated quote total is incorrect: ${quote.total}`);
  assert(quote.text?.includes("Basic SEO"), `${name}: included Basic SEO is missing from the quote`);
  assert(quote.text?.includes("Firebase"), `${name}: hosting is missing from the quote`);
  assert(quote.dashboardLines === 2, `${name}: expected dashboard and integration quote lines, got ${quote.dashboardLines}`);
  assert(quote.focused === "generated-quote", `${name}: generated quote did not receive focus`);
  await assertNoOverflow(page, name, "generated estimate");
}

async function smoke(url, scenario, viewport, reducedMotion = "no-preference") {
  const name = `${url.pathname} · ${scenario}`;
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    const source = message.location().url || "";
    const expectedMissingPlaceholderAsset = source.includes("/assets/configurator/");
    if (message.type() === "error" && !expectedMissingPlaceholderAsset) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  const response = await page.goto(url.href, { waitUntil: "networkidle" });
  assert(response?.ok(), `${name}: page returned ${response?.status() ?? "no response"}`);
  await page.waitForSelector("#estimate");

  await assertContinuousStructure(page, name);
  await assertNoOverflow(page, name, "initial render");
  await assertVisualBehaviour(page, name, viewport.width <= 820);
  await exerciseConfigurator(page, name);
  assert(errors.length === 0, `${name}: browser errors: ${errors.join(" | ")}`);

  const result = {
    target: url.href,
    scenario,
    viewport,
    reducedMotion,
    total: (await page.locator(".quote-total").textContent()).replace(/\s+/g, " ").trim(),
  };
  await context.close();
  return result;
}

try {
  const results = [];
  for (const url of targetUrls) {
    results.push(await smoke(url, "desktop", { width: 1440, height: 900 }));
    results.push(await smoke(url, "tablet", { width: 1024, height: 768 }));
    results.push(await smoke(url, "mobile", { width: 390, height: 844 }));
    results.push(await smoke(url, "reduced-motion", { width: 1440, height: 900 }, "reduce"));
  }
  console.log(JSON.stringify({ ok: true, targets: targetUrls.map((url) => url.href), results }, null, 2));
} finally {
  await browser.close();
}
