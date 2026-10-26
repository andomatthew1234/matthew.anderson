import {
  PRICING_VERSION,
  SCHEMA_VERSION,
  calculateEstimate,
  resolveDependencies,
  serialisableState,
} from "./configurator-data.mjs?v=6";

const MAX_CODE_LENGTH = 200_000;

export function canonicalise(value) {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalise(value[key])]));
  }
  return value;
}

export const canonicalStringify = (value) => JSON.stringify(canonicalise(value));

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("The configuration code contains invalid characters.");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  let binary;
  try { binary = atob(padded); } catch { throw new Error("The configuration code could not be decoded."); }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function crc32(text) {
  const bytes = new TextEncoder().encode(text);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

export function hostingLabel(hosting) {
  if (hosting === "static") return "Static website — GitHub Pages";
  if (hosting === "firebase") return "Interactive website — Google Firebase";
  return "Customer-provided hosting";
}

export function createQuoteSnapshot(state) {
  const configuration = serialisableState(state);
  const quote = calculateEstimate(configuration);
  const resolved = resolveDependencies(configuration);
  return canonicalise({
    schemaVersion: SCHEMA_VERSION,
    pricingVersion: PRICING_VERSION,
    presetId: configuration.presetId,
    configuration,
    effectiveConfiguration: serialisableState(resolved.effective),
    hosting: {
      id: resolved.effective.hosting,
      label: hostingLabel(resolved.effective.hosting),
      byoPlatform: configuration.byoPlatform || "",
    },
    dependencies: quote.dependencies,
    quote,
  });
}

export function encodeConfiguration(stateOrSnapshot) {
  const snapshot = stateOrSnapshot?.schemaVersion ? canonicalise(stateOrSnapshot) : createQuoteSnapshot(stateOrSnapshot);
  const json = canonicalStringify(snapshot);
  const payload = bytesToBase64Url(new TextEncoder().encode(json));
  return `BBM1-${payload}.${crc32(json)}`;
}

function validatePrice(price, label) {
  if (!Array.isArray(price) || price.length !== 2 || price.some((value) => !Number.isFinite(value) || value < 0) || price[0] > price[1]) {
    throw new Error(`The saved ${label} price is invalid.`);
  }
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new Error("The configuration data is invalid.");
  if (snapshot.schemaVersion !== SCHEMA_VERSION) throw new Error(`Configuration schema ${snapshot.schemaVersion ?? "unknown"} is not supported.`);
  if (typeof snapshot.pricingVersion !== "string" || !snapshot.pricingVersion) throw new Error("The pricing version is missing.");
  if (!snapshot.configuration || typeof snapshot.configuration !== "object") throw new Error("The saved configuration is missing.");
  if (!snapshot.quote || !Array.isArray(snapshot.quote.lines) || !snapshot.quote.totals) throw new Error("The saved quote is incomplete.");
  if (snapshot.quote.lines.length > 250 || (snapshot.quote.unpriced?.length || 0) > 100) throw new Error("The saved quote is unexpectedly large.");
  snapshot.quote.lines.forEach((line, index) => {
    if (!line || typeof line.name !== "string" || line.name.length > 240 || typeof line.group !== "string") throw new Error(`Saved quote line ${index + 1} is invalid.`);
    validatePrice(line.price, `line ${index + 1}`);
  });
  validatePrice([snapshot.quote.totals.min, snapshot.quote.totals.max], "total");
  if (!Array.isArray(snapshot.quote.unpriced) || snapshot.quote.unpriced.some((item) => typeof item !== "string" || item.length > 240)) throw new Error("The saved custom-price items are invalid.");
  if (!snapshot.hosting || typeof snapshot.hosting.id !== "string" || typeof snapshot.hosting.label !== "string") throw new Error("The saved hosting selection is invalid.");
  return snapshot;
}

export function decodeConfiguration(code) {
  const input = String(code || "").trim();
  if (!input) throw new Error("Enter a configuration code.");
  if (input.length > MAX_CODE_LENGTH) throw new Error("The configuration code is too long.");
  if (!input.startsWith("BBM1-")) throw new Error("This is not a supported BuiltByMatthew configuration code.");
  const separator = input.lastIndexOf(".");
  if (separator <= 5 || !/^[0-9a-f]{8}$/iu.test(input.slice(separator + 1))) throw new Error("The configuration code is incomplete.");
  const payload = input.slice(5, separator);
  let json;
  try { json = new TextDecoder("utf-8", { fatal: true }).decode(base64UrlToBytes(payload)); }
  catch (error) { throw new Error(error.message || "The configuration code could not be decoded."); }
  if (crc32(json) !== input.slice(separator + 1).toLowerCase()) throw new Error("The configuration code is corrupted. Check that the full code was copied.");
  let snapshot;
  try { snapshot = JSON.parse(json); } catch { throw new Error("The configuration code contains invalid data."); }
  return validateSnapshot(snapshot);
}

export function restoreConfiguration(snapshot) {
  return serialisableState(validateSnapshot(snapshot).configuration);
}
