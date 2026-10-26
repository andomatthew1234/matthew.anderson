import assert from "node:assert/strict";
import { statSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  VISUAL_CONFIG,
  calculateEstimate,
  createInitialState,
  getDashboardDependencies,
  normaliseState,
  requiresBackend,
} from "../build-your-site/configurator-data.mjs";

const total = (state) => calculateEstimate(state).totals;

test("every configurator visual points to a production asset", () => {
  const configuratorRoot = new URL("../build-your-site/", import.meta.url);
  assert.equal(Object.keys(VISUAL_CONFIG).length, 18);
  for (const [key, visual] of Object.entries(VISUAL_CONFIG)) {
    const asset = fileURLToPath(new URL(visual.src, configuratorRoot));
    assert.ok(statSync(asset).size > 5_000, `${key} visual is missing or unexpectedly small`);
  }
});

test("preset prices use bundled ranges only", () => {
  const expected = { home: [50, 100], about: [75, 120], contact: [105, 170] };
  for (const [preset, range] of Object.entries(expected)) {
    const state = createInitialState();
    state.preset = preset;
    assert.deepEqual(Object.values(total(state)), range);
    assert.equal(calculateEstimate(state).lines.filter((line) => line.group === "Pages").length, 1);
  }
});

test("custom pages and repeated additional pages calculate deterministically", () => {
  const state = createInitialState();
  state.pagesMode = "custom";
  state.customPages = { home: true, about: false, contact: true, store: true, gallery: true, events: true };
  state.extraPages = [{ id: "1", name: "Services" }, { id: "2", name: "Team" }, { id: "3", name: "FAQ" }];
  assert.deepEqual(total(state), { min: 370, max: 530 });
});

test("tier selections replace rather than stack", () => {
  const state = createInitialState();
  state.payments = "links";
  assert.deepEqual(total(state), { min: 125, max: 190 });
  state.payments = "professional";
  assert.deepEqual(total(state), { min: 195, max: 350 });
  assert.equal(calculateEstimate(state).lines.some((line) => line.name === "Payment links"), false);
});

test("contact and newsletter add one dashboard plus two integrations", () => {
  const state = createInitialState();
  state.pagesMode = "custom";
  state.customPages = { home: true, about: true, contact: false, store: false, gallery: false, events: false };
  state.contactForm = true;
  state.newsletter = true;
  assert.deepEqual(total(state), { min: 220, max: 320 });
  assert.deepEqual(getDashboardDependencies(state), ["contactForm", "newsletter"]);
});

test("dashboard remains explicit but auto dashboard disappears with final dependency", () => {
  const state = createInitialState();
  state.contactForm = true;
  assert.equal(calculateEstimate(state).lines.some((line) => line.name === "Admin dashboard"), true);
  state.contactForm = false;
  assert.equal(calculateEstimate(state).lines.some((line) => line.name === "Admin dashboard"), false);
  state.dashboardExplicit = true;
  assert.equal(calculateEstimate(state).lines.some((line) => line.name === "Admin dashboard"), true);
});

test("member RSVP adds accounts and selects interactive hosting", () => {
  const state = createInitialState();
  state.rsvp = "member";
  normaliseState(state);
  assert.equal(state.accounts, "standard");
  assert.equal(state.accountsAutoAdded, true);
  assert.equal(state.hosting, "firebase");
  assert.equal(requiresBackend(state), true);
});

test("social 7+ pricing and BYO linking fee are included once", () => {
  const state = createInitialState();
  state.social = "more";
  state.socialCount = 10;
  state.hosting = "byo";
  assert.deepEqual(total(state), { min: 195, max: 260 });
  assert.equal(calculateEstimate(state).lines.filter((line) => line.name.includes("hosting linking fee")).length, 1);
});

test("full stack oracle sums exact min and max", () => {
  const state = createInitialState();
  state.preset = "home";
  state.cms = "full";
  state.analytics = "advanced";
  state.accounts = "full";
  state.hosting = "byo";
  assert.deepEqual(total(state), { min: 500, max: 630 });
});

test("unpriced assistance flags confirmation without changing subtotal", () => {
  const state = createInitialState();
  const before = total(state);
  state.domainAssistance = true;
  const result = calculateEstimate(state);
  assert.deepEqual(result.totals, before);
  assert.deepEqual(result.unpriced, ["Domain & hosting assistance"]);
});

test("every total equals the sum of priced quote lines", () => {
  const state = createInitialState();
  Object.assign(state, {
    payments: "professional",
    accounts: "full",
    contactForm: true,
    blog: true,
    cms: "full",
    analytics: "advanced",
    googleBusiness: true,
    social: "more",
    socialCount: 9,
    hosting: "byo",
  });
  const result = calculateEstimate(state);
  assert.equal(result.totals.min, result.lines.filter((line) => !line.included).reduce((sum, line) => sum + line.price[0], 0));
  assert.equal(result.totals.max, result.lines.filter((line) => !line.included).reduce((sum, line) => sum + line.price[1], 0));
});
