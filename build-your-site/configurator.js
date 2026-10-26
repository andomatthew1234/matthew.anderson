import {
  PRICE_CONFIG,
  calculateEstimate,
  createInitialState,
  formatPrice,
  getDashboardDependencies,
  getPageCount,
  getSelectedFeatureIds,
  normaliseState,
  requiresBackend,
} from "./configurator-data.mjs";

let state = createInitialState();
let noticeTimer;
const openCategories = new Set(["selling"]);

const panel = document.querySelector("#step-panel");
const summaryContent = document.querySelector("#summary-content");
const previousButton = document.querySelector("#previous-step");
const nextButton = document.querySelector("#next-step");
const note = document.querySelector("#dependency-note");
const toast = document.querySelector("#toast");
const summaryToggle = document.querySelector(".summary__toggle");

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const checked = (condition) => (condition ? "checked" : "");
const selectedClass = (condition) => (condition ? " is-selected" : "");

function setNotice(message) {
  clearTimeout(noticeTimer);
  state.notice = message;
  if (!message) {
    note.hidden = true;
    return;
  }
  note.textContent = message;
  note.hidden = false;
  noticeTimer = setTimeout(() => {
    note.hidden = true;
    state.notice = "";
  }, 6500);
}

function priceLabel(price) {
  return `${formatPrice(price)}${formatPrice(price) === "Included" ? "" : " AUD"}`;
}

function presetCard(id, title, price, description, included) {
  const isSelected = state.pagesMode === "preset" && state.preset === id;
  return `
    <article class="selection-card${selectedClass(isSelected)}">
      <div class="card-topline"><p class="card-price">${priceLabel(price)}</p><span class="card-check" aria-hidden="true">✓</span></div>
      <h3>${title}</h3><p>${description}</p>
      <ul class="included-list">${included.map((item) => `<li>${item}</li>`).join("")}</ul>
      <button class="select-button" type="button" data-preset="${id}" aria-pressed="${isSelected}">${isSelected ? "✓ Selected" : "Choose package"}</button>
    </article>`;
}

function renderPages() {
  const customSelected = state.pagesMode === "custom";
  return `
    <div class="step-heading">
      <p class="section-kicker">Step 01 · Choose your pages</p>
      <h2>How many pages does your site need?</h2>
      <p>Start with a popular layout, or choose exactly what you need.</p>
    </div>
    <div class="card-grid">
      ${presetCard("home", "Just a homepage", PRICE_CONFIG.presets.home.price, "A focused home or landing page.", ["Responsive design", "Basic SEO", "Standard navigation where applicable"])}
      ${presetCard("about", "Home + About", PRICE_CONFIG.presets.about.price, "A clear introduction to you or your business.", ["Homepage", "About page", "Responsive design and basic SEO"])}
      ${presetCard("contact", "Home + About + Contact", PRICE_CONFIG.presets.contact.price, "A complete small-site foundation.", ["Homepage", "About page", "Contact page", "Contact form is a separate feature"])}
      <article class="selection-card${selectedClass(customSelected)}">
        <div class="card-topline"><p class="card-price">Tailored pricing</p><span class="card-check" aria-hidden="true">✓</span></div>
        <h3>Choose my own</h3>
        <p>Select individual pages and add as many custom pages as your project needs.</p>
        <ul class="included-list"><li>Homepage always included</li><li>Name optional custom pages</li><li>Only selected pages are charged</li></ul>
        <button class="select-button" type="button" data-custom-pages aria-pressed="${customSelected}">${customSelected ? "✓ Selected" : "Choose pages"}</button>
      </article>
    </div>
    ${customSelected ? renderCustomPages() : ""}`;
}

function renderCustomPages() {
  const items = Object.entries(PRICE_CONFIG.pages)
    .filter(([id]) => id !== "custom")
    .map(([id, page]) => {
      const required = id === "home";
      return `<div class="page-option">
        <label><input type="checkbox" data-page="${id}" ${checked(state.customPages[id])} ${required ? "disabled" : ""} />
          <span>${page.name}${required ? ' <span class="pill">Required</span>' : ""}</span>
        </label><small>${priceLabel(page.price)}</small>
      </div>`;
    })
    .join("");
  const extras = state.extraPages
    .map(
      (page, index) => `<div class="custom-page-row">
        <label><span class="field-label">Custom page ${index + 1} · ${priceLabel(PRICE_CONFIG.pages.custom.price)}</span>
          <input type="text" data-extra-name="${page.id}" value="${escapeHtml(page.name)}" placeholder="Optional page name" maxlength="80" />
        </label>
        <button class="remove-page" type="button" data-remove-extra="${page.id}" aria-label="Remove custom page ${index + 1}">×</button>
      </div>`,
    )
    .join("");
  return `<section class="custom-pages" aria-labelledby="custom-pages-title">
    <div class="section-heading"><div><p class="section-kicker">Custom selection</p><h3 id="custom-pages-title">Choose your pages</h3></div><span class="pill">${getPageCount(state)} pages</span></div>
    ${items}${extras}
    <button class="add-page-button" type="button" data-add-extra>+ Add a custom page</button>
    <p class="inline-note"><strong>Good to know:</strong> A store can be catalogue-only. Payments are selected separately. Events pages do not automatically include RSVP functionality.</p>
  </section>`;
}

