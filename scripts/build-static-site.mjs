import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.resolve(root, "dist");

if (path.dirname(outputDirectory) !== root || path.basename(outputDirectory) !== "dist") {
  throw new Error(`Refusing to rebuild unexpected output path: ${outputDirectory}`);
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
  "vendor",
  "terms",
  "confirmation",
  "build-your-site",
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of entries) {
  await cp(path.join(root, entry), path.join(outputDirectory, entry), { recursive: true });
}

console.log(`Built static site in ${outputDirectory}`);
