import {
  PAGE_ORDER,
  PRESET_CONFIG,
  PRICE_CONFIG,
  PRICING_VERSION,
  VISUAL_CONFIG,
  applyPreset,
  calculateEstimate,
  createInitialState,
  formatDiscountRuleLabel,
  formatMoneyRangeCents,
  formatPrice,
  getDashboardDependencies,
  getPageCount,
  getQuoteMoney,
  getSelectedFeatureIds,
  normaliseState,
  requiresBackend,
  resolveDependencies,
} from "./configurator-data.mjs?v=7";
import { createQuoteSnapshot, decodeConfiguration, encodeConfiguration, hostingLabel, restoreConfiguration } from "./configuration-code.mjs?v=7";

let state = createInitialState();
let visualObserver;
let activeVisual = "pages";
let visualTimer;
let noticeTimer;
let generationTimer;
let isGenerating = false;
let hasInteracted = false;
let restoredSnapshot = null;
let currentSnapshot = null;
let currentCode = "";
let quoteOutdated = false;
let copyFeedbackTimer;
const loadedVisuals = new Set();

const flow = document.querySelector("#configuration-flow");
const presetContainer = document.querySelector("#preset-container");
const estimateContainer = document.querySelector("#estimate-container");
const visualStage = document.querySelector("#visual-stage");
const note = document.querySelector("#dependency-note");
const toast = document.querySelector("#toast");
const barSelection = document.querySelector("#bar-selection");
const barTotal = document.querySelector("#bar-total");
const barDiscount = document.querySelector("#bar-discount");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const selectedClass = (selected) => (selected ? " is-selected" : "");
const checked = (selected) => (selected ? "checked" : "");
const displayPrice = (price) => { const value = formatPrice(price); return ["Included", "To be confirmed"].includes(value) ? value : `${value} AUD`; };

function setNotice(message, isError = false) {
  clearTimeout(noticeTimer);
  if (!message) { note.hidden = true; return; }
  note.textContent = message;
  note.classList.toggle("is-error", isError);
  note.hidden = false;
  noticeTimer = setTimeout(() => { note.hidden = true; note.classList.remove("is-error"); }, 8000);
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 2200);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(value); return; } catch { /* Use the selection fallback below. */ }
  }
  const fallback = document.createElement("textarea");
  fallback.value = value; fallback.readOnly = true; fallback.className = "clipboard-fallback";
  document.body.append(fallback); fallback.select();
  const copied = document.execCommand("copy"); fallback.remove();
  if (!copied) throw new Error("Copying was blocked");
}

function visualMarkup(key, mobile = false) {
  const visual = VISUAL_CONFIG[key] || VISUAL_CONFIG.pages;
  return `<div class="${mobile ? "mobile-visual__inner" : "visual-stage__inner"}" data-active-visual="${key}"><div class="visual-placeholder" data-placeholder="${key}"><img data-visual-image="${key}" data-src="${visual.src}" alt="${escapeHtml(visual.label)} preview" hidden /><div class="visual-placeholder__label"><span class="visual-path">Preview</span><strong>${escapeHtml(visual.label)}</strong></div></div></div>`;
}

const mobileVisual = (key) => `<div class="mobile-visual" aria-hidden="true">${visualMarkup(key, true)}</div>`;

function hydrateVisualImages(root = document) {
  root.querySelectorAll("[data-visual-image]").forEach((image) => {
    if (!loadedVisuals.has(image.dataset.visualImage)) return;
    const reveal = () => { image.classList.add("is-loaded"); image.closest(".visual-placeholder")?.classList.add("has-image"); };
    image.addEventListener("load", reveal, { once: true });
    image.src = image.dataset.src; image.hidden = false;
    if (image.complete && image.naturalWidth > 0) reveal();
  });
}

function preloadVisuals() {
  Object.entries(VISUAL_CONFIG).forEach(([key, visual]) => {
    const image = new Image();
    image.onload = () => { loadedVisuals.add(key); hydrateVisualImages(); };
    image.src = visual.src;
  });
}

function setActiveVisual(key, immediate = false) {
  if (!VISUAL_CONFIG[key] || (activeVisual === key && visualStage.children.length)) return;
  activeVisual = key; clearTimeout(visualTimer);
  const update = () => { visualStage.innerHTML = visualMarkup(key); hydrateVisualImages(visualStage); requestAnimationFrame(() => visualStage.classList.remove("is-changing")); };
  if (immediate || reduceMotion.matches || !visualStage.children.length) update();
  else { visualStage.classList.add("is-changing"); visualTimer = setTimeout(update, 160); }
}

function initVisualObserver() {
  visualObserver?.disconnect();
  if (!("IntersectionObserver" in window)) return;
  visualObserver = new IntersectionObserver((entries) => {
    const active = entries.filter((entry) => entry.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top - innerHeight * 0.42) - Math.abs(b.boundingClientRect.top - innerHeight * 0.42))[0];
    if (active) setActiveVisual(active.target.dataset.visual);
  }, { rootMargin: "-25% 0px -52% 0px", threshold: 0 });
  document.querySelectorAll(".config-section[data-visual], .config-group[data-visual], .page-tier-block[data-visual]").forEach((element) => visualObserver.observe(element));
}

function optionRow({ type = "radio", group, value, key, selected, title, description = "", price, disabled = false, reason = "", logo = "", visual = "" }) {
  const data = type === "radio" ? `data-tier="${group}" value="${value}"` : `data-toggle="${key}"`;
  return `<label class="option-row${selectedClass(selected)}${disabled ? " is-disabled" : ""}"${visual ? ` data-visual="${visual}"` : ""}><input class="sr-only" type="${type}" ${type === "radio" ? `name="${group}"` : ""} ${data} ${checked(selected)} ${disabled ? "disabled" : ""} /><span class="option-indicator" aria-hidden="true">✓</span><span class="option-copy"><strong>${logo}${title}</strong>${description ? `<small>${description}</small>` : ""}${reason ? `<small><strong>${reason}</strong></small>` : ""}</span><span class="option-price">${price}</span></label>`;
}

const compareBlock = (id, label, content) => `<details class="comparison" data-comparison="${id}"><summary>${label}</summary><div class="comparison__content">${content}</div></details>`;
const groupShell = ({ id, visual, title, intro, content }) => `<div class="config-group" id="${id}" data-visual="${visual}">${mobileVisual(visual)}<h3>${title}</h3><p>${intro}</p>${content}</div>`;
const sectionShell = ({ id, number, title, intro, visual, content, extraClass = "" }) => `<section class="config-section ${extraClass}" id="${id}" data-visual="${visual}" aria-labelledby="${id}-title"><header class="config-section__heading"><p class="section-number">${number}</p><h2 id="${id}-title">${title}</h2><p>${intro}</p></header>${content}</section>`;