function tierOption(group, value, current, title, price, description, disabled = false) {
  const active = current === value;
  return `<label class="tier-option${selectedClass(active)}">
    <input type="radio" name="${group}" data-tier="${group}" value="${value}" ${checked(active)} ${disabled ? "disabled" : ""} />
    <span><strong>${title}</strong><small>${description}</small></span><span>${price}</span>
  </label>`;
}

function featureCard({ id, icon, title, description, price, selected, details, content = "", disabled = false }) {
  return `<article class="feature-card${selectedClass(selected)}${disabled ? " is-disabled" : ""}">
    <div class="feature-heading"><span class="feature-icon" aria-hidden="true">${icon}</span><span class="card-check" aria-hidden="true">✓</span></div>
    <h3>${title}</h3><p class="feature-description">${description}</p><p class="card-price">${price}</p>
    ${content}
    ${id ? `<button class="select-button" type="button" data-toggle="${id}" aria-pressed="${selected}" ${disabled ? "disabled" : ""}>${selected ? "✓ Added" : "Add feature"}</button>` : ""}
    ${details ? `<details class="card-details"><summary>What's included?</summary><div class="included-list">${details}</div></details>` : ""}
  </article>`;
}

function category(id, title, count, body) {
  return `<details class="feature-category" data-category="${id}" ${openCategories.has(id) ? "open" : ""}>
    <summary><span>${title}</span><span class="category-count">${count} selected</span></summary>
    <div class="feature-category__body"><div class="card-grid">${body}</div></div>
  </details>`;
}

function renderFeatures() {
  const selectedIds = getSelectedFeatureIds(state);
  const counts = {
    selling: ["paymentLinks", "professionalCheckout", "publicRsvp", "memberRsvp", "bookings"].filter((id) => selectedIds.includes(id)).length,
    customers: ["standardAccounts", "fullAccounts", "contactForm", "blog", "newsletter"].filter((id) => selectedIds.includes(id)).length,
    managing: ["search", "basicCms", "fullCms"].filter((id) => selectedIds.includes(id)).length + (state.dashboardExplicit ? 1 : 0),
    growth: ["professionalSeo", "standardAnalytics", "advancedAnalytics"].filter((id) => selectedIds.includes(id)).length,
  };

  const selling = [
    featureCard({
      icon: "$", title: "Payments & checkout", description: "Accept payments from customers directly through your website.", price: state.payments === "none" ? "Choose a tier" : priceLabel(PRICE_CONFIG.features[state.payments === "links" ? "paymentLinks" : "professionalCheckout"].price), selected: state.payments !== "none",
      content: `<div class="tier-grid">${tierOption("payments", "none", state.payments, "No payments", "Free", "No payment functionality.")}${tierOption("payments", "links", state.payments, "Payment links", "$20", "Hosted payment buttons for simple purchases, donations or fixed-price services.")}${tierOption("payments", "professional", state.payments, "Professional checkout", "$90–180", "A cart, multiple products and flexible checkout with a supported provider.")}</div><p class="comparison"><strong>Why upgrade?</strong> Payment links suit simple transactions. Professional checkout suits stores with multiple products. Customer accounts are recommended, not required.</p>`,
      details: "Secure payment links redirect to a hosted payment page. Professional checkout adds cart and provider integration. Processing fees and subscriptions are separate.",
    }),
    featureCard({
      icon: "✓", title: "Events RSVP", description: "Let visitors register their attendance at your events.", price: state.rsvp === "none" ? "$40–80 when added" : "$40–80 AUD", selected: state.rsvp !== "none",
      content: `<div class="tier-grid">${tierOption("rsvp", "none", state.rsvp, "No RSVP", "Free", "A static events page can still be selected in Step 1.")}${tierOption("rsvp", "public", state.rsvp, "Public RSVP", "$40–80", "Event registration and attendee information without requiring accounts.")}${tierOption("rsvp", "member", state.rsvp, "Member-only RSVP", "$40–80", "Account-linked registration; compatible customer accounts are required.")}</div>`,
      details: "Event registration, attendee information collection and RSVP management. Member-only events also require customer accounts.",
    }),
    featureCard({ id: "bookings", icon: "◷", title: "Online bookings", description: "Let customers book appointments or services online.", price: "$70–95 AUD", selected: state.bookings, details: "Appointment selection, available booking times, booking form and a basic confirmation flow. Complex scheduling, staff management and paid booking systems may require a custom quote." }),
  ].join("");

  const customers = [
    featureCard({
      icon: "◎", title: "Customer accounts", description: "Let customers log in, manage details and access account-linked information.", price: state.accounts === "none" ? "Choose a tier" : priceLabel(PRICE_CONFIG.features[state.accounts === "full" ? "fullAccounts" : "standardAccounts"].price), selected: state.accounts !== "none",
      content: `<div class="tier-grid">${tierOption("accounts", "none", state.accounts, "No accounts", "Free", "No customer login system.", state.rsvp === "member")}${tierOption("accounts", "standard", state.accounts, "Standard accounts", "$60–95", "Registration, login, reset, profiles and service integration.")}${tierOption("accounts", "full", state.accounts, "Full accounts & login suite", "$120–200", "Adds 2FA, deletion, enhanced controls and dashboard user management.")}</div><p class="comparison"><strong>Why upgrade?</strong> Standard covers everyday customer access. Full adds stronger security and professional user-management controls using established authentication services.</p>`,
      details: "Account-linked information such as order history may be supported. The price does not cover custom authentication infrastructure built from scratch.",
    }),
    featureCard({ id: "contactForm", icon: "↗", title: "Contact form", description: "Let visitors contact you directly through your website.", price: "$30–50 AUD", selected: state.contactForm, details: "Form validation, message delivery and enquiry management. Includes the required admin dashboard and one $10 dashboard integration." }),
    featureCard({ id: "blog", icon: "¶", title: "Blog, journal or news feed", description: "Publish articles, announcements and updates.", price: "$60–90 AUD", selected: state.blog, details: "Listing, individual article pages, publishing tools and admin dashboard integration." }),
    featureCard({ id: "newsletter", icon: "+", title: "Newsletter signup", description: "Let visitors subscribe to receive updates from your business.", price: "$20–30 AUD", selected: state.newsletter, details: "Email signup, subscriber collection and dashboard management. Sending full email campaigns is not included." }),
  ].join("");

  const managing = [
    featureCard({ id: "search", icon: "⌕", title: "Website search", description: "Help visitors quickly find pages and supported website content.", price: "$30 AUD", selected: state.search, details: "Search input, results and searching supported website content." }),
    featureCard({
      icon: "✎", title: "Edit your website yourself", description: "Choose how much control you'd like after the website is published.", price: state.cms === "none" ? "Choose a tier" : priceLabel(PRICE_CONFIG.features[state.cms === "full" ? "fullCms" : "basicCms"].price), selected: state.cms !== "none",
      content: `<div class="tier-grid">${tierOption("cms", "none", state.cms, "No editor", "Free", "Changes require developer assistance.")}${tierOption("cms", "basic", state.cms, "Basic editor", "$35", "Edit selected text and replace selected images.")}${tierOption("cms", "full", state.cms, "Full visual editor", "$145", "Edit approximately 95% of text and replace all website images.")}</div>${state.cms === "basic" ? '<p class="comparison"><strong>Why upgrade to Full?</strong> Basic is great for occasional changes. Full gives you much more control over nearly all text and images.</p>' : ""}`,
      details: "Both tiers require the admin dashboard. Full suits businesses that frequently update services, promotions, photos and content.",
    }),
    featureCard({ id: "dashboardExplicit", icon: "▦", title: "Admin dashboard", description: "A private control panel for website features, content and information.", price: "$60 base + $10 per integrated service", selected: state.dashboardExplicit || getDashboardDependencies(state).length > 0, disabled: getDashboardDependencies(state).length > 0 && !state.dashboardExplicit, details: getDashboardDependencies(state).length ? `Currently required by ${getDashboardDependencies(state).length} selected service${getDashboardDependencies(state).length === 1 ? "" : "s"}. It cannot be removed while those services remain.` : "Select it independently for a private control panel. Services that need integration add $10 each." }),
  ].join("");

  const growth = [
    featureCard({
      icon: "↑", title: "Search engine optimisation", description: "Give search engines a clear, useful foundation for understanding your website.", price: state.seo === "basic" ? "Basic SEO included" : "$75 AUD", selected: state.seo === "professional",
      content: `<div class="tier-grid">${tierOption("seo", "basic", state.seo, "Basic SEO", "Included", "Page titles, descriptions, semantic structure and standard setup.")}${tierOption("seo", "professional", state.seo, "Professional SEO", "$75", "Detailed metadata, keyword targeting and structured data where appropriate.")}</div><p class="comparison"><strong>Why upgrade?</strong> Professional SEO adds deeper optimisation work and stronger search-visibility foundations. Rankings or traffic cannot be guaranteed.</p>`,
    }),
    featureCard({
      icon: "↗", title: "Website analytics", description: "Understand how visitors use your website with privacy-conscious analytics.", price: state.analytics === "none" ? "Choose a tier" : priceLabel(PRICE_CONFIG.features[state.analytics === "advanced" ? "advancedAnalytics" : "standardAnalytics"].price), selected: state.analytics !== "none",
      content: `<div class="tier-grid">${tierOption("analytics", "none", state.analytics, "No analytics", "Free", "No visitor analytics setup.")}${tierOption("analytics", "standard", state.analytics, "Standard analytics", "$55", "Page views, sessions, popular pages and relevant statistics.")}${tierOption("analytics", "advanced", state.analytics, "Advanced analytics & trends", "$75", "Adds device types, trends and extra traffic breakdowns.")}</div><p class="comparison"><strong>Why upgrade?</strong> Standard shows what's happening. Advanced helps explain how behaviour changes and which devices people use.</p>`,
      details: "Both tiers include dashboard integration. Available data depends on the selected privacy-conscious analytics provider.",
    }),
  ].join("");

  return `<div class="step-heading"><p class="section-kicker">Step 02 · Add features</p><h2>Make your website yours.</h2><p>Choose what your website can do. Add as much or as little as you need.</p></div>
    ${category("selling", "Selling & bookings", counts.selling, selling)}
    ${category("customers", "Customers & communication", counts.customers, customers)}
    ${category("managing", "Managing your website", counts.managing, managing)}
    ${category("growth", "Growth & insights", counts.growth, growth)}`;
}

