import { chromium } from "file:///C:/Users/muman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const roots = process.argv.slice(2).length
  ? process.argv.slice(2).map((value) => new URL(value))
  : [new URL("http://127.0.0.1:48621/"), new URL("http://127.0.0.1:48621/dist/")];
const widths = [320, 360, 375, 390, 430, 768, 820, 1024, 1180, 1440];
const routes = ["", "websites/", "websites/what-makes-a-good-site/", "build-your-site/", "quote-viewer/", "terms/"];
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
  const dreamGrid = await page.evaluate(() => {
    const section = document.querySelector(".dream-grid-section");
    const grid = document.querySelector(".dream-grid");
    const cards = [...document.querySelectorAll(".dream-card")];
    const firstCard = cards[0]?.getBoundingClientRect();
    return {
      title: document.querySelector("#dream-grid-title")?.textContent.trim(),
      count: cards.length,
      columns: getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length,
      square: firstCard ? Math.abs(firstCard.width - firstCard.height) <= 1 : false,
      links: [...section.querySelectorAll("a")].map((link) => link.getAttribute("href")),
      cardTitles: [...section.querySelectorAll(".dream-card-copy h3")].map((node) => node.textContent.replace(/\s+/g, " ").trim()),
      cardCopy: [...section.querySelectorAll(".dream-card-copy p")].map((node) => node.textContent.replace(/\s+/g, " ").trim()),
      afterHero: section.previousElementSibling?.classList.contains("hero") === true,
      isFinalHomepageSection: section.nextElementSibling === null,
      portfolioRemoved: document.querySelector(".portfolio-section") === null,
    };
  });
  const expectedColumns = width <= 600 ? 1 : width <= 900 ? 2 : 3;
  assert(dreamGrid.title === "Anything you can dream of.", `${root.pathname} ${width}: dream-grid title is incorrect`);
  assert(dreamGrid.count === 6, `${root.pathname} ${width}: expected six dream-grid cards`);
  assert(dreamGrid.columns === expectedColumns, `${root.pathname} ${width}: dream grid has ${dreamGrid.columns} columns, expected ${expectedColumns}`);
  assert(dreamGrid.square, `${root.pathname} ${width}: dream-grid cards are not square`);
  assert(JSON.stringify(dreamGrid.links) === JSON.stringify(["./websites/", "./build-your-site/", "./build-your-site/", "./build-your-site/", "./build-your-site/", "./build-your-site/"]), `${root.pathname} ${width}: one or more grid cards has the wrong link`);
  assert(JSON.stringify(dreamGrid.cardTitles) === JSON.stringify(["Websites", "Apps", "Interfaces", "Automations", "Something entirely new", "Online stores"]), `${root.pathname} ${width}: grid card titles are incorrect`);
  assert(JSON.stringify(dreamGrid.cardCopy) === JSON.stringify([
    "Put your idea on the web with a website built from scratch for your organisation, business, or project.",
    "Turn an idea into a useful web or mobile app people can use anywhere.",
    "Make complex work feel simple with dashboards, portals, and internal systems designed around the people using them.",
    "Connect services and streamline repetitive work with thoughtful integrations and automated workflows.",
    "Bring an unusual, experimental, or hard-to-categorise idea to life without squeezing it into a template.",
    "Sell products, bookings, memberships, or services through an online store built around your business.",
  ]), `${root.pathname} ${width}: grid card copy is incorrect`);
  assert(dreamGrid.afterHero && dreamGrid.isFinalHomepageSection && dreamGrid.portfolioRemoved, `${root.pathname} ${width}: selected work was not cleanly moved off the homepage`);
  if (width <= 360) {
    const title = await page.locator(".title-mask:first-child .title-line").evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      parent: node.parentElement.getBoundingClientRect().width,
      whiteSpace: getComputedStyle(node).whiteSpace,
    }));
    assert(title.whiteSpace === "nowrap" && title.width <= title.parent + 1, `${root.pathname} ${width}: hero title is clipped or wraps awkwardly`);
  }
  await context.close();
}

