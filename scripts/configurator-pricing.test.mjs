import assert from "node:assert/strict";
import { statSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  PRESET_CONFIG,
  PRICING_VERSION,
  SCHEMA_VERSION,
  VISUAL_CONFIG,
  applyPreset,
  calculateEstimate,
  createInitialState,
  getDashboardDependencies,
  normaliseState,
  requiresBackend,
  resolveDependencies,
  serialisableState,
} from "../build-your-site/configurator-data.mjs";
import {
  canonicalStringify,
  createQuoteSnapshot,
  crc32,
  decodeConfiguration,
  encodeConfiguration,
  restoreConfiguration,
} from "../build-your-site/configuration-code.mjs";

const totals = (state) => calculateEstimate(state).totals;
const lineNames = (state) => calculateEstimate(state).lines.map((line) => line.name);

function assertTotals(state, min, max) {
  assert.deepEqual(totals(state), { min, max });
}

function assertQuoteAddsUp(state) {
  const quote = calculateEstimate(state);
  const priced = quote.lines.filter((line) => !line.included);
  assert.equal(quote.totals.min, priced.reduce((sum, line) => sum + line.price[0], 0));
  assert.equal(quote.totals.max, priced.reduce((sum, line) => sum + line.price[1], 0));
  quote.lines.forEach((line) => {
    assert.ok(Array.isArray(line.price) && line.price.length === 2, `${line.name} has no price pair`);
    assert.ok(line.price[0] <= line.price[1], `${line.name} has an inverted range`);
  });
}

test("every configured visual points to a production asset", () => {
  const configuratorRoot = new URL("../build-your-site/", import.meta.url);
  assert.ok(Object.keys(VISUAL_CONFIG).length > 0);
  for (const [key, visual] of Object.entries(VISUAL_CONFIG)) {
    const asset = fileURLToPath(new URL(visual.src, configuratorRoot));
    assert.ok(statSync(asset).size > 5_000, `${key} visual is missing or unexpectedly small`);
  }
});

test("starting from scratch contains only the required homepage and included SEO", () => {
  const state = createInitialState();
  assert.equal(state.presetId, "scratch");
  assert.deepEqual(Object.entries(state.pages).filter(([, selected]) => selected).map(([id]) => id), ["home"]);
  assert.equal(state.hosting, "static");
  assertTotals(state, 50, 100);
  assert.deepEqual(lineNames(state), ["Homepage / landing page", "Basic SEO"]);
});

test("all starting presets apply their exact selections without a preset fee", () => {
  const expected = {
    scratch: { total: [50, 100], hosting: "static", pages: ["home"] },
    comingSoon: { total: [50, 100], hosting: "static", pages: ["home"] },
    smallBusiness: { total: [220, 330], hosting: "firebase", pages: ["home", "about", "contact"] },
    onlineStore: { total: [190, 360], hosting: "firebase", pages: ["home", "store"] },
    eventsCommunity: { total: [130, 220], hosting: "firebase", pages: ["home", "events"] },
    portfolio: { total: [130, 200], hosting: "static", pages: ["home", "contact", "gallery"] },
    restaurant: { total: [90, 160], hosting: "static", pages: ["home", "contact"] },
    onlineLearning: { total: [260, 345], hosting: "firebase", pages: ["home", "courses"] },
  };

  assert.deepEqual(Object.keys(PRESET_CONFIG), Object.keys(expected));
  for (const [id, oracle] of Object.entries(expected)) {
    const state = applyPreset(id);
    assert.equal(state.presetId, id);
    assert.equal(state.hosting, oracle.hosting);
    assert.deepEqual(Object.entries(state.pages).filter(([, selected]) => selected).map(([page]) => page), oracle.pages);
    assertTotals(state, ...oracle.total);
    assert.equal(calculateEstimate(state).lines.some((line) => /preset|package/i.test(line.name)), false, `${id} charged a preset fee`);
  }
});