function githubLogo() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .7A11.3 11.3 0 0 0 8.4 22.8c.6.1.8-.3.8-.6v-2.2c-3.4.7-4.1-1.4-4.1-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2.8.9 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.3 11.3 0 0 0 12 .7Z"/></svg>`;
}

function firebaseLogo() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffca28" d="m3 18 2.7-16 5.1 9.7L13.3 5 21 18l-9 5Z"/><path fill="#ffa000" d="m3 18 7.8-6.3L12 23Z"/><path fill="#f57c00" d="m12 23 9-5-10.2-6.3Z"/></svg>`;
}

function serverLogo() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><path d="M7 7h.01M7 17h.01M11 7h7M11 17h7"/></svg>`;
}

function hostingCard(id, logo, title, price, subtitle, description, included, extra = "") {
  const disabled = id === "static" && requiresBackend(state);
  const active = state.hosting === id;
  return `<article class="hosting-card${selectedClass(active)}${disabled ? " is-disabled" : ""}" aria-disabled="${disabled}">
    <div class="hosting-heading"><span class="platform-logo">${logo}</span><span class="card-check" aria-hidden="true">✓</span></div>
    <p class="hosting-price">${price}</p><h3>${title}</h3><p><strong>${subtitle}</strong></p><p>${description}</p>
    <ul class="included-list">${included.map((item) => `<li>${item}</li>`).join("")}</ul>${extra}
    <button class="select-button" type="button" data-hosting="${id}" aria-pressed="${active}" ${disabled ? "disabled" : ""}>${disabled ? "Backend required" : active ? "✓ Selected" : "Choose hosting"}</button>
    ${disabled ? '<p class="inline-note">Your selected features need a backend, so GitHub Pages alone isn\'t suitable.</p>' : ""}
  </article>`;
}

function renderFinishing() {
  const socialPrice = state.social === "3" ? "$30" : state.social === "6" ? "$45" : state.social === "more" ? `$${50 + (Math.max(7, Number(state.socialCount) || 7) - 6) * 5}` : "Choose a tier";
  const setupCards = [
    featureCard({ id: "googleBusiness", icon: "G", title: "Google Business Profile setup", description: "Help customers find your eligible physical business on Google Search and Maps.", price: "$30 AUD", selected: state.googleBusiness, details: "Assistance creating or configuring a profile. Verification, approval and search placement cannot be guaranteed." }),
    featureCard({
      icon: "#", title: "Social media setup", description: "Get your business ready to connect with customers on social media.", price: socialPrice, selected: state.social !== "none",
      content: `<div class="tier-grid">${tierOption("social", "none", state.social, "No setup", "Free", "No social account setup.")}${tierOption("social", "3", state.social, "Up to 3 accounts", "$30", "A focused social presence.")}${tierOption("social", "6", state.social, "Up to 6 accounts", "$45", "A broader platform setup.")}${tierOption("social", "more", state.social, "6 accounts + extras", "$50 + $5 each", "For more than six accounts.")}</div>${state.social === "more" ? `<label class="field-label" for="social-count">Total number of accounts</label><input id="social-count" type="number" min="7" max="50" value="${Math.max(7, Number(state.socialCount) || 7)}" data-social-count />` : ""}`,
      details: "The 6+ tier is $50 for six accounts, then $5 for every additional account.",
    }),
  ].join("");

  const byoExtra = state.hosting === "byo" ? `<label class="field-label" for="byo-platform">Which hosting platform would you like to use?</label><input id="byo-platform" type="text" data-byo-platform value="${escapeHtml(state.byoPlatform)}" placeholder="e.g. Vercel, Netlify, Cloudflare, your own server..." maxlength="120" />${requiresBackend(state) ? '<p class="inline-note"><strong>Compatibility check needed:</strong> Your platform must support the backend services selected. We’ll confirm compatibility before work begins.</p>' : ""}` : "";

  return `<div class="step-heading"><p class="section-kicker">Step 03 · Finishing touches</p><h2>The finishing touches.</h2><p>Need help getting everything ready? We've got a few extras.</p></div>
    <section class="service-section"><div class="section-heading"><div><p class="section-kicker">Optional setup</p><h3>Get ready to launch</h3></div></div><div class="card-grid">${setupCards}</div></section>
    <section class="hosting-section" aria-labelledby="hosting-title"><div class="section-heading"><div><p class="section-kicker">Hosting & ongoing costs</p><h3 id="hosting-title">Every website needs somewhere to live.</h3></div></div><p>Choose how you'd like yours to be hosted.</p>
      <div class="hosting-grid">
        ${hostingCard("static", githubLogo(), "Static website", "Free", "Powered by GitHub Pages", "Perfect for simple websites that don't need customer accounts, databases or complex interactive features.", ["Free website hosting", "No advertisements", "Free HTTPS and custom domains", "Usage within GitHub Pages limits"])}
        ${hostingCard("firebase", firebaseLogo(), "Interactive website", "Free* to start", "Powered by Google Firebase", "For websites that need accounts, databases or interactive services.", ["Hosting and backend services where required", "Database and authentication support", "Eligible free usage allowances"], '<details class="asterisk-details"><summary>What does the asterisk mean?</summary><p>Free allowances apply, but some features or higher usage may require the pay-as-you-go Blaze plan. Firebase charges are separate from development fees.</p></details>')}
        ${hostingCard("byo", serverLogo(), "Bring your own hosting", "$20 one-time", "Your platform. Your choice.", "We'll help connect the finished website to your chosen platform.", ["Basic deployment configuration", "Domain connection guidance", "Third-party hosting paid separately", "Advanced migration and maintenance not included"], byoExtra)}
      </div>
    </section>
    <section class="service-section"><div class="section-heading"><div><p class="section-kicker">Additional help</p><h3>Domain & project notes</h3></div></div>
      <div class="card-grid">
        ${featureCard({ id: "domainAssistance", icon: "◎", title: "Domain & hosting assistance", description: "Help with domain registration, connection and hosting decisions.", price: "To be confirmed", selected: state.domainAssistance, details: "Registration, renewal, hosting plans and third-party subscriptions may involve separate ongoing charges. This service is not silently treated as free." })}
        <article class="feature-card"><div class="feature-heading"><span class="feature-icon" aria-hidden="true">✦</span></div><h3>Anything else you'd like us to know?</h3><p class="feature-description">Tell us about special features, ideas or requirements.</p><textarea data-notes placeholder="Tell us about any special features, ideas or requirements you have in mind...">${escapeHtml(state.notes)}</textarea></article>
      </div>
    </section>`;
}

function hostingName() {
  return state.hosting === "static" ? "Static website — GitHub Pages" : state.hosting === "firebase" ? "Interactive website — Google Firebase" : "Customer-provided hosting";
}

function renderReviewBlock(title, items) {
  return `<section class="review-block"><h3>${title}</h3><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
}

