import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "file:///C:/Users/muman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(here, "../assets/projects");

const allProjects = [
  { slug: "doxa-treasury", url: "https://doxatreasury.com" },
  { slug: "chromecraft", url: "https://andomatthew1234.github.io/Chromecraft" },
  { slug: "sydney-bush-dances", url: "https://sydneybushdances.com" },
  { slug: "king-royalty-eggs", url: "https://kingroyaltyeggs.com" },
];

const requestedSlugs = new Set(process.argv.slice(2));
const projects = requestedSlugs.size
  ? allProjects.filter((project) => requestedSlugs.has(project.slug))
  : allProjects;

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1.25,
  colorScheme: "light",
  reducedMotion: "reduce",
  locale: "en-AU",
});

for (const project of projects) {
  const page = await context.newPage();
  const destination = path.join(outputDirectory, `${project.slug}.webp`);

  try {
    const response = await page.goto(project.url, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    if (!response?.ok()) {
      throw new Error(`HTTP ${response?.status() ?? "unknown"}`);
    }

    await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {});
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    await page.screenshot({
      path: destination,
      type: "webp",
      quality: 88,
      animations: "disabled",
    });
    console.log(`Captured ${project.url} -> ${destination}`);
  } catch (error) {
    console.error(`Failed to capture ${project.url}: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await page.close();
  }
}

await browser.close();