test("page grid uses individual fixed and ranged prices", () => {
  const cases = {
    faq: [65, 115], testimonials: [80, 130], team: [65, 115], services: [90, 140],
    careers: [90, 160], donations: [80, 130],
  };
  for (const [page, range] of Object.entries(cases)) {
    const state = createInitialState();
    state.pages[page] = true;
    assertTotals(state, ...range);
  }

  const custom = createInitialState();
  custom.customPageCount = 3;
  assertTotals(custom, 200, 310);
  assert.equal(calculateEstimate(custom).lines.find((line) => line.quantity === 3)?.name, "Additional custom pages (3)");
});

test("homepage remains selected and quantities are normalised to supported limits", () => {
  const state = createInitialState();
  state.pages.home = false;
  state.customPageCount = 999;
  state.languageCount = 1;
  state.socialCount = 999;
  normaliseState(state);
  assert.equal(state.pages.home, true);
  assert.equal(state.customPageCount, 20);
  assert.equal(state.languageCount, 7);
  assert.equal(state.socialCount, 50);
});

test("restaurant-menu and help-centre tiers replace instead of stack", () => {
  const state = createInitialState();
  state.menuTier = "image";
  assertTotals(state, 60, 110);
  state.menuTier = "interactive";
  let quote = calculateEstimate(state);
  assert.deepEqual(quote.totals, { min: 50, max: 100 });
  assert.deepEqual(quote.unpriced, ["Interactive restaurant menu"]);
  assert.equal(lineNames(state).includes("Image-only restaurant menu"), false);

  state.menuTier = "none";
  for (const [tier, range, name] of [
    ["bundle", [90, 140], "FAQ + support articles bundle"],
    ["standard", [80, 130], "Standard support articles"],
    ["professional", [120, 240], "Professional Help Centre"],
  ]) {
    state.helpTier = tier;
    assertTotals(state, ...range);
    quote = calculateEstimate(state);
    assert.equal(quote.lines.filter((line) => /support articles|Help Centre/.test(line.name)).length, 1);
    assert.ok(lineNames(state).includes(name));
  }
  assert.equal(requiresBackend(state), true);
});

test("courses add Standard accounts, preserve Full accounts, and release derived accounts when removed", () => {
  const state = createInitialState();
  state.pages.courses = true;
  let resolved = resolveDependencies(state);
  assert.equal(resolved.effective.accounts, "standard");
  assert.deepEqual(resolved.dependencies.map((item) => item.owner), ["courses"]);
  assertTotals(state, 260, 345);

  state.accounts = "full";
  resolved = resolveDependencies(state);
  assert.equal(resolved.effective.accounts, "full");
  assert.equal(resolved.dependencies.some((item) => item.target === "accounts"), false);

  state.accounts = "none";
  state.pages.courses = false;
  resolved = resolveDependencies(state);
  assert.equal(resolved.effective.accounts, "none");
  assertTotals(state, 50, 100);
});

test("member RSVP and courses share the same minimum account dependency", () => {
  const state = createInitialState();
  state.pages.courses = true;
  state.rsvp = "member";
  let quote = calculateEstimate(state);
  assert.equal(quote.lines.filter((line) => line.name === "Standard customer accounts").length, 1);
  assert.equal(resolveDependencies(state).effective.accounts, "standard");

  state.rsvp = "none";
  assert.equal(resolveDependencies(state).effective.accounts, "standard");
  state.pages.courses = false;
  assert.equal(resolveDependencies(state).effective.accounts, "none");
});

test("payment, account, CMS, analytics, chat, reviews and forms tiers are mutually exclusive", () => {
  const state = createInitialState();
  const cases = [
    ["payments", ["links", "professional"], ["Payment links", "Professional checkout"]],
    ["accounts", ["standard", "full"], ["Standard customer accounts", "Full accounts & login suite"]],
    ["cms", ["basic", "full"], ["Basic editor", "Full visual editor"]],
    ["analytics", ["standard", "advanced"], ["Standard analytics", "Advanced analytics & trends"]],
    ["liveChat", ["ai", "human"], ["AI-powered live chat", "AI chat + human live chat"]],
    ["reviews", ["manual", "customer"], ["Manually managed reviews", "Customer-submitted reviews"]],
    ["communityForms", ["standard", "advanced"], ["Standard polls & community forms", "Advanced polls & community forms"]],
  ];
  for (const [field, tiers, names] of cases) {
    state[field] = tiers[0];
    assert.ok(lineNames(state).includes(names[0]));
    state[field] = tiers[1];
    const namesAfterUpgrade = lineNames(state);
    assert.ok(namesAfterUpgrade.includes(names[1]));
    assert.equal(namesAfterUpgrade.includes(names[0]), false, `${field} lower tier remained after upgrade`);
    state[field] = "none";
  }
});