function pageSummaryItems() {
  if (state.pagesMode === "preset") return [PRICE_CONFIG.presets[state.preset].name];
  const items = Object.entries(state.customPages).filter(([, value]) => value).map(([id]) => PRICE_CONFIG.pages[id].name);
  return items.concat(state.extraPages.map((page, index) => page.name.trim() || `Additional custom page ${index + 1}`));
}

function selectedFeatureNames() {
  const names = getSelectedFeatureIds(state).map((id) => PRICE_CONFIG.features[id].name);
  if (state.dashboardExplicit || getDashboardDependencies(state).length) names.push("Admin dashboard");
  if (!names.length) names.push("No optional features selected");
  names.push(state.seo === "professional" ? "Professional SEO" : "Basic SEO included");
  return [...new Set(names)];
}

function selectedServiceNames() {
  const names = [];
  if (state.googleBusiness) names.push("Google Business Profile setup");
  if (state.social === "3") names.push("Social media setup — up to 3 accounts");
  if (state.social === "6") names.push("Social media setup — up to 6 accounts");
  if (state.social === "more") names.push(`Social media setup — ${Math.max(7, Number(state.socialCount) || 7)} accounts`);
  if (state.domainAssistance) names.push("Domain & hosting assistance — to be confirmed");
  if (!names.length) names.push("No optional setup services selected");
  return names;
}

