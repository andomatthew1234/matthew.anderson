import test from "node:test";
import assert from "node:assert/strict";
import { FEATURES, MODES, createInitialState, normaliseState, calculateEstimate, formatMoneyRange } from "../build-your-app/app-data.mjs";
import { createAppQuoteSnapshot, encodeAppQuote, decodeAppQuote } from "../build-your-app/app-code.mjs";

const state = (overrides = {}) => ({ ...createInitialState(), ...overrides });

test("each platform is included at every base price", () => {
  for (const [mode, min, max] of [["nativeMirror", 45000, 90000], ["connectedMirror", 25000, 50000], ["new", 35000, 90000]]) {
    for (const platform of ["both", "ios", "android"]) {
      const result = calculateEstimate(state({ mode, platform }));
      assert.deepEqual(result.totalCents, { min, max });
      assert.deepEqual(result.discountCents, { min: 0, max: 0 });
    }
  }
});

test("accounts and 2FA are exclusive alternatives", () => {
  assert.equal(calculateEstimate(state({ accounts: "standard" })).totalCents.min, 45000);
  const result = calculateEstimate(state({ accounts: "twoFactor", features: ["favourites"] }));
  assert.equal(result.totalCents.min, 61500);
  assert.equal(result.lines.filter(({ id }) => id === "accounts").length, 1);
  assert.equal(result.lines.find(({ id }) => id === "accounts").amountCents.min, 23000);
});

test("loyalty automatically includes store, accounts and one dashboard", () => {
  const result = calculateEstimate(state({ features: ["loyalty", "bookings", "forms", "reviews"] }));
  assert.deepEqual(result.totalCents, { min: 101500, max: 156500 });
  assert.deepEqual(result.dependencies.map(({ id }) => id).sort(), ["accounts", "dashboard", "store"]);
  assert.equal(result.lines.filter(({ id }) => id === "dashboard").length, 1);
  assert.ok(result.lines.find(({ id }) => id === "dashboard").automatic);
});

test("selected dependencies are charged once and not marked automatic", () => {
  const result = calculateEstimate(state({ accounts: "standard", features: ["loyalty", "store", "dashboard"] }));
  assert.equal(result.totalCents.min, 80000);
  assert.deepEqual(result.dependencies, []);
  assert.ok(result.lines.every(({ automatic }) => !automatic));
});

test("bookings permit guests; push alone does not require management extras", () => {
  const bookings = calculateEstimate(state({ features: ["bookings"] }));
  assert.equal(bookings.totalCents.min, 56000);
  assert.equal(bookings.effectiveState.accounts, "none");
  const push = calculateEstimate(state({ features: ["push"] }));
  assert.equal(push.totalCents.min, 42500);
  assert.deepEqual(push.dependencies, []);
});

test("all features retain fixed item prices", () => {
  const result = calculateEstimate(state({ features: FEATURES.map(({ id }) => id) }));
  for (const feature of FEATURES) assert.deepEqual(result.lines.find(({ id }) => id === feature.id).amountCents, { min: feature.priceCents, max: feature.priceCents });
  assert.equal(result.totalCents.min, 35000 + 10000 + FEATURES.reduce((sum, feature) => sum + feature.priceCents, 0));
});

test("mirror branch drops stale new-app options including custom notes", () => {
  for (const mode of ["nativeMirror", "connectedMirror"]) {
    const input = state({ mode, accounts: "twoFactor", features: FEATURES.map(({ id }) => id), sync: "connect", notes: "Custom requests", website: "https://example.com" });
    const result = calculateEstimate(input);
    assert.equal(result.lines.length, 1);
    assert.deepEqual(result.unpriced, []);
    assert.deepEqual(result.effectiveState.features, []);
    assert.equal(result.effectiveState.accounts, "none");
    assert.equal(result.effectiveState.sync, "none");
    assert.equal(result.effectiveState.notes, "");
    assert.equal(input.accounts, "twoFactor", "caller state stays unchanged");
  }
});

test("normalisation bounds strings, drops unknown fields/features and handles malformed state", () => {
  const input = state({ mode: "invalid", platform: "bad", accounts: "bad", features: ["search", "search", "unknown", {}, null], website: "x".repeat(900), notes: "y".repeat(9000), extra: true });
  const result = normaliseState(input);
  assert.equal(result.mode, "new");
  assert.equal(result.platform, "both");
  assert.equal(result.accounts, "none");
  assert.deepEqual(result.features, ["search"]);
  assert.equal(result.website.length, 250);
  assert.equal(result.notes.length, 1000);
  assert.equal(result.extra, undefined);
  assert.deepEqual(normaliseState(null), createInitialState());
  assert.equal(calculateEstimate(input).totalCents.min, 39000);
});

