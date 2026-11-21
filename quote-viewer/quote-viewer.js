import { decodeConfiguration } from "../build-your-site/configuration-code.mjs?v=7";
import { formatDiscountRuleLabel, formatMoneyRangeCents, formatPrice, getQuoteMoney } from "../build-your-site/configurator-data.mjs?v=7";
import { decodeAppQuote } from "../build-your-app/app-code.mjs?v=2";
import { formatMoneyRange } from "../build-your-app/app-data.mjs?v=2";

const input = document.querySelector("[data-viewer-code]");
const status = document.querySelector("[data-viewer-status]");
const result = document.querySelector("#viewer-result");
let activeCode = "";
let activeSnapshot = null;

const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const displayPrice = (price) => { const value = formatPrice(price); return ["Included", "To be confirmed"].includes(value) ? value : `${value} AUD`; };
const appModeLabels = { nativeMirror: "Mirror my site — Native design", connectedMirror: "Mirror my site — Connected site", new: "Build a new app" };
const appPlatformLabels = { both: "iOS + Android", ios: "iOS only", android: "Android only" };

function renderApp(snapshot) {
  const { quote, configuration } = snapshot;
  const lines = quote.lines.map((line) => `<div class="quote-line"><span>${escapeHtml(line.label)}${line.automatic ? " (required)" : ""}${line.note ? `<small class="app-line-note">${escapeHtml(line.note)}</small>` : ""}</span><span>${escapeHtml(formatMoneyRange(line.amountCents))}</span></div>`).join("");
  const custom = quote.unpriced.length ? `<section class="quote-group"><p class="quote-group-title">Requires confirmation</p>${quote.unpriced.map((item) => `<div class="quote-line"><span>${escapeHtml(item)}</span><span>To be confirmed</span></div>`).join("")}</section>` : "";
  const dependencies = quote.dependencies.length ? `<section class="quote-group"><p class="quote-group-title">Included requirements</p>${quote.dependencies.map((item) => `<p>${escapeHtml(item.reason)}</p>`).join("")}</section>` : "";
  const details = configuration.website || configuration.notes ? `<section class="quote-group"><p class="quote-group-title">Project details</p>${configuration.website ? `<p>Existing website: ${escapeHtml(configuration.website)}</p>` : ""}${configuration.notes ? `<p>${escapeHtml(configuration.notes)}</p>` : ""}</section>` : "";
  const share = typeof navigator.share === "function" ? '<button class="quote-action" type="button" data-share-viewer>Share quote</button>' : "";
  result.innerHTML = `<article class="quote-panel" id="decoded-quote" tabindex="-1"><header class="quote-header"><div><p class="section-number">Recovered historical estimate</p><h3>Mobile app estimate</h3></div><p>Pricing ${escapeHtml(snapshot.pricingVersion)}</p></header><p class="historical-note">This is the saved quote snapshot. Its item prices and total have not been recalculated using current prices.</p><div class="viewer-meta"><div><strong>App type</strong><span>${escapeHtml(appModeLabels[configuration.mode] || configuration.mode)}</span></div><div><strong>Platforms</strong><span>${escapeHtml(appPlatformLabels[configuration.platform] || configuration.platform)}</span></div><div><strong>Custom-priced items</strong><span>${escapeHtml(quote.unpriced.length)}</span></div></div><section class="quote-group"><p class="quote-group-title">One-time development</p>${lines}</section>${custom}${dependencies}${details}<div class="quote-total"><span>${quote.unpriced.length ? "Known historical estimated total" : "Historical estimated total"}</span><strong>${escapeHtml(formatMoneyRange(quote.totalCents))}</strong></div><p class="quote-notice">${quote.unpriced.length ? "Items awaiting confirmation are not included in this total. " : ""}Ongoing hosting, third-party services, usage charges, and app-store account fees are separate. This is an indicative estimate, not a binding contract. The checksum detects accidental corruption; it is not proof of authenticity.</p><div class="quote-actions"><button class="quote-action" type="button" data-copy-viewer>Copy breakdown</button><button class="quote-action" type="button" data-copy-viewer-code>Copy code</button>${share}<button class="quote-action" type="button" data-print-viewer>Print</button></div></article>`;
  document.querySelector("#decoded-quote")?.focus();
}