function renderEstimate() {
  return `<div class="step-heading"><p class="section-kicker">Step 04 · Your estimate</p><h2>Your website, your way.</h2><p>Ready to see what your website could cost?</p></div>
    <div class="review-grid">${renderReviewBlock("Pages", pageSummaryItems())}${renderReviewBlock("Features", selectedFeatureNames())}${renderReviewBlock("Finishing touches", selectedServiceNames())}${renderReviewBlock("Hosting", [hostingName(), state.hosting === "byo" && state.byoPlatform ? `Platform: ${state.byoPlatform}` : state.hosting === "firebase" ? "Usage-based charges may apply" : "Free within platform limits"])}</div>
    <div class="generate-wrap"><h3>Everything look right?</h3><p>Generate a detailed, deterministic estimate using the selections above. No details are sent anywhere.</p><button class="primary-button" type="button" data-generate>Generate my estimate <span aria-hidden="true">→</span></button></div>
    ${state.generated ? renderQuote() : ""}`;
}

function renderQuote() {
  const estimate = calculateEstimate(state);
  const groups = [...new Set(estimate.lines.map((line) => line.group))];
  const groupHtml = groups.map((group) => `<section class="quote-group"><p class="quote-group-title">${group}</p>${estimate.lines.filter((line) => line.group === group).map((line) => `<div class="quote-line"><span>${escapeHtml(line.name)}</span><span>${line.included ? "Included" : priceLabel(line.price)}</span></div>`).join("")}</section>`).join("");
  const unpriced = estimate.unpriced.length ? `<section class="quote-group"><p class="quote-group-title">To be confirmed</p>${estimate.unpriced.map((item) => `<div class="quote-line"><span>${escapeHtml(item)}</span><span>To be confirmed</span></div>`).join("")}</section>` : "";
  const hostingDetails = state.hosting === "static"
    ? "Hosting setup: Included. Ongoing hosting: Free within GitHub Pages platform limits and abuse-prevention policies."
    : state.hosting === "firebase"
      ? "Hosting setup: Included. Initial hosting estimate: $0*. Free allowances may apply; usage-based Firebase charges may be payable separately."
      : `One-time linking fee: $20. Hosting subscription is paid separately by the customer.${requiresBackend(state) ? " Backend compatibility requires confirmation." : ""}`;
  const totalLabel = estimate.totals.min === estimate.totals.max ? `$${estimate.totals.min} AUD` : `$${estimate.totals.min}–${estimate.totals.max} AUD`;
  return `<article class="quote-panel" id="generated-quote" tabindex="-1">
    <header class="quote-header"><div><p class="section-kicker">BuiltByMatthew</p><h3>Indicative estimate</h3></div><p>${new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(new Date())}</p></header>
    ${groupHtml}${unpriced}
    <section class="quote-group"><p class="quote-group-title">Hosting & ongoing costs</p><p>${hostingDetails}</p>${state.byoPlatform ? `<p>Preferred platform: ${escapeHtml(state.byoPlatform)}</p>` : ""}</section>
    ${state.notes.trim() ? `<section class="quote-group"><p class="quote-group-title">Other requests</p><p>${escapeHtml(state.notes).replaceAll("\n", "<br>")}</p></section>` : ""}
    <div class="quote-total"><span>${estimate.unpriced.length ? "Priced subtotal" : "Estimated total"}</span><strong>${totalLabel}</strong></div>
    ${estimate.unpriced.length ? '<p><strong>Complete total: Subject to confirmation.</strong></p>' : ""}
    <p class="quote-notice">This is an indicative estimate, not a final quote. Final pricing will be confirmed after reviewing your project requirements. Domain, hosting and third-party service fees may be additional.</p>
    <div class="quote-actions"><button class="copy-button" type="button" data-copy>Copy estimate</button><button class="secondary-button" type="button" data-edit>Edit selections</button><button class="secondary-button" type="button" data-print>Print estimate</button><button class="text-button" type="button" data-reset>Start again</button></div>
  </article>`;
}