async function assertWebsites(root, width) {
  const { context, page } = await open(root, "websites/", width);
  await page.waitForSelector(".project-index__item");
  await page.waitForFunction(() => {
    const image = document.querySelector("[data-project-image]");
    return image?.complete && image.naturalWidth > 0;
  });
  if (width > 900) {
    const heroActionsVisible = await page.locator(".offering-hero .offering-actions").evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight;
    });
    assert(heroActionsVisible, `${root.pathname} ${width}: offering hero actions are below the first viewport`);
  }
  const offering = await page.evaluate(() => ({
    title: document.querySelector("#portfolio-title")?.textContent.trim(),
    sections: [...document.querySelectorAll("main > section")].map((section) => section.className),
    pageHeadings: document.querySelectorAll("main h1").length,
    hero: document.querySelector("#offering-title")?.textContent.replace(/\s+/g, " ").trim(),
    intro: document.querySelector(".offering-hero__intro")?.textContent.replace(/\s+/g, " ").trim(),
    actions: [...document.querySelectorAll(".offering-hero .offering-button")].map((link) => [link.textContent.trim(), link.getAttribute("href")]),
    cards: [...document.querySelectorAll(".why-card")].map((card) => {
      const rect = card.getBoundingClientRect();
      const facesFit = [...card.querySelectorAll(".why-card__face")].every((face) => face.scrollHeight <= face.clientHeight + 1);
      return { width: rect.width, height: rect.height, scrollHeight: card.scrollHeight, facesFit };
    }),
    closing: document.querySelector(".offering-why__closing")?.textContent.replace(/\s+/g, " ").trim(),
    projects: [...document.querySelectorAll(".project-index__item strong")].map((node) => node.textContent.trim()),
    previewPosition: getComputedStyle(document.querySelector(".project-index__preview")).position,
    trigger: Boolean(window.ScrollTrigger),
  }));
  assert(offering.title === "Websites, made properly.", `${root.pathname} ${width}: portfolio title is incorrect`);
  assert(JSON.stringify(offering.sections) === JSON.stringify(["offering-hero", "offering-why", "offering-portfolio"]), `${root.pathname} ${width}: websites page is not limited to the three requested sections`);
  assert(offering.pageHeadings === 1 && offering.hero === "Websites made for more than looking good.", `${root.pathname} ${width}: introduction heading is incorrect`);
  assert(offering.intro === "Your website should feel unmistakably like you. Its design, personality, and functionality shape every part of the user experience—and how people feel while using it. That is what transforms a functional website into something thoughtful, memorable, and beautifully made.", `${root.pathname} ${width}: introduction copy is incorrect`);
  assert(JSON.stringify(offering.actions) === JSON.stringify([["Build your site", "../build-your-site/"], ["Learn more", "#why"], ["See how our websites are designed", "./what-makes-a-good-site/"]]), `${root.pathname} ${width}: introduction actions are incorrect`);
  assert(offering.cards.length === 4 && offering.cards.every((card) => Math.abs(card.width - card.height) <= 1 && card.scrollHeight <= card.height + 1 && card.facesFit), `${root.pathname} ${width}: why cards are not square or clip internally`);
  assert(offering.closing === "The goal is not simply to put something online. It is to create something that feels right for you—and works properly for everyone who visits it.", `${root.pathname} ${width}: why-section closing line is incorrect`);
  assert(JSON.stringify(offering.projects) === JSON.stringify(["Doxa Treasury", "Chromecraft Browser Website", "Sydney Bush Dances", "King Royalty Eggs"]), `${root.pathname} ${width}: project index order is incorrect`);
  assert(!offering.trigger, `${root.pathname} ${width}: legacy ScrollTrigger remains on project index page`);
  if (width <= 900) assert(offering.previewPosition === "relative", `${root.pathname} ${width}: mobile project preview uses the wrong flow position`);
  await page.locator(".why-card").first().click();
  assert(await page.locator(".why-card").first().getAttribute("aria-pressed") === "true", `${root.pathname} ${width}: flip card did not open`);
  await page.locator(".project-index__item").last().click();
  await page.waitForFunction(() => document.querySelector("[data-project-name]")?.textContent.trim() === "King Royalty Eggs" && document.querySelector("[data-project-image]")?.src.includes("king-royalty-eggs.jpg"));
  assert((await page.locator("[data-project-image]").getAttribute("src")).includes("king-royalty-eggs.jpg"), `${root.pathname} ${width}: project index preview did not update`);
  await context.close();
}