function pricingSummary(quote) {
  const money = getQuoteMoney(quote);
  const known = quote.unpriced.length ? "Known " : "";
  const ruleLabel = formatDiscountRuleLabel(money);
  if (!money.discountRuleVersion) return `<div class="quote-total"><span>${known}historical estimated total</span><strong>${formatMoneyRangeCents(money.finalCents)}</strong></div>`;
  const discount = money.discountCents.max > 0
    ? `<div class="quote-pricing__row quote-pricing__discount"><span>Discount (${escapeHtml(ruleLabel)})</span><strong>${formatMoneyRangeCents(money.discountCents, { negative: true })}</strong></div>`
    : `<p class="quote-pricing__hint">The progressive discount applies ${escapeHtml(ruleLabel)}.</p>`;
  return `<section class="quote-pricing" aria-label="Website estimate"><p class="quote-group-title">Website estimate</p><div class="quote-pricing__row"><span>${known}Original estimate</span><strong>${formatMoneyRangeCents(money.originalCents)}</strong></div>${discount}<div class="quote-pricing__row quote-pricing__final"><span>Your ${known.toLowerCase()}estimated total</span><strong>${formatMoneyRangeCents(money.finalCents)}</strong></div></section>`;
}

function render(snapshot) {
  if (snapshot.projectType === "mobile-app") { renderApp(snapshot); return; }
  const quote = snapshot.quote;
  const groups = [...new Set(quote.lines.map((line) => line.group))];
  const groupHtml = groups.map((group) => `<section class="quote-group"><p class="quote-group-title">${escapeHtml(group)}</p>${quote.lines.filter((line) => line.group === group).map((line) => `<div class="quote-line"><span>${escapeHtml(line.name)}</span><span>${line.included ? "Included" : displayPrice(line.price)}</span></div>`).join("")}</section>`).join("");
  const custom = quote.unpriced.length ? `<section class="quote-group"><p class="quote-group-title">Custom-priced items</p>${quote.unpriced.map((item) => `<div class="quote-line"><span>${escapeHtml(item)}</span><span>To be confirmed</span></div>`).join("")}</section>` : "";
  const dependencies = snapshot.dependencies?.length ? `<section class="quote-group"><p class="quote-group-title">Required dependencies</p>${snapshot.dependencies.map((item) => `<p>${escapeHtml(item.reason)}</p>`).join("")}</section>` : "";
  const share = typeof navigator.share === "function" ? '<button class="quote-action" type="button" data-share-viewer>Share quote</button>' : "";
  result.innerHTML = `<article class="quote-panel" id="decoded-quote" tabindex="-1"><header class="quote-header"><div><p class="section-number">Recovered historical estimate</p><h3>Indicative estimate</h3></div><p>Pricing ${escapeHtml(snapshot.pricingVersion)}</p></header><p class="historical-note">This is the saved quote snapshot. It has not been recalculated using current prices.</p><div class="viewer-meta"><div><strong>Preset</strong><span>${escapeHtml(snapshot.presetId || "None")}</span></div><div><strong>Hosting</strong><span>${escapeHtml(snapshot.hosting.label)}</span></div><div><strong>Custom-priced items</strong><span>${quote.unpriced.length}</span></div></div>${groupHtml}${custom}${dependencies}${pricingSummary(quote)}<p class="quote-notice">This is an indicative estimate, not a binding contract. The checksum detects accidental corruption; it is not proof of authenticity.</p><div class="quote-actions"><button class="quote-action" type="button" data-copy-viewer>Copy breakdown</button><button class="quote-action" type="button" data-copy-viewer-code>Copy code</button>${share}<button class="quote-action" type="button" data-print-viewer>Print</button></div></article>`;
  document.querySelector("#decoded-quote")?.focus();
}