function renderSummary() {
  const items = [`${getPageCount(state)} page${getPageCount(state) === 1 ? "" : "s"}`];
  getSelectedFeatureIds(state).forEach((id) => items.push(PRICE_CONFIG.features[id].name));
  if (state.dashboardExplicit || getDashboardDependencies(state).length) items.push(`Admin dashboard${getDashboardDependencies(state).length ? ` + ${getDashboardDependencies(state).length} integration${getDashboardDependencies(state).length === 1 ? "" : "s"}` : ""}`);
  items.push(state.seo === "professional" ? "Professional SEO" : "Basic SEO included");
  summaryContent.innerHTML = `<ul class="summary-list">${[...new Set(items)].map((item) => `<li><span>${escapeHtml(item)}</span></li>`).join("")}</ul><p class="summary-hosting"><strong>Hosting:</strong><br>${hostingName()}</p>`;
}

function updateProgress() {
  document.querySelectorAll("[data-step-jump]").forEach((button, index) => {
    const item = button.closest("li");
    item.classList.toggle("is-active", index === state.step);
    item.classList.toggle("is-complete", index < state.step);
    button.toggleAttribute("aria-current", index === state.step);
  });
  document.querySelector(".step-progress__line span").style.width = `${(state.step / 3) * 100}%`;
}