test("dashboard base is charged once and integrations are unique by selected service", () => {
  const state = createInitialState();
  Object.assign(state, { contactForm: true, newsletter: true, blog: true });
  const quote = calculateEstimate(state);
  assert.deepEqual(getDashboardDependencies(state), ["contactForm", "blog", "newsletter"]);
  assert.equal(quote.lines.filter((line) => line.name === "Admin dashboard").length, 1);
  assert.deepEqual(quote.lines.find((line) => line.name === "Dashboard integrations (3)")?.price, [30, 30]);
  assertTotals(state, 250, 360);

  state.contactForm = false;
  assert.deepEqual(getDashboardDependencies(state), ["blog", "newsletter"]);
  state.blog = false;
  state.newsletter = false;
  assert.equal(lineNames(state).includes("Admin dashboard"), false);
  state.dashboardExplicit = true;
  assertTotals(state, 110, 160);
});

test("multilingual packages, quantities, upgrades and custom translation pricing are deterministic", () => {
  const state = createInitialState();
  state.multilingual = "3";
  assertTotals(state, 80, 130);
  state.translation = "ai";
  assertTotals(state, 85, 135);
  state.multilingual = "6";
  assertTotals(state, 100, 150);
  state.multilingual = "more";
  state.languageCount = 10;
  assertTotals(state, 113, 163);
  assert.equal(calculateEstimate(state).lines.filter((line) => /translation/i.test(line.name)).length, 1);

  state.translation = "human";
  const quote = calculateEstimate(state);
  assert.deepEqual(quote.totals, { min: 108, max: 158 });
  assert.deepEqual(quote.unpriced, ["Professional human translation"]);
  state.multilingual = "none";
  assertTotals(state, 50, 100);
  assert.equal(calculateEstimate(state).unpriced.length, 0);
});

test("loyalty rewards apply checkout, Full accounts and dashboard exactly once", () => {
  const state = createInitialState();
  state.loyalty = true;
  const resolved = resolveDependencies(state);
  assert.equal(resolved.effective.payments, "professional");
  assert.equal(resolved.effective.accounts, "full");
  assert.deepEqual(resolved.dashboardDependencies, ["fullAccounts", "loyalty"]);
  assertTotals(state, 440, 740);
  assert.equal(lineNames(state).filter((name) => name === "Professional checkout").length, 1);
  assert.equal(lineNames(state).filter((name) => name === "Full accounts & login suite").length, 1);
});

test("gift cards and paid downloads apply Professional checkout without duplicate charges", () => {
  const gift = createInitialState();
  gift.giftCards = true;
  assert.equal(resolveDependencies(gift).effective.payments, "professional");
  assertTotals(gift, 280, 420);

  const download = createInitialState();
  download.digitalDownloads = true;
  assert.equal(resolveDependencies(download).effective.payments, "none");
  assertTotals(download, 170, 220);
  download.paidDownloads = true;
  assert.equal(resolveDependencies(download).effective.payments, "professional");
  assertTotals(download, 260, 400);
  assert.equal(lineNames(download).filter((name) => name === "Professional checkout").length, 1);
});

test("Email Builder auto-adds Automated Emails and both dashboard integrations", () => {
  const state = createInitialState();
  state.emailBuilder = true;
  const resolved = resolveDependencies(state);
  assert.equal(resolved.effective.automatedEmails, true);
  assert.deepEqual(resolved.dashboardDependencies, ["automatedEmails", "emailBuilder"]);
  assertTotals(state, 205, 255);
  assert.equal(calculateEstimate(state).lines.find((line) => line.name === "Automated emails")?.autoAdded, true);

  state.emailBuilder = false;
  assert.equal(resolveDependencies(state).effective.automatedEmails, false);
  state.automatedEmails = true;
  state.emailBuilder = true;
  state.emailBuilder = false;
  assert.equal(resolveDependencies(state).effective.automatedEmails, true);
});