function renderPresets() {
  const cards = Object.entries(PRESET_CONFIG).map(([id, preset]) => `<button type="button" class="preset-tile${selectedClass(state.presetId === id)}" data-preset="${id}" aria-pressed="${state.presetId === id}"><span class="preset-tile__mark" aria-hidden="true">${state.presetId === id ? "✓" : "↘"}</span><strong>${preset.name}</strong><small>${preset.description}</small></button>`).join("");
  return `<section class="preset-section" aria-labelledby="preset-title"><header><p class="eyebrow">A thoughtful starting point</p><h2 id="preset-title">Where would you like to start?</h2><p>We'll apply the best options for your preset.</p></header><div class="preset-grid">${cards}</div><details class="recovery-panel" id="code-recovery"><summary>Have a configuration code?</summary><p>Paste a BuiltByMatthew code to restore its selections and original saved estimate.</p><label class="field-label" for="recovery-code">Configuration code</label><textarea id="recovery-code" data-recovery-code spellcheck="false" autocomplete="off" placeholder="BBM1-..."></textarea><button class="small-button" type="button" data-recover>Restore configuration</button><p class="recovery-status" data-recovery-status aria-live="polite"></p></details></section>`;
}

const pageDescriptions = {
  home: "Your required responsive homepage or landing page.", about: "Introduce your story, team or business.", contact: "Share contact details; a functional form is separate.",
  store: "Display products without requiring checkout.", gallery: "Showcase photos, video or music.", events: "List events and attendance information.", faq: "Expandable questions and answers.",
  testimonials: "Showcase curated testimonials and reviews.", team: "Profiles, roles, photos and biographies.", services: "Explain services, packages and pricing.",
  careers: "Job listings, descriptions and application information.", donations: "Fundraising information, progress and donation links.", courses: "Courses with video, text and account-linked navigation.",
};

function pageTile({ id, title, description, price, selected, disabled = false, group = "page", value = id, visual = "" }) {
  return `<button type="button" class="page-tile${selectedClass(selected)}" data-${group}="${value}"${visual ? ` data-visual="${visual}"` : ""} aria-pressed="${selected}" ${disabled ? "disabled" : ""}><span class="page-tile__indicator" aria-hidden="true">${selected ? "✓" : "+"}</span><strong>${title}</strong><small>${description}</small><span>${price}</span></button>`;
}

function renderPagesSection() {
  const pageVisuals = { faq: "faq", testimonials: "reviews", team: "staff", services: "services", careers: "careers", donations: "donations", courses: "courses" };
  const standard = PAGE_ORDER.map((id) => pageTile({ id, title: PRICE_CONFIG.pages[id].name, description: pageDescriptions[id], price: displayPrice(PRICE_CONFIG.pages[id].price), selected: state.pages[id], disabled: id === "home", visual: pageVisuals[id] || "pages" })).join("");
  const menu = [
    pageTile({ id: "menu-none", title: "No restaurant menu", description: "Do not add a menu page.", price: "Included", selected: state.menuTier === "none", group: "menu-tier", value: "none", visual: "menu" }),
    pageTile({ id: "menu-image", title: "Image-only menu", description: "Responsive menu images with optional enlargement.", price: "$10 AUD", selected: state.menuTier === "image", group: "menu-tier", value: "image", visual: "menu" }),
    pageTile({ id: "menu-interactive", title: "Interactive menu", description: "Searchable categories and richer item previews.", price: "To be confirmed", selected: state.menuTier === "interactive", group: "menu-tier", value: "interactive", visual: "menu" }),
  ].join("");
  const help = [
    pageTile({ id: "help-none", title: "No help centre", description: "Do not add support articles.", price: "Included", selected: state.helpTier === "none", group: "help-tier", value: "none", visual: "faq" }),
    pageTile({ id: "help-bundle", title: "FAQ + support articles", description: "FAQ, articles and basic navigation/search.", price: "$40 AUD", selected: state.helpTier === "bundle", group: "help-tier", value: "bundle", visual: "faq" }),
    pageTile({ id: "help-standard", title: "Standard support articles", description: "Search, browse and read support articles.", price: "$30 AUD", selected: state.helpTier === "standard", group: "help-tier", value: "standard", visual: "faq" }),
    pageTile({ id: "help-professional", title: "Professional Help Centre", description: "AI search, Markdown support and improved discovery. Provider fees are separate.", price: "$70–140 AUD", selected: state.helpTier === "professional", group: "help-tier", value: "professional", visual: "faq" }),
  ].join("");
  const donation = state.pages.donations ? `<div class="revealed-field"><p class="field-label">How should donation buttons work?</p><div class="option-stack">${optionRow({ group: "donationMethod", value: "external", selected: state.donationMethod === "external", title: "Customer-provided donation link", description: "Link to an existing external donation service. No checkout required.", price: "Included" })}${optionRow({ group: "donationMethod", value: "checkout", selected: state.donationMethod === "checkout", title: "BuiltByMatthew checkout integration", description: "Automatically includes Professional checkout.", price: "$90–180" })}</div></div>` : "";
  return sectionShell({ id: "pages", number: "01 · Your website's pages", title: "Start with the right foundations.", intro: "What pages do you want to be on your site?", visual: "pages", content: `${mobileVisual("pages")}<div class="page-grid">${standard}</div><div class="page-tier-block" data-visual="menu">${mobileVisual("menu")}<h3>Restaurant menu</h3><p>Choose at most one menu style.</p><div class="page-grid page-grid--compact">${menu}</div></div><div class="page-tier-block" data-visual="faq">${mobileVisual("faq")}<h3>Help centre</h3><p>Choose the support experience that fits your customers.</p><div class="page-grid page-grid--compact">${help}</div></div>${donation}<div class="quantity-control"><label for="custom-pages"><strong>Additional custom pages</strong><small>$50–70 AUD each</small></label><input id="custom-pages" type="number" min="0" max="20" value="${state.customPageCount}" data-custom-page-count /></div>` });
}

