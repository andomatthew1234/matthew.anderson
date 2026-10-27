import { chmod, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { footerMarkup } from "../components/site-footer-markup.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.resolve(root, "dist");

if (path.dirname(outputDirectory) !== root || path.basename(outputDirectory) !== "dist") {
  throw new Error(`Refusing to rebuild unexpected output path: ${outputDirectory}`);
}

async function makeTreeWritable(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const child = path.join(directory, entry.name);
    await makeTreeWritable(child);
    await chmod(child, 0o777).catch(() => {});
  }));
  await chmod(directory, 0o777).catch(() => {});
}

const entries = [
  "index.html",
  "styles.css",
  "script.js",
  "portfolio-projects.js",
  "portfolio-gallery.js",
  "favicon.png",
  "CNAME",
  "assets",
  "components",
  "vendor",
  "terms",
  "confirmation",
  "build-your-site",
  "quote-viewer",
];

await makeTreeWritable(outputDirectory);
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of entries) {
  await cp(path.join(root, entry), path.join(outputDirectory, entry), { recursive: true });
}

const footerPages = [
  { file: "index.html", siteRoot: "./" },
  { file: "build-your-site/index.html", siteRoot: "../" },
  { file: "quote-viewer/index.html", siteRoot: "../" },
  { file: "terms/index.html", siteRoot: "../" },
];

for (const { file, siteRoot } of footerPages) {
  const outputPath = path.join(outputDirectory, file);
  const source = await readFile(outputPath, "utf8");
  const marker = "<builtbymatthew-footer></builtbymatthew-footer>";
  if (!source.includes(marker)) throw new Error(`Missing footer marker in ${file}`);
  const rendered = source.replace(
    marker,
    `<builtbymatthew-footer>${footerMarkup({ siteRoot })}</builtbymatthew-footer>`,
  );
  await writeFile(outputPath, rendered);
}

console.log(`Built static site in ${outputDirectory}`);
