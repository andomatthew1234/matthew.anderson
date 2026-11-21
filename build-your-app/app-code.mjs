import { PRICING_VERSION, calculateEstimate, normaliseState } from "./app-data.mjs?v=2";

const MAX_CODE_LENGTH = 45000;
const MAX_PAYLOAD_BYTES = 32768;
const MAX_CENTS = 100000000;
const invalid = () => { throw new Error("This app quote code is invalid or damaged. Please check the full code."); };
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function text(value, limit, allowEmpty = false) {
  if (typeof value !== "string" || value.length > limit || (!allowEmpty && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) invalid();
  return value;
}
function range(value) {
  if (!object(value) || !Number.isSafeInteger(value.min) || !Number.isSafeInteger(value.max) || value.min < 0 || value.max < value.min || value.max > MAX_CENTS) invalid();
  return { min: value.min, max: value.max };
}
function list(value, limit) {
  if (!Array.isArray(value) || value.length > limit) invalid();
  return value;
}
// These describe the wire format, not the live catalogue. Keep schema 1 intact
// when adding/removing options in app-data; use a new schema for incompatible changes.
const SCHEMA_ONE_FEATURES = new Set(["bookings", "push", "store", "search", "favourites", "forms", "news", "uploads", "qr", "offline", "loyalty", "reviews", "dashboard"]);
function enumValue(value, allowed) {
  if (!allowed.includes(value)) invalid();
  return value;
}
function configuration(value) {
  if (!object(value)) invalid();
  const mode = enumValue(value.mode, ["nativeMirror", "connectedMirror", "new"]);
  const platform = enumValue(value.platform, ["both", "ios", "android"]);
  const accounts = enumValue(value.accounts, ["none", "standard", "twoFactor"]);
  const sync = enumValue(value.sync, ["none", "connect", "unsure"]);
  const features = list(value.features, SCHEMA_ONE_FEATURES.size).map((id) => {
    if (!SCHEMA_ONE_FEATURES.has(id)) invalid();
    return id;
  });
  if (new Set(features).size !== features.length) invalid();
  const website = text(value.website, 250, true);
  const notes = text(value.notes, 1000, true);
  // Optional extension: pre-custom-feature schema-1 codes omit this field.
  const customFeatures = value.customFeatures === undefined ? [] : list(value.customFeatures, 20).map((name) => {
    const clean = text(name, 80);
    if (clean !== clean.trim() || /[\u0000-\u001f\u007f-\u009f]/u.test(clean) || /\s{2,}/u.test(clean)) invalid();
    return clean;
  });
  if (website !== website.trim() || notes !== notes.trim()) invalid();
  if (mode !== "new" && (accounts !== "none" || features.length || sync !== "none" || notes || customFeatures.length)) invalid();
  return { mode, platform, accounts, features, website, sync, notes, customFeatures };
}

// Decode checks the stored arithmetic, never the current price catalogue. Quote
// codes are portable estimates, not signed proof of an agreed or paid price.
function validateSnapshot(value) {
  if (!object(value) || value.schemaVersion !== 1 || value.projectType !== "mobile-app" || !object(value.quote)) invalid();
  const quote = value.quote;
  const lines = list(quote.lines, 50).map((line) => {
    if (!object(line) || typeof line.automatic !== "boolean") invalid();
    return { id: text(line.id, 80), label: text(line.label, 180), amountCents: range(line.amountCents), automatic: line.automatic, ...(line.note === undefined ? {} : { note: text(line.note, 300) }) };
  });
  if (!lines.length || new Set(lines.map(({ id }) => id)).size !== lines.length) invalid();
  const totalCents = range(quote.totalCents);
  const discountCents = range(quote.discountCents);
  const sum = lines.reduce((result, line) => ({ min: result.min + line.amountCents.min, max: result.max + line.amountCents.max }), { min: 0, max: 0 });
  if (sum.min - discountCents.min !== totalCents.min || sum.max - discountCents.max !== totalCents.max) invalid();
  const dependencies = list(quote.dependencies, 30).map((entry) => {
    if (!object(entry)) invalid();
    const id = text(entry.id, 80);
    if (!lines.some((line) => line.id === id && line.automatic)) invalid();
    return { id, reason: text(entry.reason, 500) };
  });
  if (new Set(dependencies.map(({ id }) => id)).size !== dependencies.length) invalid();
  const unpriced = list(quote.unpriced, 30).map((entry) => text(entry, 500));
  const generatedAt = text(value.generatedAt, 30);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(generatedAt) || !Number.isFinite(Date.parse(generatedAt)) || new Date(generatedAt).toISOString() !== generatedAt) invalid();
  const savedConfiguration = configuration(value.configuration);
  const customLines = lines.filter((line) => /^custom-/u.test(line.id));
  if (customLines.length !== savedConfiguration.customFeatures.length) invalid();
  savedConfiguration.customFeatures.forEach((name, index) => {
    const line = customLines.find((entry) => entry.id === `custom-${index + 1}`);
    if (!line || line.label !== `Custom feature: ${name}` || line.automatic) invalid();
  });
  return { schemaVersion: 1, projectType: "mobile-app", pricingVersion: text(value.pricingVersion, 100), configuration: savedConfiguration, quote: { lines, totalCents, dependencies, unpriced, discountCents }, generatedAt };
}

export function createAppQuoteSnapshot(state) {
  const configuration = normaliseState(state);
  const { lines, totalCents, dependencies, unpriced, discountCents } = calculateEstimate(configuration);
  return validateSnapshot({ schemaVersion: 1, projectType: "mobile-app", pricingVersion: PRICING_VERSION, configuration, quote: { lines, totalCents, dependencies, unpriced, discountCents }, generatedAt: new Date().toISOString() });
}

function checksum(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

export function encodeAppQuote(stateOrSnapshot) {
  const snapshot = object(stateOrSnapshot) && "schemaVersion" in stateOrSnapshot ? validateSnapshot(stateOrSnapshot) : createAppQuoteSnapshot(stateOrSnapshot);
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
  if (bytes.length > MAX_PAYLOAD_BYTES) invalid();
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const payload = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
  return `MA1-${payload}.${checksum(bytes)}`;
}

export function decodeAppQuote(input) {
  if (typeof input !== "string" || input.length > MAX_CODE_LENGTH) invalid();
  const code = input.trim();
  const parts = /^MA1-([A-Za-z0-9_-]+)\.([a-f0-9]{8})$/u.exec(code);
  if (!parts || parts[1].length % 4 === 1) invalid();
  try {
    const payload = parts[1].replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="));
    if (binary.length > MAX_PAYLOAD_BYTES) invalid();
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (checksum(bytes) !== parts[2]) invalid();
    return validateSnapshot(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
  } catch { return invalid(); }
}
