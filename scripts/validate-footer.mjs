import { chromium } from "file:///C:/Users/muman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const DEFAULT_ORIGIN = "http://127.0.0.1:48621/";
const rootArguments = process.argv.slice(2);
const roots = rootArguments.length
  ? rootArguments.map((argument) => new URL(argument))
  : [new URL(DEFAULT_ORIGIN), new URL("dist/", DEFAULT_ORIGIN)];
const routes = ["", "build-your-site/", "quote-viewer/", "terms/"];
const browser = await chromium.launch({ headless: true });
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const expectedCopy = {
  title: "Websites built properly.",
  contactTitle: "Have something in mind?",
  support: "Let's make your next website happen.",
  final: "Designed & developed by Matthew.",
};

const compactText = (value) => value.replace(/\s+/g, " ").trim();

async function revealFooter(page) {
  const items = page.locator(".footer-reveal");
  for (let index = 0; index < (await items.count()); index += 1) {
    await items.nth(index).scrollIntoViewIfNeeded();
    await page.waitForTimeout(280);
  }
  await page.waitForTimeout(900);
}

async function validatePage(root, route, viewport, reducedMotion = "no-preference") {
  const url = new URL(route, root);
  const label = `${url.pathname || "/"} ${viewport.width}px ${reducedMotion}`;
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const response = await page.goto(url.href, { waitUntil: "load" });
  assert(response?.ok(), `${label}: page returned ${response?.status()}`);
  await page.waitForSelector("builtbymatthew-footer[data-ready='true'] .editorial-footer");
  await page.waitForFunction(() => {
    const footer = document.querySelector(".editorial-footer");
    return footer && getComputedStyle(footer).paddingTop !== "0px";
  });

  if (reducedMotion === "no-preference") await revealFooter(page);

  const snapshot = await page.evaluate(() => {
    const host = document.querySelector("builtbymatthew-footer");
    const footer = host?.querySelector("footer");
    const main = document.querySelector("main");
    const futureLabels = [...host.querySelectorAll(".editorial-footer__future")];
    const links = [...host.querySelectorAll("a")];
    return {
      hosts: document.querySelectorAll("builtbymatthew-footer").length,
      semanticFooters: host?.querySelectorAll("footer").length ?? 0,
      footerAfterMain: Boolean(main && footer && (main.compareDocumentPosition(host) & Node.DOCUMENT_POSITION_FOLLOWING)),
      title: host.querySelector("#site-footer-title")?.textContent.replace(/\s+/g, " ").trim(),
      contactTitle: host.querySelector("#site-footer-contact-title")?.textContent.trim(),
      support: host.querySelector(".editorial-footer__contact-copy p")?.textContent.trim(),
      emailCta: host.querySelector(".editorial-footer__email-cta")?.textContent.replace(/\s+/g, " ").trim(),
      emailAddress: host.querySelector(".editorial-footer__email-address")?.textContent.trim(),
      mailtoLinks: links.filter((link) => link.href === "mailto:matthew@andomail.com").length,
      year: host.querySelector("[data-footer-year]")?.textContent.trim(),
      copyright: host.querySelector(".editorial-footer__final p")?.textContent.replace(/\s+/g, " ").trim(),
      final: host.querySelector(".editorial-footer__final p:last-child")?.textContent.trim(),
      navigationLabels: [...host.querySelectorAll(".editorial-footer__navigation h3")].map((node) => node.textContent.trim()),
      futureLabels: futureLabels.map((node) => node.textContent.replace(/\s+/g, " ").trim()),
      futureAnchors: futureLabels.filter((node) => node.closest("a")).length,
      aboutTargets: document.querySelectorAll("#about").length,
      socialLinks: links.filter((link) => /instagram|github/i.test(`${link.textContent} ${link.href}`)).length,
      hrefs: Object.fromEntries(
        ["Home", "My work", "Build your site", "Terms & conditions"].map((text) => [
          text,
          links.find((link) => link.textContent.trim() === text)?.href,
        ]),
      ),
      docWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      reveal: [...host.querySelectorAll(".footer-reveal")].map((node) => {
        const style = getComputedStyle(node);
        return { opacity: style.opacity, transform: style.transform };
      }),
      mobileLinkHeights: links.map((link) => link.getBoundingClientRect().height),
    };
  });

  assert(snapshot.hosts === 1 && snapshot.semanticFooters === 1, `${label}: footer is not a single reusable semantic component`);
  assert(snapshot.footerAfterMain, `${label}: footer is not positioned after main content`);
  assert(snapshot.title === expectedCopy.title, `${label}: main footer heading changed (${snapshot.title})`);
  assert(snapshot.contactTitle === expectedCopy.contactTitle, `${label}: contact heading changed`);
  assert(snapshot.support === expectedCopy.support, `${label}: supporting copy changed`);
  assert(snapshot.emailCta === "Email me ↗", `${label}: email CTA changed (${snapshot.emailCta})`);
  assert(snapshot.emailAddress === "matthew@andomail.com" && snapshot.mailtoLinks === 3, `${label}: email links are incorrect`);
  assert(snapshot.year === String(new Date().getFullYear()), `${label}: footer year is not dynamic/current`);
  assert(snapshot.copyright === `© ${new Date().getFullYear()} BuiltByMatthew.`, `${label}: copyright text is incorrect`);
  assert(snapshot.final === expectedCopy.final, `${label}: final credit changed`);
  assert(JSON.stringify(snapshot.navigationLabels) === JSON.stringify(["Explore", "Information", "Contact"]), `${label}: footer columns changed`);
  assert(snapshot.futureAnchors === 0, `${label}: future routes are clickable`);
  assert(snapshot.aboutTargets === 1, `${label}: About does not resolve to one clearly labelled future target`);
  assert(snapshot.socialLinks === 0, `${label}: unconfigured social link was invented`);
  assert(snapshot.futureLabels.includes("About Coming soon"), `${label}: About is not clearly marked as future`);
  assert(snapshot.futureLabels.includes("How it works Coming soon"), `${label}: How it works is not clearly marked as future`);
  assert(snapshot.futureLabels.includes("Frequently asked questions Coming soon"), `${label}: FAQ is not clearly marked as future`);
  assert(snapshot.futureLabels.includes("Privacy policy Coming soon"), `${label}: Privacy policy is not clearly marked as future`);
  assert(snapshot.hrefs.Home === new URL("", root).href, `${label}: Home link is wrong (${snapshot.hrefs.Home})`);
  assert(snapshot.hrefs["My work"] === new URL("#work", root).href, `${label}: My work link is wrong`);
  assert(snapshot.hrefs["Build your site"] === new URL("build-your-site/", root).href, `${label}: Build your site link is wrong`);
  assert(snapshot.hrefs["Terms & conditions"] === new URL("terms/", root).href, `${label}: Terms link is wrong`);
  assert(snapshot.docWidth <= snapshot.clientWidth, `${label}: document has horizontal overflow (${snapshot.docWidth} > ${snapshot.clientWidth})`);
  assert(snapshot.reveal.every(({ opacity, transform }) => opacity === "1" && transform === "none"), `${label}: footer reveal content remained hidden`);
  if (viewport.width <= 760) {
    assert(snapshot.mobileLinkHeights.every((height) => height >= 43.5), `${label}: a footer link has an undersized touch target`);
  }
  assert(errors.length === 0, `${label}: browser errors: ${errors.join(" | ")}`);

  await page.locator(".editorial-footer__email-cta").focus();
  const focusOutline = await page.locator(".editorial-footer__email-cta").evaluate((node) => {
    const style = getComputedStyle(node);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  assert(focusOutline.style !== "none" && Number.parseFloat(focusOutline.width) >= 2, `${label}: keyboard focus is not visible`);

  if (reducedMotion === "reduce") {
    const motion = await page.locator(".footer-reveal").first().evaluate((node) => {
      const style = getComputedStyle(node);
      return { transition: style.transitionDuration, animation: style.animationDuration };
    });
    assert(Number.parseFloat(motion.transition) <= 0.00001, `${label}: reduced-motion transition remains (${motion.transition})`);
    assert(Number.parseFloat(motion.animation) <= 0.00001, `${label}: reduced-motion animation remains (${motion.animation})`);
  }

  if (/build-your-site|quote-viewer/.test(route)) {
    await page.emulateMedia({ media: "print" });
    const printDisplay = await page.locator("builtbymatthew-footer").evaluate((node) => getComputedStyle(node).display);
    assert(printDisplay === "none", `${label}: footer appears in quote print layout`);
  }

  await context.close();
  console.log(`PASS ${label}`);
}

try {
  for (const root of roots) {
    for (const route of routes) {
      await validatePage(root, route, { width: 1440, height: 900 });
      await validatePage(root, route, { width: 390, height: 844 });
    }
    await validatePage(root, "", { width: 1024, height: 768 });
    await validatePage(root, "build-your-site/", { width: 1024, height: 768 });
    await validatePage(root, "", { width: 390, height: 844 }, "reduce");
  }

  for (const root of roots) {
    for (const route of ["", "build-your-site/", "terms/"]) {
      const response = await fetch(new URL(route, root));
      assert(response.ok, `${new URL(route, root).href}: internal footer destination returned ${response.status}`);
    }
  }

  for (const root of roots.filter((root) => root.pathname.includes("/dist/") || root.protocol === "https:")) {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(new URL("", root).href, { waitUntil: "load" });
    const fallback = await page.evaluate(() => ({
      footers: document.querySelectorAll("builtbymatthew-footer footer").length,
      title: document.querySelector("#site-footer-title")?.textContent.replace(/\s+/g, " ").trim(),
      email: document.querySelector('.editorial-footer__email-cta[href="mailto:matthew@andomail.com"]')?.textContent.replace(/\s+/g, " ").trim(),
      width: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    assert(fallback.footers === 1, `${root.href}: built footer disappears without JavaScript`);
    assert(fallback.title === expectedCopy.title && fallback.email === "Email me ↗", `${root.href}: no-JavaScript footer copy is incomplete`);
    assert(fallback.width <= fallback.client, `${root.href}: no-JavaScript footer overflows`);
    await context.close();
    console.log(`PASS ${root.pathname} no-javascript footer`);
  }
  console.log(`Footer validation passed for ${roots.length} site root(s).`);
} finally {
  await browser.close();
}