function renderSellingSection() {
  const resolved = resolveDependencies(state).effective;
  const paymentsVisual = resolved.payments === "professional" ? "professionalPayments" : "paymentLinks";
  const payments = groupShell({ id: "payments", visual: paymentsVisual, title: "Payments. How would you like customers to pay?", intro: "Choose a simple hosted link or a complete checkout.", content: `<div class="option-stack">${optionRow({ group: "payments", value: "none", selected: resolved.payments === "none", title: "No payments", price: "Included", disabled: resolved.payments !== state.payments, reason: resolved.payments !== state.payments ? "A selected feature requires checkout." : "", visual: "paymentLinks" })}${optionRow({ group: "payments", value: "links", selected: resolved.payments === "links", title: "Payment links", description: "Secure hosted links for simple purchases or donations.", price: "$20", visual: "paymentLinks" })}${optionRow({ group: "payments", value: "professional", selected: resolved.payments === "professional", title: "Professional checkout", description: "Cart, multiple products and flexible checkout.", price: "$90–180", reason: resolved.payments !== state.payments ? "Automatically required by another selection." : "", visual: "professionalPayments" })}</div>` });
  const bookings = groupShell({ id: "bookings", visual: "bookings", title: "Bookings. Let customers reserve your time.", intro: "Add appointment selection and a confirmation flow.", content: `<div class="option-stack">${optionRow({ group: "bookings", value: "none", selected: !state.bookings, title: "No bookings", price: "Included" })}${optionRow({ group: "bookings", value: "online", selected: state.bookings, title: "Online appointments", description: "Available times, booking form and confirmation.", price: "$70–95" })}</div>` });
  const events = groupShell({ id: "events", visual: "events", title: "Events. Let people register to attend.", intro: "Public registration works without accounts; member-only attendance requires login.", content: `<div class="option-stack">${optionRow({ group: "rsvp", value: "none", selected: state.rsvp === "none", title: "No RSVP", price: "Included" })}${optionRow({ group: "rsvp", value: "public", selected: state.rsvp === "public", title: "Public RSVP", description: "Registration and attendee management.", price: "$40–80" })}${optionRow({ group: "rsvp", value: "member", selected: state.rsvp === "member", title: "Member-only RSVP", description: "Account-linked event registration.", price: "$40–80" })}</div>` });
  return sectionShell({ id: "selling", number: "02 · Selling & bookings", title: "Turn visits into action.", intro: "Take payments, accept bookings and manage event attendance.", visual: paymentsVisual, content: payments + bookings + events });
}