test("standard and advanced forms require a dashboard but never force accounts", () => {
  const state = createInitialState();
  state.communityForms = "standard";
  assertTotals(state, 150, 200);
  assert.equal(resolveDependencies(state).effective.accounts, "none");
  state.communityForms = "advanced";
  assertTotals(state, 180, 230);
  assert.equal(resolveDependencies(state).effective.accounts, "none");
});

test("shared dependencies survive removal until their final owner is gone", () => {
  const state = createInitialState();
  state.loyalty = true;
  state.giftCards = true;
  assert.equal(resolveDependencies(state).effective.payments, "professional");
  assertTotals(state, 520, 820);

  state.loyalty = false;
  let resolved = resolveDependencies(state);
  assert.equal(resolved.effective.payments, "professional");
  assert.equal(resolved.effective.accounts, "none");
  assertTotals(state, 280, 420);
  state.giftCards = false;
  resolved = resolveDependencies(state);
  assert.equal(resolved.effective.payments, "none");
  assertTotals(state, 50, 100);
});

test("donation checkout is optional while BuiltByMatthew checkout applies the payment dependency", () => {
  const state = createInitialState();
  state.pages.donations = true;
  assert.equal(resolveDependencies(state).effective.payments, "none");
  assertTotals(state, 80, 130);
  state.donationMethod = "checkout";
  assert.equal(resolveDependencies(state).effective.payments, "professional");
  assertTotals(state, 170, 310);
});

test("backend selections switch Static to Firebase, preserve BYO, and do not switch back silently", () => {
  const state = createInitialState();
  state.contactForm = true;
  normaliseState(state);
  assert.equal(state.hosting, "firebase");
  assert.equal(requiresBackend(state), true);
  state.contactForm = false;
  normaliseState(state);
  assert.equal(state.hosting, "firebase");
  assert.equal(requiresBackend(state), false);

  const byo = createInitialState();
  byo.hosting = "byo";
  byo.loyalty = true;
  normaliseState(byo);
  assert.equal(byo.hosting, "byo");
  assertTotals(byo, 460, 760);
  assert.equal(lineNames(byo).filter((name) => /hosting linking fee/i.test(name)).length, 1);
});

test("custom-priced items change the completion flag but not the known subtotal", () => {
  const state = createInitialState();
  const base = totals(state);
  state.domainAssistance = true;
  state.menuTier = "interactive";
  state.multilingual = "3";
  state.translation = "human";
  const quote = calculateEstimate(state);
  assert.deepEqual(quote.totals, { min: base.min + 30, max: base.max + 30 });
  assert.deepEqual(quote.unpriced, ["Interactive restaurant menu", "Professional human translation", "Domain & hosting assistance"]);
});

test("all priced quote lines add to the advertised totals in a dense configuration", () => {
  const state = createInitialState();
  Object.assign(state, {
    menuTier: "image", helpTier: "professional", customPageCount: 4, payments: "links", rsvp: "member",
    bookings: true, accounts: "standard", contactForm: true, blog: true, newsletter: true, liveChat: "human",
    reviews: "customer", search: true, cms: "full", seo: "professional", analytics: "advanced",
    multilingual: "more", languageCount: 12, translation: "ai", loyalty: true, giftCards: true,
    digitalDownloads: true, paidDownloads: true, automatedEmails: true, emailBuilder: true,
    communityForms: "advanced", googleBusiness: true, social: "more", socialCount: 9,
    domainAssistance: true, hosting: "byo",
  });
  for (const page of Object.keys(state.pages)) state.pages[page] = true;
  assertQuoteAddsUp(state);
  const quote = calculateEstimate(state);
  assert.equal(new Set(quote.dashboardDependencies).size, quote.dashboardDependencies.length);
  assert.ok(quote.unpriced.length > 0);
});

test("serialisable state strips transient and free-text fields", () => {
  const state = createInitialState();
  Object.assign(state, { generated: true, notice: "temporary", notes: "private@example.com", byoPlatform: "Vércel 日本" });
  const clean = serialisableState(state);
  assert.equal(clean.generated, false);
  assert.equal(clean.notice, "");
  assert.equal(clean.notes, "");
  assert.equal(clean.byoPlatform, "Vércel 日本");
});