function render({ focus = false } = {}) {
  panel.innerHTML = [renderPages, renderFeatures, renderFinishing, renderEstimate][state.step]();
  renderSummary();
  updateProgress();
  previousButton.hidden = state.step === 0;
  nextButton.hidden = state.step === 3;
  nextButton.innerHTML = state.step === 2 ? 'Review estimate <span aria-hidden="true">→</span>' : 'Continue <span aria-hidden="true">→</span>';
  if (state.notice) setNotice(state.notice);
  if (focus) {
    panel.querySelector("h2")?.setAttribute("tabindex", "-1");
    panel.querySelector("h2")?.focus({ preventScroll: true });
    window.scrollTo({ top: document.querySelector(".step-progress").offsetTop - 20, behavior: "smooth" });
  }
  window.__CONFIGURATOR_STATE__ = state;
  window.__CONFIGURATOR_ESTIMATE__ = calculateEstimate(state);
}

function mutate(mutator, noticeMessage = "") {
  state.notice = "";
  mutator(state);
  state.generated = false;
  normaliseState(state);
  if (noticeMessage) state.notice = state.notice ? `${noticeMessage} ${state.notice}` : noticeMessage;
  render();
}

function selectPreset(id) {
  mutate((draft) => {
    draft.pagesMode = "preset";
    draft.preset = id;
  });
}

function chooseCustomPages() {
  mutate((draft) => {
    if (!draft.customInitialised) {
      const selectedPages = PRICE_CONFIG.presets[draft.preset].pages;
      for (const id of Object.keys(draft.customPages)) draft.customPages[id] = selectedPages.includes(id);
      draft.customPages.home = true;
      draft.customInitialised = true;
    }
    draft.pagesMode = "custom";
  });
}

function handleTier(group, value) {
  const dashboardTier =
    (group === "cms" && value !== "none") ||
    (group === "analytics" && value !== "none") ||
    (group === "accounts" && value === "full");
  mutate((draft) => {
    if (group === "rsvp") {
      const leavingMember = draft.rsvp === "member" && value !== "member";
      draft.rsvp = value;
      if (leavingMember && draft.accountsAutoAdded) {
        draft.accounts = "none";
        draft.accountsAutoAdded = false;
      }
    } else {
      draft[group] = value;
      if (group === "accounts") draft.accountsAutoAdded = false;
    }
  }, dashboardTier ? "This selection includes the admin dashboard ($60 base) and one $10 service integration." : "");
}

function toggleValue(key) {
  const dashboardNames = { contactForm: "contact form", blog: "blog", newsletter: "newsletter signup" };
  const willAddDashboardService = Boolean(dashboardNames[key] && !state[key]);
  mutate((draft) => {
    if (key === "dashboardExplicit" && getDashboardDependencies(draft).length && !draft.dashboardExplicit) return;
    draft[key] = !draft[key];
  }, willAddDashboardService ? `Your ${dashboardNames[key]} includes the admin dashboard ($60 base) and one $10 service integration so you can manage it in one place.` : "");
}