function renderCustomersSection() {
  const resolved = resolveDependencies(state).effective;
  const requiredAccounts = resolved.accounts !== state.accounts;
  const accounts = groupShell({ id: "accounts", visual: "accounts", title: "Customer accounts. Choose the right access.", intro: "Let customers sign in and use account-linked services.", content: `<div class="option-stack">${optionRow({ group: "accounts", value: "none", selected: resolved.accounts === "none", title: "No accounts", price: "Included", disabled: requiredAccounts, reason: requiredAccounts ? "Another selection requires customer accounts." : "" })}${optionRow({ group: "accounts", value: "standard", selected: resolved.accounts === "standard", title: "Standard accounts", description: "Registration, login, reset and profiles.", price: "$60–95", reason: requiredAccounts && resolved.accounts === "standard" ? "Automatically required." : "" })}${optionRow({ group: "accounts", value: "full", selected: resolved.accounts === "full", title: "Full accounts suite", description: "Adds 2FA, enhanced controls and user management.", price: "$120–200", reason: requiredAccounts && resolved.accounts === "full" ? "Automatically required by loyalty rewards." : "" })}</div>` });
  const contact = groupShell({ id: "contact-form", visual: "contact", title: "Contact form. Make it easy to get in touch.", intro: "A Contact page does not automatically include this functional form.", content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "contactForm", selected: state.contactForm, title: "Contact form", description: "Validated messages and enquiry management.", price: "$30–50" })}</div>` });
  const blog = groupShell({ id: "blog", visual: "blog", title: "Blog, journal or news feed.", intro: "Publish articles, updates and announcements.", content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "blog", selected: state.blog, title: "Blog, journal or news feed", description: "Article listings, pages and management.", price: "$60–90" })}</div>` });
  const newsletter = groupShell({ id: "newsletter", visual: "newsletter", title: "Newsletter signup. Grow your audience.", intro: "Collect subscribers through an accessible signup form.", content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "newsletter", selected: state.newsletter, title: "Newsletter signup", description: "Collection and subscriber management; campaign sending is separate.", price: "$20–30" })}</div>` });
  const chat = groupShell({ id: "live-chat", visual: "pages", title: "Live chat. Help customers in the moment.", intro: "AI and third-party service usage charges are separate.", content: `<div class="option-stack">${optionRow({ group: "liveChat", value: "none", selected: state.liveChat === "none", title: "No live chat", price: "Free" })}${optionRow({ group: "liveChat", value: "ai", selected: state.liveChat === "ai", title: "AI-powered live chat", description: "AI widget, initial knowledge configuration and supported provider integration.", price: "$25" })}${optionRow({ group: "liveChat", value: "human", selected: state.liveChat === "human", title: "AI chat + human live chat", description: "Adds supported staff handoff and messaging interface.", price: "$45" })}</div>` });
  const reviews = groupShell({ id: "reviews", visual: "reviews", title: "Customer ratings & reviews.", intro: "Choose curated management or moderated customer submissions.", content: `<div class="option-stack">${optionRow({ group: "reviews", value: "none", selected: state.reviews === "none", title: "No review system", price: "Free" })}${optionRow({ group: "reviews", value: "manual", selected: state.reviews === "manual", title: "Manually managed reviews", description: "Display and edit reviews through the dashboard.", price: "$30" })}${optionRow({ group: "reviews", value: "customer", selected: state.reviews === "customer", title: "Customer-submitted reviews", description: "Submission, ratings, moderation and reasonable spam protection.", price: "$45" })}</div>` });
  return sectionShell({ id: "customers", number: "03 · Customers & communication", title: "Build lasting relationships.", intro: "Give customers secure access and thoughtful ways to communicate.", visual: "accounts", content: accounts + contact + blog + newsletter + chat + reviews });
}

function renderManagingSection() {
  const search = groupShell({ id: "search", visual: "search", title: "Search. Help people find what matters.", intro: "Search supported website pages and content.", content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "search", selected: state.search, title: "Website search", description: "Search input, results and supported content indexing.", price: "$30" })}</div>` });
  const cms = groupShell({ id: "cms", visual: "cms", title: "Website editor. How much control would you like?", intro: "Choose occasional editing or broad visual control.", content: `<div class="option-stack">${optionRow({ group: "cms", value: "none", selected: state.cms === "none", title: "No editor", price: "Included" })}${optionRow({ group: "cms", value: "basic", selected: state.cms === "basic", title: "Basic editor", description: "Edit selected text and images.", price: "$35" })}${optionRow({ group: "cms", value: "full", selected: state.cms === "full", title: "Full visual editor", description: "Edit most text and replace all images.", price: "$145" })}</div>` });
  const dependencies = getDashboardDependencies(state);
  const dashboard = groupShell({ id: "dashboard", visual: "dashboard", title: "Admin dashboard. Keep everything in one place.", intro: "$60 once, plus $10 for each selected dashboard-dependent service.", content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "dashboardExplicit", selected: state.dashboardExplicit || dependencies.length > 0, title: dependencies.length ? "Admin dashboard — required" : "Admin dashboard", description: dependencies.length ? `Required by ${dependencies.length} selected service${dependencies.length === 1 ? "" : "s"}.` : "A private control panel selected on its own.", price: dependencies.length ? `$60 + $${dependencies.length * 10}` : "$60", disabled: dependencies.length > 0, reason: dependencies.length ? "It remains included while dependent services are selected." : "" })}</div>` });
  const languageCount = Math.max(7, Number(state.languageCount) || 7);
  const multilingual = groupShell({ id: "multilingual", visual: "multilingual", title: "Multilingual website. Reach more people.", intro: "Automatic translations may contain errors and should be reviewed before publication.", content: `<div class="option-stack">${optionRow({ group: "multilingual", value: "none", selected: state.multilingual === "none", title: "One language", price: "Included" })}${optionRow({ group: "multilingual", value: "3", selected: state.multilingual === "3", title: "Up to 3 languages", price: "$30" })}${optionRow({ group: "multilingual", value: "6", selected: state.multilingual === "6", title: "Up to 6 languages", price: "$45" })}${optionRow({ group: "multilingual", value: "more", selected: state.multilingual === "more", title: "More than 6 languages", description: "$50 base + $2 per language beyond six.", price: state.multilingual === "more" ? `$${50 + (languageCount - 6) * 2}` : "$50+" })}</div>${state.multilingual === "more" ? `<div class="quantity-control"><label for="language-count"><strong>Total languages</strong></label><input id="language-count" type="number" min="7" max="50" value="${languageCount}" data-language-count /></div>` : ""}${state.multilingual !== "none" ? `<div class="translation-options"><p class="field-label">Translation method</p><div class="option-stack">${optionRow({ group: "translation", value: "google", selected: state.translation === "google", title: "Google Translate", price: "Included" })}${optionRow({ group: "translation", value: "ai", selected: state.translation === "ai", title: "AI-powered translation", price: "+$5" })}${optionRow({ group: "translation", value: "human", selected: state.translation === "human", title: "Professional human translation", price: "Priced separately" })}</div></div>` : ""}<p class="option-note">Multilingual support does not replace accessibility compliance.</p>` });
  return sectionShell({ id: "managing", number: "04 · Managing your website", title: "Stay in control.", intro: "Choose how visitors find content and how you manage it after launch.", visual: "search", content: search + cms + dashboard + multilingual });
}

function renderGrowthSection() {
  const seo = groupShell({ id: "seo", visual: "seo", title: "SEO. Build a stronger search foundation.", intro: "Every website includes the essentials; professional optimisation goes deeper.", content: `<div class="option-stack">${optionRow({ group: "seo", value: "basic", selected: state.seo === "basic", title: "Basic SEO", description: "Titles, descriptions, semantic structure and accessibility.", price: "Included" })}${optionRow({ group: "seo", value: "professional", selected: state.seo === "professional", title: "Professional SEO", description: "Detailed metadata, keyword targeting and structured data where appropriate.", price: "$75" })}</div>` });
  const analytics = groupShell({ id: "analytics", visual: "analytics", title: "Analytics. Understand what visitors do.", intro: "Choose clear essentials or add device and trend analysis.", content: `<div class="option-stack">${optionRow({ group: "analytics", value: "none", selected: state.analytics === "none", title: "No analytics", price: "Included" })}${optionRow({ group: "analytics", value: "standard", selected: state.analytics === "standard", title: "Standard analytics", price: "$55" })}${optionRow({ group: "analytics", value: "advanced", selected: state.analytics === "advanced", title: "Advanced analytics & trends", price: "$75" })}</div>` });
  return sectionShell({ id: "growth", number: "05 · Growth & insights", title: "Create room to grow.", intro: "Improve search foundations and understand how people use your website.", visual: "seo", content: seo + analytics });
}

function renderAdvancedSection() {
  const dependencies = resolveDependencies(state).dependencies;
  const dependencyNote = (target) => dependencies.some((item) => item.owner === target) ? "Required dependencies are included automatically and itemised below." : "";
  const commerce = groupShell({ id: "advanced-commerce", visual: "loyalty", title: "Sales and rewards.", intro: "Powerful commerce tools with their required foundations included automatically.", content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "loyalty", selected: state.loyalty, title: "Loyalty points & rewards", description: "Earning, redemption, balances and reward management.", price: "$100–180", reason: dependencyNote("loyalty"), visual: "loyalty" })}${optionRow({ type: "checkbox", key: "giftCards", selected: state.giftCards, title: "Gift cards", description: "Purchasing or issuing, redemption and basic management.", price: "$70", reason: dependencyNote("giftCards"), visual: "giftCards" })}${optionRow({ type: "checkbox", key: "digitalDownloads", selected: state.digitalDownloads, title: "Digital downloads", description: "Secure delivery, download management and dashboard integration.", price: "$50", visual: "digitalDownloads" })}</div>${state.digitalDownloads ? `<div class="revealed-field">${optionRow({ type: "checkbox", key: "paidDownloads", selected: state.paidDownloads, title: "These downloads are paid", description: "Adds Professional checkout and appropriate access controls.", price: state.paidDownloads ? "$90–180" : "Optional", visual: "digitalDownloads" })}</div>` : ""}` });
  const email = groupShell({ id: "advanced-email", visual: "emailAutomation", title: "Email automation.", intro: "Provider subscriptions and delivery charges are separate.", content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "automatedEmails", selected: resolveDependencies(state).effective.automatedEmails, title: "Automated emails", description: "Basic event-triggered email configuration and management.", price: "$40", disabled: state.emailBuilder && !state.automatedEmails, reason: state.emailBuilder && !state.automatedEmails ? "Automatically required by Email Builder." : "" })}${optionRow({ type: "checkbox", key: "emailBuilder", selected: state.emailBuilder, title: "Email builder", description: "Visual composition, reusable content and layout editing.", price: "$35" })}</div>` });
  const forms = groupShell({ id: "community-forms", visual: "communityForms", title: "Polls & community forms.", intro: "Collect structured responses and manage them through the dashboard.", content: `<div class="option-stack">${optionRow({ group: "communityForms", value: "none", selected: state.communityForms === "none", title: "No community forms", price: "Included" })}${optionRow({ group: "communityForms", value: "standard", selected: state.communityForms === "standard", title: "Standard forms", description: "Polls, fields, submissions and management.", price: "$30" })}${optionRow({ group: "communityForms", value: "advanced", selected: state.communityForms === "advanced", title: "Advanced forms", description: "Adds conditional rules, attachments, signatures and optional account autofill.", price: "$60" })}</div><p class="option-note">Advanced forms work without accounts; autofill is available only when customer accounts are enabled.</p>` });
  return sectionShell({ id: "advanced", number: "06 · Advanced features", title: "Take your website further.", intro: "Powerful tools for customers, sales and communication.", visual: "dashboard", content: commerce + email + forms });
}

function renderFinishingSection() {
  const google = groupShell({ id: "google-business", visual: "googleBusiness", title: "Google Business. Be easier to find locally.", intro: "Setup help for an eligible physical business without promises of approval or placement.", content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "googleBusiness", selected: state.googleBusiness, title: "Google Business Profile setup", price: "$30" })}</div>` });
  const count = Math.max(7, Number(state.socialCount) || 7);
  const social = groupShell({ id: "social", visual: "social", title: "Social media. Start with the right footprint.", intro: "Choose how many accounts you would like help setting up.", content: `<div class="option-stack">${optionRow({ group: "social", value: "none", selected: state.social === "none", title: "No social setup", price: "Included" })}${optionRow({ group: "social", value: "3", selected: state.social === "3", title: "Up to 3 accounts", price: "$30" })}${optionRow({ group: "social", value: "6", selected: state.social === "6", title: "Up to 6 accounts", price: "$45" })}${optionRow({ group: "social", value: "more", selected: state.social === "more", title: "6 accounts + extras", description: "$50 base, then $5 per additional account.", price: state.social === "more" ? `$${50 + (count - 6) * 5}` : "$50+" })}</div>${state.social === "more" ? `<div class="quantity-control"><label for="social-count"><strong>Total accounts</strong></label><input id="social-count" type="number" min="7" max="50" value="${count}" data-social-count /></div>` : ""}` });
  const extras = groupShell({ id: "project-extras", visual: "domainAssistance", title: "Anything else before launch?", intro: "Add domain help or leave project notes. Notes are deliberately excluded from shareable codes.", content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "domainAssistance", selected: state.domainAssistance, title: "Domain & hosting assistance", description: "Registration, renewal and third-party costs are separate.", price: "To confirm" })}</div><label class="field-label" for="project-notes">Anything else you'd like us to know?</label><textarea id="project-notes" data-notes placeholder="Tell us about special requirements. Do not include passwords or sensitive information.">${escapeHtml(state.notes)}</textarea>` });
  return sectionShell({ id: "finishing", number: "07 · Finishing touches", title: "Get ready to launch.", intro: "Thoughtful extras can make the finished website easier to find and manage.", visual: "googleBusiness", content: google + social + extras });
}