test("canonical serialisation and checksum are deterministic", () => {
  assert.equal(canonicalStringify({ z: 1, a: { y: 2, b: 3 } }), '{"a":{"b":3,"y":2},"z":1}');
  assert.equal(crc32("123456789"), "cbf43926");
});

test("the same semantic configuration always generates the same versioned code", () => {
  const state = applyPreset("smallBusiness");
  Object.assign(state, { generated: true, notice: "not persisted", notes: "also not persisted" });
  const first = encodeConfiguration(state);
  const second = encodeConfiguration({ ...state, generated: false, notice: "different", notes: "different" });
  assert.equal(first, second);
  assert.match(first, /^BBM1-[A-Za-z0-9_-]+\.[0-9a-f]{8}$/u);
  state.newsletter = true;
  assert.notEqual(encodeConfiguration(state), first);
});

test("configuration codes round-trip the state and exact saved quote", () => {
  const state = createInitialState();
  Object.assign(state, {
    presetId: "portfolio", customPageCount: 2, helpTier: "professional", payments: "professional",
    accounts: "full", multilingual: "more", languageCount: 10, translation: "human", loyalty: true,
    hosting: "byo", byoPlatform: "Vércel 日本", domainAssistance: true,
  });
  state.pages.gallery = true;
  const snapshot = createQuoteSnapshot(state);
  const decoded = decodeConfiguration(encodeConfiguration(snapshot));
  assert.deepEqual(decoded, snapshot);
  assert.equal(decoded.schemaVersion, SCHEMA_VERSION);
  assert.equal(decoded.pricingVersion, PRICING_VERSION);
  assert.deepEqual(decoded.quote.totals, calculateEstimate(state).totals);
  assert.equal(decoded.hosting.byoPlatform, "Vércel 日本");
  assert.deepEqual(restoreConfiguration(decoded), snapshot.configuration);
});

test("decoding preserves a historical quote snapshot instead of recalculating current prices", () => {
  const snapshot = createQuoteSnapshot(createInitialState());
  snapshot.pricingVersion = "1900.01";
  snapshot.quote.lines = [{ name: "Historical website", price: [999, 1001], group: "Pages" }];
  snapshot.quote.totals = { min: 999, max: 1001 };
  const decoded = decodeConfiguration(encodeConfiguration(snapshot));
  assert.equal(decoded.pricingVersion, "1900.01");
  assert.deepEqual(decoded.quote.lines, [{ name: "Historical website", price: [999, 1001], group: "Pages" }]);
  assert.deepEqual(decoded.quote.totals, { min: 999, max: 1001 });
  assert.notDeepEqual(decoded.quote.totals, calculateEstimate(decoded.configuration).totals);
});

test("decoder rejects corrupted, incomplete and unsupported codes", () => {
  const valid = encodeConfiguration(createInitialState());
  const payloadStart = valid.indexOf("-") + 1;
  const replacement = valid[payloadStart] === "A" ? "B" : "A";
  const corrupted = `${valid.slice(0, payloadStart)}${replacement}${valid.slice(payloadStart + 1)}`;
  assert.throws(() => decodeConfiguration(corrupted), /corrupted/i);
  assert.throws(() => decodeConfiguration("BBM1-incomplete"), /incomplete/i);
  assert.throws(() => decodeConfiguration(valid.replace(/^BBM1-/u, "BBM2-")), /not a supported/i);
  const unsupported = createQuoteSnapshot(createInitialState());
  unsupported.schemaVersion = SCHEMA_VERSION + 1;
  assert.throws(() => decodeConfiguration(encodeConfiguration(unsupported)), /schema .* not supported/i);
});

test("configuration codes do not preserve personal notes or transient UI state", () => {
  const state = createInitialState();
  Object.assign(state, { notes: "Jane jane@example.com 0400000000", generated: true, notice: "private notice" });
  const decoded = decodeConfiguration(encodeConfiguration(state));
  assert.equal(decoded.configuration.notes, "");
  assert.equal(decoded.configuration.generated, false);
  assert.equal(decoded.configuration.notice, "");
});
