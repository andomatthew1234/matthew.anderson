// All development prices are integer AUD cents. App quotes do not use website discounts.
export const PRICING_VERSION = "mobile-app-2026-11-21-v2";
export const CUSTOM_FEATURE_LIMIT = 20;
export const CUSTOM_FEATURE_NAME_LIMIT = 80;
export const CUSTOM_FEATURE_PRICE_CENTS = 10000;
export const CUSTOM_FEATURE_NOTE = "Estimated allowance; the final price may be higher or lower.";

export function normaliseCustomFeatureName(value) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, CUSTOM_FEATURE_NAME_LIMIT).trim()
    : "";
}

export const MODES = {
  nativeMirror: { id: "nativeMirror", label: "Native design", description: "Rebuild your existing site as an app with a native design.", baseCents: [45000, 90000] },
  connectedMirror: { id: "connectedMirror", label: "Connected site", description: "Bring your current website into an app with no major redesign.", baseCents: [25000, 50000] },
  new: { id: "new", label: "Build a new app", description: "Start fresh and shape an app around your idea.", baseCents: [35000, 90000] },
};

export const FEATURES = [
  { id: "bookings", label: "Bookings", description: "Let customers book a time or service.", priceCents: 11000 },
  { id: "push", label: "Push notifications", description: "Send useful updates to your customers.", priceCents: 7500 },
  { id: "store", label: "Online store", description: "Browse products and place orders.", priceCents: 13000 },
  { id: "search", label: "Search", description: "Help people find what they need.", priceCents: 4000 },
  { id: "favourites", label: "Saved favourites", description: "Save items to a personal account.", priceCents: 3500 },
  { id: "forms", label: "Forms", description: "Collect enquiries or other submissions.", priceCents: 4500 },
  { id: "news", label: "News and updates", description: "Publish articles and updates in your app.", priceCents: 6000 },
  { id: "uploads", label: "File uploads", description: "Let people submit files or photos.", priceCents: 7000 },
  { id: "qr", label: "QR code scanning", description: "Scan QR codes inside your app.", priceCents: 5500 },
  { id: "offline", label: "Offline access", description: "Make agreed content available without a connection.", priceCents: 10000 },
  { id: "loyalty", label: "Loyalty rewards", description: "Reward customers for purchases.", priceCents: 12000 },
  { id: "reviews", label: "Ratings and reviews", description: "Let account holders leave feedback.", priceCents: 6000 },
  { id: "dashboard", label: "Admin dashboard", description: "Manage your app’s content and activity.", priceCents: 10000 },
];

const featureIds = new Set(FEATURES.map(({ id }) => id));
const choose = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
const boundedText = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";

export function createInitialState() {
  return { mode: "new", platform: "both", accounts: "none", features: [], website: "", sync: "none", notes: "", customFeatures: [] };
}

export function normaliseState(input = {}) {
  const value = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const mode = choose(value.mode, Object.keys(MODES), "new");
  const isNew = mode === "new";
  return {
    mode,
    platform: choose(value.platform, ["both", "ios", "android"], "both"),
    accounts: isNew ? choose(value.accounts, ["none", "standard", "twoFactor"], "none") : "none",
    features: isNew && Array.isArray(value.features) ? [...new Set(value.features.filter((id) => featureIds.has(id)))] : [],
    website: boundedText(value.website, 250),
    sync: isNew ? choose(value.sync, ["none", "connect", "unsure"], "none") : "none",
    notes: isNew ? boundedText(value.notes, 1000) : "",
    customFeatures: isNew && Array.isArray(value.customFeatures)
      ? value.customFeatures.map(normaliseCustomFeatureName).filter(Boolean).slice(0, CUSTOM_FEATURE_LIMIT)
      : [],
  };
}

export function calculateEstimate(input) {
  const effectiveState = normaliseState(input);
  const mode = MODES[effectiveState.mode];
  const lines = [{ id: "base", label: mode.label, amountCents: { min: mode.baseCents[0], max: mode.baseCents[1] }, automatic: false }];
  const dependencies = [];
  const unpriced = [];
  if (effectiveState.mode === "new") {
    const selected = new Set(effectiveState.features);
    const automatic = new Set();
    const requireFeature = (id, reason) => {
      if (selected.has(id)) return;
      selected.add(id);
      automatic.add(id);
      dependencies.push({ id, reason });
    };
    if (selected.has("loyalty")) requireFeature("store", "Loyalty rewards need an online store.");
    const accountFeatures = FEATURES.filter(({ id }) => ["favourites", "reviews", "loyalty"].includes(id) && selected.has(id));
    if (accountFeatures.length && effectiveState.accounts === "none") {
      effectiveState.accounts = "standard";
      automatic.add("accounts");
      dependencies.push({ id: "accounts", reason: `${accountFeatures.map(({ label }) => label).join(", ")} need customer accounts.` });
    }
    const managedFeatures = FEATURES.filter(({ id }) => ["bookings", "store", "forms", "news", "reviews", "loyalty"].includes(id) && selected.has(id));
    if (managedFeatures.length) requireFeature("dashboard", `${managedFeatures.map(({ label }) => label).join(", ")} need an admin dashboard.`);
    if (effectiveState.accounts !== "none") {
      const twoFactor = effectiveState.accounts === "twoFactor";
      const amount = twoFactor ? 23000 : 10000;
      lines.push({ id: "accounts", label: twoFactor ? "Accounts and profiles with 2FA suite" : "Accounts and profiles", amountCents: { min: amount, max: amount }, automatic: automatic.has("accounts") });
    }
    for (const feature of FEATURES) {
      if (!selected.has(feature.id)) continue;
      lines.push({ id: feature.id, label: feature.label, amountCents: { min: feature.priceCents, max: feature.priceCents }, automatic: automatic.has(feature.id) });
    }
    effectiveState.customFeatures.forEach((name, index) => {
      lines.push({ id: `custom-${index + 1}`, label: `Custom feature: ${name}`, amountCents: { min: CUSTOM_FEATURE_PRICE_CENTS, max: CUSTOM_FEATURE_PRICE_CENTS }, automatic: false, note: CUSTOM_FEATURE_NOTE });
    });
    effectiveState.features = FEATURES.filter(({ id }) => selected.has(id)).map(({ id }) => id);
    if (effectiveState.sync !== "none") unpriced.push("Website syncing: scope and any additional cost need confirmation.");
    if (effectiveState.notes) unpriced.push("Custom requirements: scope and any additional cost need confirmation.");
  }
  const totalCents = lines.reduce((sum, line) => ({ min: sum.min + line.amountCents.min, max: sum.max + line.amountCents.max }), { min: 0, max: 0 });
  return { lines, totalCents, dependencies, unpriced, effectiveState, discountCents: { min: 0, max: 0 } };
}

export function formatAmount(cents) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
}

export function formatMoneyRange(range) {
  return `${formatAmount(range.min)}${range.min === range.max ? "" : `–${formatAmount(range.max)}`} AUD`;
}