function githubLogo() { return `<span class="hosting-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 .7A11.3 11.3 0 0 0 8.4 22.8c.6.1.8-.3.8-.6v-2.2c-3.4.7-4.1-1.4-4.1-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2.8.9 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.3 11.3 0 0 0 12 .7Z"/></svg></span>`; }
function firebaseLogo() { return `<span class="hosting-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#ffca28" d="m3 18 2.7-16 5.1 9.7L13.3 5 21 18l-9 5Z"/><path fill="#ffa000" d="m3 18 7.8-6.3L12 23Z"/><path fill="#f57c00" d="m12 23 9-5-10.2-6.3Z"/></svg></span>`; }

function renderHostingSection() {
  const backend = requiresBackend(state);
  const rows = `${optionRow({ group: "hosting", value: "static", selected: state.hosting === "static", title: "Static website", logo: githubLogo(), description: "GitHub Pages with HTTPS and custom domains within platform limits.", price: "Free", disabled: backend, reason: backend ? "Your selected features need backend services." : "" })}${optionRow({ group: "hosting", value: "firebase", selected: state.hosting === "firebase", title: "Interactive website", logo: firebaseLogo(), description: "Firebase-compatible hosting for accounts, data and interactive services.", price: "Free*" })}${optionRow({ group: "hosting", value: "byo", selected: state.hosting === "byo", title: "Bring your own hosting", description: "Use a compatible preferred provider or self-host.", price: "$20" })}`;
  const byo = state.hosting === "byo" ? `<div class="revealed-field"><label class="field-label" for="byo-platform">Which hosting platform?</label><input id="byo-platform" type="text" data-byo-platform value="${escapeHtml(state.byoPlatform)}" placeholder="e.g. Vercel, Netlify or your own server" maxlength="120" />${backend ? '<p class="option-note"><strong>Compatibility check needed:</strong> the provider must support every selected backend feature.</p>' : ""}</div>` : "";
  return sectionShell({ id: "hosting", number: "08 · Hosting & ongoing costs", title: "Choose where your website lives.", intro: "Transparent options, limits and possible future costs.", visual: "hosting", content: `${mobileVisual("hosting")}<div class="option-stack">${rows}</div>${byo}${compareBlock("hosting", "Hosting limits and ongoing costs", "<p>GitHub Pages is free for compatible static sites. Firebase has eligible free allowances, but databases, authentication, AI or higher usage can incur charges. Customer-provided hosting has a $20 linking fee and must support the chosen features.</p>")}` });
}

function reviewRows() {
  const estimate = calculateEstimate(state);
  return [["Pages", `${getPageCount(state)} selected`], ["Features", `${getSelectedFeatureIds(state).length} selected`], ["Dependencies", estimate.dependencies.length ? `${estimate.dependencies.length} automatically included` : "No automatic additions"], ["Hosting", hostingLabel(state.hosting)], ["Pricing", `${PRICING_VERSION} · AUD`]];
}