function generateQuoteText() {
  const estimate = calculateEstimate(state);
  const lines = ["BUILTBYMATTHEW — INDICATIVE ESTIMATE", ""];
  let lastGroup = "";
  for (const line of estimate.lines) {
    if (line.group !== lastGroup) {
      lastGroup = line.group;
      lines.push(lastGroup.toUpperCase());
    }
    lines.push(`${line.name}: ${line.included ? "Included" : priceLabel(line.price)}`);
  }
  estimate.unpriced.forEach((item) => lines.push(`${item}: To be confirmed`));
  lines.push("", "HOSTING & ONGOING COSTS", hostingName());
  if (state.byoPlatform) lines.push(`Preferred platform: ${state.byoPlatform}`);
  if (state.notes.trim()) lines.push("", "OTHER REQUESTS", state.notes.trim());
  const total = estimate.totals.min === estimate.totals.max ? `$${estimate.totals.min}` : `$${estimate.totals.min}–${estimate.totals.max}`;
  lines.push("", `${estimate.unpriced.length ? "Priced subtotal" : "Estimated total"}: ${total} AUD`);
  if (estimate.unpriced.length) lines.push("Complete total: Subject to confirmation.");
  lines.push("", "This is an indicative estimate, not a final quote. Final pricing will be confirmed after reviewing your project requirements. Domain, hosting and third-party service fees may be additional.");
  return lines.join("\n");
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.stepJump !== undefined) {
    state.step = Number(target.dataset.stepJump);
    state.generated = false;
    render({ focus: true });
  } else if (target.dataset.preset) selectPreset(target.dataset.preset);
  else if (target.hasAttribute("data-custom-pages")) chooseCustomPages();
  else if (target.dataset.addExtra !== undefined) mutate((draft) => { draft.customInitialised = true; draft.extraPages.push({ id: crypto.randomUUID(), name: "" }); });
  else if (target.dataset.removeExtra) mutate((draft) => { draft.customInitialised = true; draft.extraPages = draft.extraPages.filter((page) => page.id !== target.dataset.removeExtra); });
  else if (target.dataset.toggle) toggleValue(target.dataset.toggle);
  else if (target.dataset.hosting) mutate((draft) => { draft.hosting = target.dataset.hosting; draft.hostingWasChosen = true; }, target.dataset.hosting === "byo" && requiresBackend(state) ? "We’ll confirm that your hosting platform supports the selected backend features." : "");
  else if (target.hasAttribute("data-generate")) {
    state.generated = true;
    render();
    requestAnimationFrame(() => document.querySelector("#generated-quote")?.focus());
  } else if (target.hasAttribute("data-copy")) {
    try {
      await navigator.clipboard.writeText(generateQuoteText());
      toast.textContent = "Estimate copied";
      toast.hidden = false;
      setTimeout(() => { toast.hidden = true; }, 2200);
    } catch {
      setNotice("Copying was blocked by your browser. You can select and copy the estimate manually.");
    }
  } else if (target.hasAttribute("data-print")) window.print();
  else if (target.hasAttribute("data-edit")) { state.step = 0; state.generated = false; render({ focus: true }); }
  else if (target.hasAttribute("data-reset")) { state = createInitialState(); render({ focus: true }); }
});

document.addEventListener("change", (event) => {
  const input = event.target;
  if (input.matches("[data-page]")) mutate((draft) => { draft.customInitialised = true; draft.customPages[input.dataset.page] = input.checked; });
  if (input.matches("[data-tier]")) handleTier(input.dataset.tier, input.value);
  if (input.matches("[data-social-count]")) mutate((draft) => { draft.socialCount = Math.max(7, Math.min(50, Number(input.value) || 7)); });
});

document.addEventListener("input", (event) => {
  const input = event.target;
  if (input.matches("[data-extra-name]")) {
    const page = state.extraPages.find((item) => item.id === input.dataset.extraName);
    if (page) page.name = input.value;
  }
  if (input.matches("[data-byo-platform]")) state.byoPlatform = input.value;
  if (input.matches("[data-notes]")) state.notes = input.value;
  state.generated = false;
});

document.addEventListener("toggle", (event) => {
  const categoryElement = event.target.closest?.("[data-category]");
  if (!categoryElement || event.target !== categoryElement) return;
  if (categoryElement.open) openCategories.add(categoryElement.dataset.category);
  else openCategories.delete(categoryElement.dataset.category);
}, true);

previousButton.addEventListener("click", () => {
  if (state.step > 0) {
    state.step -= 1;
    state.generated = false;
    render({ focus: true });
  }
});

nextButton.addEventListener("click", () => {
  if (state.step < 3) {
    state.step += 1;
    render({ focus: true });
  }
});

summaryToggle.addEventListener("click", () => {
  const expanded = summaryToggle.getAttribute("aria-expanded") === "true";
  summaryToggle.setAttribute("aria-expanded", String(!expanded));
  summaryContent.hidden = expanded;
  summaryToggle.querySelector(".summary__toggle-icon").textContent = expanded ? "+" : "−";
});

render();
