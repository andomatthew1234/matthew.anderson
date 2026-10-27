import { decodeConfiguration } from "../build-your-site/configuration-code.mjs?v=7";
import { formatDiscountRuleLabel, formatMoneyRangeCents, formatPrice, getQuoteMoney } from "../build-your-site/configurator-data.mjs?v=7";

const input = document.querySelector("[data-viewer-code]");
const status = document.querySelector("[data-viewer-status]");
const result = document.querySelector("#viewer-result");
let activeCode = "";
let activeSnapshot = null;

const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const displayPrice = (price) => { const value = formatPrice(price); return ["Included", "To be confirmed"].includes(value) ? value : `${value} AUD`; };

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
  const quote = snapshot.quote;
  const groups = [...new Set(quote.lines.map((line) => line.group))];
  const groupHtml = groups.map((group) => `<section class="quote-group"><p class="quote-group-title">${escapeHtml(group)}</p>${quote.lines.filter((line) => line.group === group).map((line) => `<div class="quote-line"><span>${escapeHtml(line.name)}</span><span>${line.included ? "Included" : displayPrice(line.price)}</span></div>`).join("")}</section>`).join("");
  const custom = quote.unpriced.length ? `<section class="quote-group"><p class="quote-group-title">Custom-priced items</p>${quote.unpriced.map((item) => `<div class="quote-line"><span>${escapeHtml(item)}</span><span>To be confirmed</span></div>`).join("")}</section>` : "";
  const dependencies = snapshot.dependencies?.length ? `<section class="quote-group"><p class="quote-group-title">Required dependencies</p>${snapshot.dependencies.map((item) => `<p>${escapeHtml(item.reason)}</p>`).join("")}</section>` : "";
  result.innerHTML = `<article class="quote-panel" id="decoded-quote" tabindex="-1"><header class="quote-header"><div><p class="section-number">Recovered historical estimate</p><h3>Indicative estimate</h3></div><p>Pricing ${escapeHtml(snapshot.pricingVersion)}</p></header><p class="historical-note">This is the saved quote snapshot. It has not been recalculated using current prices.</p><div class="viewer-meta"><div><strong>Preset</strong><span>${escapeHtml(snapshot.presetId || "None")}</span></div><div><strong>Hosting</strong><span>${escapeHtml(snapshot.hosting.label)}</span></div><div><strong>Custom-priced items</strong><span>${quote.unpriced.length}</span></div></div>${groupHtml}${custom}${dependencies}${pricingSummary(quote)}<p class="quote-notice">This is an indicative estimate, not a binding contract. The checksum detects accidental corruption; it is not proof of authenticity.</p><div class="quote-actions"><button class="quote-action" type="button" data-copy-viewer>Copy breakdown</button><button class="quote-action" type="button" data-copy-viewer-code>Copy code</button><button class="quote-action" type="button" data-print-viewer>Print</button></div></article>`;
  document.querySelector("#decoded-quote")?.focus();
}

function textBreakdown() {
  const quote = activeSnapshot.quote;
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
    try { activeCode = input.value.trim(); activeSnapshot = decodeConfiguration(activeCode); status.textContent = "Quote recovered successfully."; status.classList.remove("is-error"); render(activeSnapshot); }
    catch (error) { activeSnapshot = null; result.innerHTML = ""; status.textContent = error.message; status.classList.add("is-error"); }
  } else if (button.hasAttribute("data-copy-viewer") && activeSnapshot) {
    try { await navigator.clipboard.writeText(textBreakdown()); status.textContent = "Breakdown copied."; } catch { status.textContent = "Copying was blocked by your browser."; }
  } else if (button.hasAttribute("data-copy-viewer-code") && activeCode) {
    try { await navigator.clipboard.writeText(activeCode); status.textContent = "Code copied."; } catch { input.select(); status.textContent = "The code is selected for manual copying."; }
  } else if (button.hasAttribute("data-print-viewer")) window.print();
});