function textBreakdown() {
  const quote = activeSnapshot.quote;
  if (activeSnapshot.projectType === "mobile-app") {
    const configuration = activeSnapshot.configuration;
    return [
      "BUILTBYMATTHEW — RECOVERED MOBILE APP ESTIMATE",
      `Pricing: ${activeSnapshot.pricingVersion}`,
      `App type: ${appModeLabels[configuration.mode] || configuration.mode}`,
      `Platforms: ${appPlatformLabels[configuration.platform] || configuration.platform}`,
      ...(configuration.website ? [`Existing website: ${configuration.website}`] : []),
      "", ...quote.lines.map((line) => `${line.label}${line.automatic ? " (required)" : ""}: ${formatMoneyRange(line.amountCents)}${line.note ? ` — ${line.note}` : ""}`),
      ...quote.dependencies.map((item) => item.reason),
      ...quote.unpriced.map((item) => `${item}: To be confirmed`),
      ...(configuration.notes ? ["", `Project notes: ${configuration.notes}`] : []),
      "", `${quote.unpriced.length ? "Known historical estimated total" : "Historical estimated total"}: ${formatMoneyRange(quote.totalCents)}`,
      ...(quote.unpriced.length ? ["Items awaiting confirmation are not included in this total."] : []),
      "Saved prices have not been recalculated. Ongoing hosting, third-party services, usage charges, and app-store account fees are separate.",
    ].join("\n");
  }
  const money = getQuoteMoney(quote);
  const totals = money.discountRuleVersion
    ? [
        `${quote.unpriced.length ? "Known original estimate" : "Original estimate"}: ${formatMoneyRangeCents(money.originalCents)}`,
        ...(money.discountCents.max > 0 ? [`Discount (${formatDiscountRuleLabel(money)}): ${formatMoneyRangeCents(money.discountCents, { negative: true })}`] : [`Progressive discount: Applies ${formatDiscountRuleLabel(money)}`]),
        `Your ${quote.unpriced.length ? "known " : ""}estimated total: ${formatMoneyRangeCents(money.finalCents)}`,
      ]
    : [`Historical estimated total: ${formatMoneyRangeCents(money.finalCents)}`];
  return ["BUILTBYMATTHEW — RECOVERED INDICATIVE ESTIMATE", `Pricing: ${activeSnapshot.pricingVersion}`, `Hosting: ${activeSnapshot.hosting.label}`, "", ...quote.lines.map((line) => `${line.name}: ${line.included ? "Included" : displayPrice(line.price)}`), ...quote.unpriced.map((item) => `${item}: To be confirmed`), "", "WEBSITE ESTIMATE", ...totals].join("\n");
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button"); if (!button) return;
  if (button.hasAttribute("data-decode")) {
    try { activeCode = input.value.trim(); activeSnapshot = activeCode.startsWith("MA1-") ? decodeAppQuote(activeCode) : decodeConfiguration(activeCode); status.textContent = "Quote recovered successfully."; status.classList.remove("is-error"); render(activeSnapshot); }
    catch (error) { activeSnapshot = null; result.innerHTML = ""; status.textContent = error.message; status.classList.add("is-error"); }
  } else if (button.hasAttribute("data-copy-viewer") && activeSnapshot) {
    try { await navigator.clipboard.writeText(textBreakdown()); status.textContent = "Breakdown copied."; } catch { status.textContent = "Copying was blocked by your browser."; }
  } else if (button.hasAttribute("data-copy-viewer-code") && activeSnapshot && activeCode) {
    try { await navigator.clipboard.writeText(activeCode); status.textContent = "Code copied."; } catch { input.select(); status.textContent = "The code is selected for manual copying."; }
  } else if (button.hasAttribute("data-share-viewer") && activeSnapshot && navigator.share) {
    try { await navigator.share({ title: activeSnapshot.projectType === "mobile-app" ? "BuiltByMatthew mobile app estimate" : "BuiltByMatthew website estimate", text: textBreakdown() }); }
    catch (error) { if (error?.name !== "AbortError") status.textContent = "Sharing was blocked. You can copy the breakdown instead."; }
  } else if (button.hasAttribute("data-print-viewer")) window.print();
});