async function assertAnatomy(root, width) {
  const { context, page } = await open(root, "websites/what-makes-a-good-site/", width);
  const snapshot = await page.evaluate(() => {
    const visual = document.querySelector(".anatomy-layers__visual");
    return {
      sections: [...document.querySelectorAll("main > section")].map((section) => section.className),
      pageHeadings: document.querySelectorAll("main h1").length,
      portfolio: document.querySelector(".portfolio-section") !== null,
      layerControls: document.querySelectorAll(".anatomy-layer-control").length,
      hotspots: document.querySelectorAll(".anatomy-hotspot").length,
      outcomes: document.querySelectorAll(".anatomy-outcome").length,
      visualPosition: getComputedStyle(visual).position,
      visualHeight: visual.getBoundingClientRect().height,
      viewportHeight: innerHeight,
    };
  });
  assert(JSON.stringify(snapshot.sections) === JSON.stringify(["anatomy-hero", "anatomy-layers", "anatomy-assembly", "anatomy-outcomes", "anatomy-cta"]), `${root.pathname} ${width}: anatomy page sections are incorrect`);
  assert(snapshot.pageHeadings === 1 && !snapshot.portfolio && snapshot.layerControls === 6 && snapshot.hotspots === 4 && snapshot.outcomes === 3, `${root.pathname} ${width}: moved anatomy content is incomplete`);
  const expectedPosition = width <= 600 || width > 900 ? "sticky" : "relative";
  assert(snapshot.visualPosition === expectedPosition, `${root.pathname} ${width}: anatomy visual position is ${snapshot.visualPosition}, expected ${expectedPosition}`);
  if (width <= 600) assert(snapshot.visualHeight < snapshot.viewportHeight * 0.52, `${root.pathname} ${width}: sticky anatomy visual leaves too little room for tap controls`);
  await page.locator('[data-layer="technology"]').click();
  assert(await page.locator('[data-layer="technology"]').getAttribute("aria-pressed") === "true", `${root.pathname} ${width}: anatomy layer control did not activate`);
  assert((await page.locator("[data-anatomy-caption]").textContent()).trim() === "The reliable foundation underneath everything people see.", `${root.pathname} ${width}: anatomy layer feedback is not visible`);
  if (width <= 600) {
    const mobileFeedback = await page.evaluate(() => {
      const visual = document.querySelector(".anatomy-layers__visual").getBoundingClientRect();
      const activeControl = document.querySelector('.anatomy-layer-control[aria-pressed="true"]').getBoundingClientRect();
      return visual.bottom <= activeControl.top + 1 && visual.top >= 0;
    });
    assert(mobileFeedback, `${root.pathname} ${width}: sticky anatomy feedback overlaps the active tap control`);
  }
  await page.locator('[data-part="typography"]').click();
  assert((await page.locator("[data-assembly-title]").textContent()).trim() === "Give the project a voice.", `${root.pathname} ${width}: assembly hotspot did not update`);
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
      await assertWebsites(root, width);
      await assertAnatomy(root, width);
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

    for (const route of ["websites/", "websites/what-makes-a-good-site/"]) {
      const reducedPage = await open(root, route, 390, { reducedMotion: "reduce" });
      const revealsVisible = await reducedPage.page.locator("[data-offering-reveal], [data-anatomy-reveal]").evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).opacity === "1" && getComputedStyle(node).transform === "none"),
      );
      assert(revealsVisible, `${root.pathname}${route}: reduced-motion content remained hidden`);
      await reducedPage.context.close();
    }
    await assertMobileQuoteShare(root);
  }
  console.log("Mobile/tablet experience validation passed.");
} finally {
  await browser.close();
}