test("sync and custom requests remain unpriced", () => {
  for (const sync of ["connect", "unsure"]) {
    const result = calculateEstimate(state({ sync, notes: "Custom integration", website: "https://example.com" }));
    assert.equal(result.unpriced.length, 2);
    assert.deepEqual(result.totalCents, { min: 35000, max: 90000 });
  }
  assert.equal(formatMoneyRange({ min: 35000, max: 90000 }), "$350–$900 AUD");
});

test("quote codes roundtrip Unicode and keep selected versus automatic items", () => {
  const input = state({ features: ["loyalty"], notes: "Café 日本語 🌻", website: "https://example.com" });
  const snapshot = createAppQuoteSnapshot(input);
  const recovered = decodeAppQuote(encodeAppQuote(snapshot));
  assert.deepEqual(recovered, snapshot);
  assert.deepEqual(recovered.configuration.features, ["loyalty"]);
  assert.equal(recovered.quote.dependencies.length, 3);
  assert.equal(recovered.configuration.notes, input.notes);
  assert.equal(decodeAppQuote(encodeAppQuote(input)).quote.totalCents.min, 80000);
});

test("historical codes preserve stored version, labels and prices without recalculation", () => {
  const snapshot = createAppQuoteSnapshot(state());
  snapshot.pricingVersion = "historical-app-pricing-v0";
  snapshot.quote.lines[0].label = "Historical build package";
  snapshot.quote.lines[0].amountCents = { min: 12345, max: 23456 };
  snapshot.quote.totalCents = { min: 12345, max: 23456 };
  const recovered = decodeAppQuote(encodeAppQuote(snapshot));
  assert.deepEqual(recovered, snapshot);
  assert.notDeepEqual(recovered.quote.totalCents, calculateEstimate(recovered.configuration).totalCents);
  assert.deepEqual(createAppQuoteSnapshot(recovered.configuration).quote.totalCents, { min: 35000, max: 90000 });
});

test("schema 1 recovery survives removed live options and changed live pricing", () => {
  const snapshot = createAppQuoteSnapshot(state({ mode: "nativeMirror", website: "https://example.com" }));
  const nativeCode = encodeAppQuote(snapshot);
  const originalMode = MODES.nativeMirror;
  try {
    delete MODES.nativeMirror;
    assert.deepEqual(decodeAppQuote(nativeCode), snapshot);
  } finally { MODES.nativeMirror = originalMode; }

  const featureSnapshot = createAppQuoteSnapshot(state({ features: ["search"] }));
  const featureCode = encodeAppQuote(featureSnapshot);
  const feature = FEATURES.find(({ id }) => id === "search");
  const originalId = feature.id;
  const originalPrice = feature.priceCents;
  try {
    feature.id = "replacement-search";
    feature.priceCents = 99900;
    assert.deepEqual(decodeAppQuote(featureCode), featureSnapshot);
  } finally { feature.id = originalId; feature.priceCents = originalPrice; }
});

test("schema 1 validation rejects unknown options, duplicate features and mirror extras", () => {
  const invalidConfigurations = [
    { mode: "future-mode" }, { platform: "desktop" }, { accounts: "free" }, { sync: "always" },
    { features: ["unknown-feature"] }, { features: ["search", "search"] },
    { mode: "nativeMirror", features: ["search"] },
    { mode: "connectedMirror", accounts: "standard" },
    { mode: "nativeMirror", sync: "connect" },
    { mode: "connectedMirror", notes: "Stale custom request" },
    { notes: "x".repeat(1001) }, { website: "x".repeat(251) },
  ];
  for (const changes of invalidConfigurations) {
    const snapshot = createAppQuoteSnapshot(state());
    Object.assign(snapshot.configuration, changes);
    assert.throws(() => encodeAppQuote(snapshot));
  }
});

test("codes reject checksum tampering, malformed and oversized payloads", () => {
  const code = encodeAppQuote(state());
  for (const invalid of [null, "", "BBM1-abc.12345678", code.slice(0, -1) + (code.endsWith("0") ? "1" : "0"), "MA1-!.12345678", "MA1-a.00000000", "x".repeat(30001)]) assert.throws(() => decodeAppQuote(invalid));
});

test("snapshot validation rejects corrupt arithmetic and structure", () => {
  for (const mutate of [
    (s) => { s.quote.totalCents.min += 1; },
    (s) => { s.quote.lines[0].amountCents.min = -1; },
    (s) => { s.quote.lines[0].amountCents.min = 0.1; },
    (s) => { s.quote.lines.push(s.quote.lines[0]); },
    (s) => { s.quote.dependencies.push({ id: "missing", reason: "Invalid" }); },
    (s) => { s.generatedAt = "2026-02-31T00:00:00.000Z"; },
    (s) => { s.configuration.accounts = "invalid"; },
    (s) => { s.quote.lines[0].label = "x".repeat(181); },
  ]) {
    const snapshot = createAppQuoteSnapshot(state());
    mutate(snapshot);
    assert.throws(() => encodeAppQuote(snapshot));
  }
});