function renderEstimateSection() {
  const rows = reviewRows().map(([label, value]) => `<div class="review-line"><strong>${label}</strong><span>${escapeHtml(value)}</span></div>`).join("");
  const preparing = isGenerating ? `<div class="preparing-panel" role="status" aria-live="polite" aria-busy="true"><span class="preparing-spinner" aria-hidden="true"></span><strong>Preparing your estimate...</strong><small>Itemising pages, features and dependencies.</small></div>` : "";
  const quote = state.generated ? renderQuote(restoredSnapshot?.quote || currentSnapshot?.quote || calculateEstimate(state), Boolean(restoredSnapshot)) : "";
  const outdated = quoteOutdated ? '<p class="outdated-quote-note" role="status"><strong>Your previous quote number is outdated.</strong> Your configuration has changed, so generate a new estimate and continue again before emailing it.</p>' : "";
  return sectionShell({ id: "estimate", number: "09 · Your website estimate", title: "Your website, your way.", intro: "Everything you've chosen, all in one place.", visual: "hosting", extraClass: "estimate-section", content: `<div class="review-list">${rows}</div>${outdated}<div class="generate-panel"><h3>Ready to see the full breakdown?</h3><p>Generate a detailed estimate locally. Nothing is submitted and no account is required.</p><button class="generate-button" type="button" data-generate ${isGenerating ? "disabled" : ""}>${isGenerating ? "Preparing..." : "Generate my estimate"}</button></div>${preparing}${quote}` });
}

function quoteTotal(quote) { return formatMoneyRangeCents(getQuoteMoney(quote).finalCents); }

function renderPricingSummary(quote) {
  const money = getQuoteMoney(quote);
  const hasDiscount = money.discountCents.max > 0;
  const ruleLabel = formatDiscountRuleLabel(money);
  const known = quote.unpriced.length ? "Known " : "";
  if (!money.discountRuleVersion) {
    return `<div class="quote-total"><span>${known}historical estimated total</span><strong>${formatMoneyRangeCents(money.finalCents)}</strong></div>`;
  }
  const discount = hasDiscount
    ? `<div class="quote-pricing__row quote-pricing__discount"><span>Discount (${escapeHtml(ruleLabel)})</span><strong>${formatMoneyRangeCents(money.discountCents, { negative: true })}</strong></div>`
    : `<p class="quote-pricing__hint">The progressive discount applies ${escapeHtml(ruleLabel)}.</p>`;
  return `<section class="quote-pricing" aria-label="Website estimate"><p class="quote-group-title">Website estimate</p><div class="quote-pricing__row"><span>${known}Original estimate</span><strong>${formatMoneyRangeCents(money.originalCents)}</strong></div>${discount}<div class="quote-pricing__row quote-pricing__final"><span>Your ${known.toLowerCase()}estimated total</span><strong>${formatMoneyRangeCents(money.finalCents)}</strong></div></section>`;
}

function renderQuote(quote, historical = false) {
  const groups = [...new Set(quote.lines.map((line) => line.group))];
  const groupHtml = groups.map((group) => `<section class="quote-group"><p class="quote-group-title">${escapeHtml(group)}</p>${quote.lines.filter((line) => line.group === group).map((line) => `<div class="quote-line"><span>${escapeHtml(line.name)}${line.autoAdded ? " <small>(automatically included)</small>" : ""}</span><span>${line.included ? "Included" : displayPrice(line.price)}</span></div>`).join("")}</section>`).join("");
  const unpriced = quote.unpriced.length ? `<section class="quote-group"><p class="quote-group-title">Custom-priced items</p>${quote.unpriced.map((item) => `<div class="quote-line"><span>${escapeHtml(item)}</span><span>To be confirmed</span></div>`).join("")}</section>` : "";
  const dependencyHtml = quote.dependencies?.length ? `<section class="quote-group"><p class="quote-group-title">Automatically included dependencies</p>${quote.dependencies.map((item) => `<p>${escapeHtml(item.reason)}</p>`).join("")}</section>` : "";
  const ongoing = quote.ongoingCharges?.length ? `<section class="quote-group"><p class="quote-group-title">Possible ongoing or third-party charges</p><ul>${quote.ongoingCharges.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : "";
  const codePanel = currentCode ? renderCodePanel() : "";
  const nextSteps = currentCode && !quoteOutdated ? renderWhatsNext() : "";
  return `<article class="quote-panel" id="generated-quote" tabindex="-1"><header class="quote-header"><div><p class="section-number">${historical ? "Recovered historical estimate" : "BuiltByMatthew"}</p><h3>Indicative estimate</h3></div><p>Pricing ${escapeHtml(restoredSnapshot?.pricingVersion || PRICING_VERSION)}</p></header>${historical ? '<p class="historical-note">This is the original saved quote snapshot. It has not been recalculated using current prices.</p>' : ""}${groupHtml}${unpriced}${dependencyHtml}<section class="quote-group"><p class="quote-group-title">Hosting</p><p>${escapeHtml(restoredSnapshot?.hosting?.label || hostingLabel(state.hosting))}</p></section>${ongoing}${renderPricingSummary(quote)}${quote.unpriced.length ? '<p><strong>Complete total: subject to confirmation.</strong></p>' : ""}<p class="quote-notice">This is an indicative estimate, not a binding contract. Domain, hosting and third-party service fees may be additional.</p><div class="quote-actions"><button class="quote-action" type="button" data-copy>Copy estimate</button><button class="quote-action" type="button" data-edit>Edit selections</button><button class="quote-action" type="button" data-print>Print estimate</button><button class="quote-action" type="button" data-reset>Start again</button></div>${historical ? "" : `<div class="continue-panel"><h4>Happy with this starting point?</h4><p>Continuing saves a shareable copy of this indicative estimate. It does not create a contract, account or payment.</p><button class="generate-button" type="button" data-continue>I'm good with that quote, continue</button></div>`}${codePanel}${nextSteps}</article>`;
}

function renderCodePanel() {
  return `<section class="code-panel" id="configuration-code"><p class="section-number">Configuration code</p><h4>Save or share your estimate.</h4><p>This self-contained code restores the configuration and original quote. It contains no project notes or personal information. Its checksum detects copying errors; it is not a security signature.</p><textarea readonly data-generated-code aria-label="Generated configuration code">${escapeHtml(currentCode)}</textarea><div class="quote-actions"><button class="quote-action" type="button" data-copy-code>Copy code</button><a class="quote-action" href="../quote-viewer/">Open quote viewer</a></div></section>`;
}

function quoteEmailHref() {
  const subject = `Website enquiry — ${currentCode}`;
  const body = `Hi Matthew,\n\nI'd like to enquire about getting a website built.\n\nMy name:\nWebsite name (if decided):\nBrief description:\n\nMy quote number: ${currentCode}\n\nThanks!`;
  return `mailto:matthew@andomail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function renderWhatsNext() {
  return `<section class="whats-next" aria-labelledby="whats-next-title"><header class="whats-next__header"><h3 id="whats-next-title">What's next?</h3><p>Let's get your website built! Here's what's next for your site.</p></header><ol class="next-steps"><li class="next-step"><span class="next-step__number" aria-hidden="true">01</span><div class="next-step__content"><h4>Check everything looks right</h4><p>Take a moment to review your quote above and make sure you're happy with everything you've selected.</p><a class="text-link" href="#generated-quote">Review my quote</a></div></li><li class="next-step"><span class="next-step__number" aria-hidden="true">02</span><div class="next-step__content"><h4>Send us an email</h4><p>Send me an email at <a class="text-link" href="mailto:matthew@andomail.com">matthew@andomail.com</a>. To help the process run smoothly, please include:</p><ul><li>Your name.</li><li>A brief description of your website and its name, if you've decided on one.</li><li>Your quote number, shown above.</li></ul><p>We typically reply within one to three days, often sooner.</p><div class="next-step__actions"><a class="quote-action next-step__primary" data-email-quote href="${escapeHtml(quoteEmailHref())}">Email me</a><button class="quote-action" type="button" data-copy-next-code>Copy quote number</button></div><p class="copy-feedback" data-next-feedback role="status" aria-live="polite"></p></div></li><li class="next-step"><span class="next-step__number" aria-hidden="true">03</span><div class="next-step__content"><h4>We'll get started on your site!</h4><p>Once we've discussed your project and confirmed the details, we'll get started on bringing your website to life.</p><p><strong>Work begins only after the project details and final quote have been agreed upon.</strong></p></div></li></ol></section>`;
}

function captureOpenComparisons() { return new Set(Array.from(document.querySelectorAll("[data-comparison][open]"), (item) => item.dataset.comparison)); }
function restoreOpenComparisons(open) { open.forEach((id) => document.querySelector(`[data-comparison="${CSS.escape(id)}"]`)?.setAttribute("open", "")); }

function renderAll({ preserveScroll = false, focusSelector = "" } = {}) {
  const y = scrollY; const open = captureOpenComparisons();
  presetContainer.innerHTML = renderPresets();
  flow.innerHTML = [renderPagesSection(), renderSellingSection(), renderCustomersSection(), renderManagingSection(), renderGrowthSection(), renderAdvancedSection(), renderFinishingSection(), renderHostingSection()].join("");
  estimateContainer.innerHTML = renderEstimateSection();
  restoreOpenComparisons(open); hydrateVisualImages(); updateSummaryBar(); initVisualObserver();
  if (!visualStage.children.length) setActiveVisual(activeVisual, true);
  if (preserveScroll) window.scrollTo({ top: y, behavior: "auto" });
  if (focusSelector) requestAnimationFrame(() => document.querySelector(focusSelector)?.focus({ preventScroll: true }));
  window.__CONFIGURATOR_STATE__ = state;
  window.__CONFIGURATOR_ESTIMATE__ = calculateEstimate(state);
  window.__CONFIGURATOR_CODE__ = currentCode;
}

function updateSummaryBar() {
  const estimate = restoredSnapshot?.quote || calculateEstimate(state); const featureCount = getSelectedFeatureIds(state).length + (state.dashboardExplicit || getDashboardDependencies(state).length ? 1 : 0);
  const money = getQuoteMoney(estimate);
  barSelection.textContent = `${getPageCount(state)} page${getPageCount(state) === 1 ? "" : "s"} · ${featureCount} feature${featureCount === 1 ? "" : "s"}`;
  barTotal.textContent = quoteTotal(estimate);
  barDiscount.textContent = formatDiscountRuleLabel(money, { promotional: true });
  barDiscount.hidden = money.discountCents.max === 0;
}

function cancelGeneration() { clearTimeout(generationTimer); isGenerating = false; }
function activateSelectionVisual(key) { if (key && VISUAL_CONFIG[key]) setTimeout(() => setActiveVisual(key, reduceMotion.matches), 60); }

function invalidateGeneratedQuote() {
  cancelGeneration();
  const hadQuoteNumber = Boolean(currentCode);
  quoteOutdated = quoteOutdated || hadQuoteNumber;
  restoredSnapshot = null; currentSnapshot = null; currentCode = ""; state.generated = false;
  window.__CONFIGURATOR_CODE__ = "";
  return hadQuoteNumber;
}

function mutate(mutator, message = "", focusSelector = "") {
  const invalidatedQuote = invalidateGeneratedQuote(); hasInteracted = true; state.notice = "";
  mutator(state); normaliseState(state); renderAll({ preserveScroll: true, focusSelector });
  const outdatedMessage = invalidatedQuote ? "Your previous quote number is now outdated. Generate a new estimate before emailing it." : "";
  if (state.notice || message || outdatedMessage) setNotice([message, state.notice, outdatedMessage].filter(Boolean).join(" "));
}

function handleTier(group, value) {
  if (group === "bookings") return mutate((draft) => { draft.bookings = value === "online"; }, "", `[data-tier="bookings"][value="${value}"]`);
  mutate((draft) => { draft[group] = value; }, "", `[data-tier="${group}"][value="${value}"]`);
}

function toggleValue(key) {
  mutate((draft) => {
    if (key === "dashboardExplicit" && getDashboardDependencies(draft).length) return;
    if (key === "automatedEmails" && draft.emailBuilder && !draft.automatedEmails) return;
    draft[key] = !draft[key];
    if (key === "digitalDownloads" && !draft.digitalDownloads) draft.paidDownloads = false;
  }, "", `[data-toggle="${key}"]`);
}

function applySelectedPreset(id) {
  if (hasInteracted && state.presetId !== id && !window.confirm("Applying another preset will replace your current selections. Continue?")) return;
  const invalidatedQuote = invalidateGeneratedQuote(); state = applyPreset(id); hasInteracted = false; activeVisual = "pages";
  renderAll(); setActiveVisual("pages", true); setNotice(`${PRESET_CONFIG[id].name} applied. Every selection can still be customised.`);
  if (invalidatedQuote) setNotice(`${PRESET_CONFIG[id].name} applied. Your previous quote number is outdated; generate a new estimate before emailing it.`);
  document.querySelector("#configuration")?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
}

function activeQuote() { return restoredSnapshot?.quote || currentSnapshot?.quote || calculateEstimate(state); }

function generateQuoteText() {
  const quote = activeQuote(); const lines = ["BUILTBYMATTHEW — INDICATIVE ESTIMATE", `Pricing version: ${restoredSnapshot?.pricingVersion || PRICING_VERSION}`, ""];
  let group = "";
  quote.lines.forEach((line) => { if (line.group !== group) { group = line.group; lines.push(group.toUpperCase()); } lines.push(`${line.name}: ${line.included ? "Included" : displayPrice(line.price)}`); });
  quote.unpriced.forEach((item) => lines.push(`${item}: To be confirmed`));
  lines.push("", "HOSTING", restoredSnapshot?.hosting?.label || hostingLabel(state.hosting));
  const money = getQuoteMoney(quote);
  if (money.discountRuleVersion) {
    lines.push("", "WEBSITE ESTIMATE", `${quote.unpriced.length ? "Known original estimate" : "Original estimate"}: ${formatMoneyRangeCents(money.originalCents)}`);
    if (money.discountCents.max > 0) lines.push(`Discount (${formatDiscountRuleLabel(money)}): ${formatMoneyRangeCents(money.discountCents, { negative: true })}`);
    else lines.push(`Progressive discount: Applies ${formatDiscountRuleLabel(money)}`);
    lines.push(`Your ${quote.unpriced.length ? "known " : ""}estimated total: ${formatMoneyRangeCents(money.finalCents)}`);
  } else {
    lines.push("", `${quote.unpriced.length ? "Known historical total" : "Historical estimated total"}: ${formatMoneyRangeCents(money.finalCents)}`);
  }
  lines.push("", "This is an indicative estimate, not a binding contract. Third-party charges may apply.");
  return lines.join("\n");
}

document.addEventListener("change", (event) => {
  const input = event.target;
  const visualKey = input.closest("[data-visual]")?.dataset.visual;
  if (input.matches("[data-tier]")) handleTier(input.dataset.tier, input.value);
  else if (input.matches("[data-toggle]")) toggleValue(input.dataset.toggle);
  else if (input.matches("[data-custom-page-count]")) mutate((draft) => { draft.customPageCount = Number(input.value); }, "", "[data-custom-page-count]");
  else if (input.matches("[data-language-count]")) mutate((draft) => { draft.languageCount = Number(input.value); }, "", "[data-language-count]");
  else if (input.matches("[data-social-count]")) mutate((draft) => { draft.socialCount = Number(input.value); }, "", "[data-social-count]");
  activateSelectionVisual(visualKey);
});

document.addEventListener("input", (event) => {
  const input = event.target;
  if (input.matches("[data-byo-platform], [data-notes]")) {
    const hadActiveEstimate = state.generated || Boolean(currentCode) || Boolean(currentSnapshot) || Boolean(restoredSnapshot);
    const invalidatedQuote = hadActiveEstimate ? invalidateGeneratedQuote() : false;
    if (input.matches("[data-byo-platform]")) state.byoPlatform = input.value;
    if (input.matches("[data-notes]")) state.notes = input.value;
    if (hadActiveEstimate) {
      estimateContainer.innerHTML = renderEstimateSection(); updateSummaryBar();
      if (invalidatedQuote) setNotice("Your previous quote number is now outdated. Generate a new estimate before emailing it.");
    }
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button"); if (!button) return;
  if (button.dataset.preset) applySelectedPreset(button.dataset.preset);
  else if (button.dataset.page) { const visual = button.dataset.visual; mutate((draft) => { if (button.dataset.page !== "home") draft.pages[button.dataset.page] = !draft.pages[button.dataset.page]; }, "", `[data-page="${button.dataset.page}"]`); activateSelectionVisual(visual); }
  else if (button.dataset.menuTier) { mutate((draft) => { draft.menuTier = button.dataset.menuTier; }, "", `[data-menu-tier="${button.dataset.menuTier}"]`); activateSelectionVisual("menu"); }
  else if (button.dataset.helpTier) { mutate((draft) => { draft.helpTier = button.dataset.helpTier; }, "", `[data-help-tier="${button.dataset.helpTier}"]`); activateSelectionVisual("faq"); }
  else if (button.hasAttribute("data-scroll-estimate")) document.querySelector("#estimate")?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
  else if (button.hasAttribute("data-generate")) {
    cancelGeneration(); restoredSnapshot = null; currentCode = ""; currentSnapshot = createQuoteSnapshot(state); isGenerating = true; estimateContainer.innerHTML = renderEstimateSection();
    generationTimer = setTimeout(() => { isGenerating = false; state.generated = true; estimateContainer.innerHTML = renderEstimateSection(); requestAnimationFrame(() => document.querySelector("#generated-quote")?.focus()); }, 2000);
  } else if (button.hasAttribute("data-continue")) {
    currentSnapshot ||= createQuoteSnapshot(state); currentCode = encodeConfiguration(currentSnapshot); quoteOutdated = false; estimateContainer.innerHTML = renderEstimateSection(); window.__CONFIGURATOR_CODE__ = currentCode; requestAnimationFrame(() => document.querySelector("#configuration-code")?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" }));
  } else if (button.hasAttribute("data-recover")) {
    const input = document.querySelector("[data-recovery-code]"); const status = document.querySelector("[data-recovery-status]");
    try {
      const snapshot = decodeConfiguration(input.value); state = restoreConfiguration(snapshot); restoredSnapshot = snapshot; currentSnapshot = snapshot; currentCode = input.value.trim(); quoteOutdated = false; state.generated = true; hasInteracted = false; renderAll(); setNotice("Configuration restored. The original saved estimate is shown below."); document.querySelector("#generated-quote")?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
    } catch (error) { status.textContent = error.message; status.classList.add("is-error"); setNotice(error.message, true); }
  } else if (button.hasAttribute("data-copy")) {
    try { await copyText(generateQuoteText()); showToast("Estimate copied"); } catch { setNotice("Copying was blocked. Select and copy the estimate manually.", true); }
  } else if (button.hasAttribute("data-copy-code")) {
    try { await copyText(currentCode); showToast("Configuration code copied"); } catch { document.querySelector("[data-generated-code]")?.select(); setNotice("Copying was blocked. The full code is selected for you.", true); }
  } else if (button.hasAttribute("data-copy-next-code")) {
    const feedback = document.querySelector("[data-next-feedback]");
    try {
      await copyText(currentCode); showToast("Quote number copied");
      if (feedback) { clearTimeout(copyFeedbackTimer); feedback.textContent = "Quote number copied."; copyFeedbackTimer = setTimeout(() => { feedback.textContent = ""; }, 2200); }
    } catch { document.querySelector("[data-generated-code]")?.select(); setNotice("Copying was blocked. The full quote number is selected for you.", true); }
  } else if (button.hasAttribute("data-print")) window.print();
  else if (button.hasAttribute("data-edit")) document.querySelector("#configuration")?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
  else if (button.hasAttribute("data-reset")) { cancelGeneration(); state = createInitialState(); hasInteracted = false; restoredSnapshot = null; currentSnapshot = null; currentCode = ""; quoteOutdated = false; activeVisual = "pages"; renderAll(); setActiveVisual("pages", true); document.querySelector("#preset-container")?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" }); }
});

preloadVisuals(); setActiveVisual("pages", true); renderAll();
