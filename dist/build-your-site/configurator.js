import {
  PRICE_CONFIG,
  VISUAL_CONFIG,
  calculateEstimate,
  createInitialState,
  formatPrice,
  getDashboardDependencies,
  getPageCount,
  getSelectedFeatureIds,
  normaliseState,
  requiresBackend,
} from "./configurator-data.mjs?v=4";

let state = createInitialState();
let visualObserver;
let activeVisual = "pages";
let visualTimer;
let noticeTimer;
const loadedVisuals = new Set();

const flow = document.querySelector("#configuration-flow");
const estimateContainer = document.querySelector("#estimate-container");
const visualStage = document.querySelector("#visual-stage");
const note = document.querySelector("#dependency-note");
const toast = document.querySelector("#toast");
const barSelection = document.querySelector("#bar-selection");
const barTotal = document.querySelector("#bar-total");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const selectedClass = (selected) => (selected ? " is-selected" : "");
const checked = (selected) => (selected ? "checked" : "");

function displayPrice(price) {
  const value = formatPrice(price);
  return value === "Included" || value === "To be confirmed" ? value : `${value} AUD`;
}

function setNotice(message) {
  clearTimeout(noticeTimer);
  if (!message) {
    note.hidden = true;
    return;
  }
  note.textContent = message;
  note.hidden = false;
  noticeTimer = setTimeout(() => {
    note.hidden = true;
    state.notice = "";
  }, 7000);
}

function visualMarkup(key, mobile = false) {
  const visual = VISUAL_CONFIG[key] || VISUAL_CONFIG.pages;
  const image = `<img data-visual-image="${key}" data-src="${visual.src}" alt="${escapeHtml(visual.label)} preview" hidden />`;
  return `<div class="${mobile ? "mobile-visual__inner" : "visual-stage__inner"}" data-active-visual="${key}">
    <div class="visual-placeholder" data-placeholder="${key}">
      ${image}
      <div class="visual-placeholder__label"><span class="visual-path">Replaceable preview</span><strong>${escapeHtml(visual.label)}</strong></div>
    </div>
  </div>`;
}

function mobileVisual(key) {
  return `<div class="mobile-visual" aria-hidden="true">${visualMarkup(key, true)}</div>`;
}

function hydrateVisualImages(root = document) {
  root.querySelectorAll("[data-visual-image]").forEach((image) => {
    if (!loadedVisuals.has(image.dataset.visualImage)) return;
    const reveal = () => {
      image.classList.add("is-loaded");
      image.closest(".visual-placeholder")?.classList.add("has-image");
    };
    image.addEventListener("load", reveal, { once: true });
    image.src = image.dataset.src;
    image.hidden = false;
    if (image.complete && image.naturalWidth > 0) reveal();
  });
}

function preloadVisuals() {
  for (const [key, visual] of Object.entries(VISUAL_CONFIG)) {
    const image = new Image();
    image.onload = () => {
      loadedVisuals.add(key);
      hydrateVisualImages();
    };
    image.onerror = () => loadedVisuals.delete(key);
    image.src = visual.src;
  }
}

function setActiveVisual(key, immediate = false) {
  if (!VISUAL_CONFIG[key] || (activeVisual === key && visualStage.children.length)) return;
  activeVisual = key;
  clearTimeout(visualTimer);
  if (immediate || reduceMotion.matches || !visualStage.children.length) {
    visualStage.innerHTML = visualMarkup(key);
    visualStage.classList.remove("is-changing");
    hydrateVisualImages(visualStage);
    return;
  }
  visualStage.classList.add("is-changing");
  visualTimer = setTimeout(() => {
    visualStage.innerHTML = visualMarkup(key);
    hydrateVisualImages(visualStage);
    requestAnimationFrame(() => visualStage.classList.remove("is-changing"));
  }, 160);
}

function initVisualObserver() {
  visualObserver?.disconnect();
  if (!("IntersectionObserver" in window)) return;
  visualObserver = new IntersectionObserver(
    (entries) => {
      const active = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top - innerHeight * 0.42) - Math.abs(b.boundingClientRect.top - innerHeight * 0.42))[0];
      if (active) setActiveVisual(active.target.dataset.visual);
    },
    { rootMargin: "-25% 0px -52% 0px", threshold: 0 },
  );
  document.querySelectorAll("[data-visual]").forEach((element) => visualObserver.observe(element));
}

function optionRow({
  type = "radio",
  group,
  value,
  key,
  selected,
  title,
  description = "",
  price,
  disabled = false,
  reason = "",
  logo = "",
}) {
  const data = type === "radio" ? `data-tier="${group}" value="${value}"` : `data-toggle="${key}"`;
  return `<label class="option-row${selectedClass(selected)}${disabled ? " is-disabled" : ""}">
    <input class="sr-only" type="${type}" ${type === "radio" ? `name="${group}"` : ""} ${data} ${checked(selected)} ${disabled ? "disabled" : ""} />
    <span class="option-indicator" aria-hidden="true">✓</span>
    <span class="option-copy"><strong>${logo}${title}</strong>${description ? `<small>${description}</small>` : ""}${reason ? `<small><strong>${reason}</strong></small>` : ""}</span>
    <span class="option-price">${price}</span>
  </label>`;
}

function compareBlock(id, label, content) {
  return `<details class="comparison" data-comparison="${id}"><summary>${label}</summary><div class="comparison__content">${content}</div></details>`;
}

function groupShell({ id, visual, title, intro, content }) {
  return `<div class="config-group" id="${id}" data-visual="${visual}">
    ${mobileVisual(visual)}<h3>${title}</h3><p>${intro}</p>${content}
  </div>`;
}

function sectionShell({ id, number, title, intro, visual, content, extraClass = "" }) {
  return `<section class="config-section ${extraClass}" id="${id}" data-visual="${visual}" aria-labelledby="${id}-title">
    <header class="config-section__heading"><p class="section-number">${number}</p><h2 id="${id}-title">${title}</h2><p>${intro}</p></header>
    ${content}
  </section>`;
}

function renderCustomPages() {
  const pageRows = Object.entries(PRICE_CONFIG.pages)
    .filter(([id]) => id !== "custom")
    .map(([id, page]) => `<div class="custom-page-option">
      <label><input type="checkbox" data-page="${id}" ${checked(state.customPages[id])} ${id === "home" ? "disabled" : ""} /><span>${page.name}${id === "home" ? " — required" : ""}</span></label>
      <small>${displayPrice(page.price)}</small>
    </div>`)
    .join("");
  const extras = state.extraPages
    .map((page, index) => `<div class="custom-page-row"><input type="text" data-extra-name="${page.id}" value="${escapeHtml(page.name)}" placeholder="Custom page ${index + 1} name (optional)" maxlength="80" /><button class="remove-page" type="button" data-remove-extra="${page.id}" aria-label="Remove custom page ${index + 1}">×</button></div>`)
    .join("");
  return `<div class="custom-pages-panel">${pageRows}${extras}<button class="small-button" type="button" data-add-extra>+ Add custom page</button><p class="option-note"><strong>Good to know:</strong> Store payments and event RSVPs are selected separately below.</p></div>`;
}

function renderPagesSection() {
  const mode = state.pagesMode === "custom" ? "custom" : state.preset;
  const rows = [
    optionRow({ group: "pages", value: "home", selected: mode === "home", title: "Just a homepage", description: "One responsive homepage or landing page with Basic SEO.", price: "$50–100" }),
    optionRow({ group: "pages", value: "about", selected: mode === "about", title: "Home + About", description: "A clear introduction to you or your business.", price: "$75–120" }),
    optionRow({ group: "pages", value: "contact", selected: mode === "contact", title: "Home + About + Contact", description: "A complete small-site foundation. A functional form is selected separately.", price: "$105–170" }),
    optionRow({ group: "pages", value: "custom", selected: mode === "custom", title: "Choose my own", description: "Select individual pages and add named custom pages.", price: "Tailored" }),
  ].join("");
  return sectionShell({
    id: "pages", number: "01 · Your website's pages", title: "Start with the right pages.", intro: "Choose a popular layout or shape the website page by page.", visual: "pages",
    content: `${mobileVisual("pages")}<div class="option-stack" role="radiogroup" aria-label="Page package">${rows}</div>${state.pagesMode === "custom" ? renderCustomPages() : ""}`,
  });
}

function renderSellingSection() {
  const paymentsVisual = state.payments === "links" ? "paymentLinks" : "professionalPayments";
  const payments = groupShell({
    id: "payments", visual: paymentsVisual, title: "Payments. How would you like customers to pay?", intro: "Choose a simple hosted payment link or a complete multi-product checkout.",
    content: `<div class="option-stack">${optionRow({ group: "payments", value: "none", selected: state.payments === "none", title: "No payments", description: "No payment functionality.", price: "Included" })}${optionRow({ group: "payments", value: "links", selected: state.payments === "links", title: "Payment links", description: "Secure links for products, services or donations.", price: "$20" })}${optionRow({ group: "payments", value: "professional", selected: state.payments === "professional", title: "Professional checkout", description: "Shopping cart, multiple products and flexible checkout.", price: "$90–180" })}</div>${compareBlock("payments", "Compare payment options", "<p><strong>Payment links</strong> are best for simple purchases and fixed-price services. <strong>Professional checkout</strong> suits stores with multiple products. Customer accounts are recommended, not required. Provider fees are separate.</p>")}`,
  });
  const bookings = groupShell({
    id: "bookings", visual: "bookings", title: "Bookings. Let customers reserve your time.", intro: "Add a clear appointment selection and basic confirmation flow.",
    content: `<div class="option-stack">${optionRow({ group: "bookings", value: "none", selected: !state.bookings, title: "No bookings", description: "No appointment booking system.", price: "Included" })}${optionRow({ group: "bookings", value: "online", selected: state.bookings, title: "Online appointments", description: "Available times, booking form and confirmation flow.", price: "$70–95" })}</div>${compareBlock("bookings", "What's included?", "<p>Appointment selection, available times, a booking form and basic confirmation. Complex staff scheduling and paid booking systems may require a custom quote.</p>")}`,
  });
  const events = groupShell({
    id: "events", visual: "events", title: "Events. Let people register to attend.", intro: "Public registration can work without accounts; member-only events require login.",
    content: `<div class="option-stack">${optionRow({ group: "rsvp", value: "none", selected: state.rsvp === "none", title: "No RSVP", description: "A static events page can still be selected above.", price: "Included" })}${optionRow({ group: "rsvp", value: "public", selected: state.rsvp === "public", title: "Public RSVP", description: "Registration, attendee information and RSVP management.", price: "$40–80" })}${optionRow({ group: "rsvp", value: "member", selected: state.rsvp === "member", title: "Member-only RSVP", description: "Account-linked event registration for members.", price: "$40–80" })}</div>${compareBlock("rsvp", "Need help choosing?", "<p>Choose Public for ordinary events. Member-only RSVP adds compatible customer accounts so attendance can be linked securely to a login.</p>")}`,
  });
  return sectionShell({ id: "selling", number: "02 · Selling & bookings", title: "Turn visits into action.", intro: "Take payments, accept bookings and manage event attendance.", visual: paymentsVisual, content: payments + bookings + events });
}

function renderCustomersSection() {
  const accounts = groupShell({
    id: "accounts", visual: "accounts", title: "Customer accounts. Choose the right level of access.", intro: "Let customers sign in, manage information and use account-linked services.",
    content: `<div class="option-stack">${optionRow({ group: "accounts", value: "none", selected: state.accounts === "none", title: "No accounts", description: "No customer login system.", price: "Included", disabled: state.rsvp === "member", reason: state.rsvp === "member" ? "Required by member-only RSVP." : "" })}${optionRow({ group: "accounts", value: "standard", selected: state.accounts === "standard", title: "Standard accounts", description: "Registration, login, password resets and profiles.", price: "$60–95" })}${optionRow({ group: "accounts", value: "full", selected: state.accounts === "full", title: "Full accounts suite", description: "Adds 2FA, enhanced security and admin user management.", price: "$120–200" })}</div>${compareBlock("accounts", "Compare account options", "<p><strong>Standard</strong> covers everyday customer access and profiles. <strong>Full</strong> adds two-factor authentication, deletion, enhanced controls and dashboard user management using established authentication services.</p>")}`,
  });
  const contact = groupShell({
    id: "contact-form", visual: "contact", title: "Contact form. Make it easy to get in touch.", intro: "Receive clear, validated enquiries through your website.",
    content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "contactForm", selected: state.contactForm, title: "Contact form", description: "Validated messages with enquiry management.", price: "$30–50" })}</div>${compareBlock("contact", "What's included?", "<p>A tailored form, input validation and message delivery. Selecting it also includes the admin dashboard and one service integration.</p>")}`,
  });
  const blog = groupShell({
    id: "blog", visual: "blog", title: "Blog, journal or news feed. Keep people informed.", intro: "Publish articles, updates and announcements from your website.",
    content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "blog", selected: state.blog, title: "Blog, journal or news feed", description: "Publish and manage articles and announcements.", price: "$60–90" })}</div>${compareBlock("blog", "What's included?", "<p>Article listings, individual article pages and dashboard content management. Selecting it adds one dashboard service integration.</p>")}`,
  });
  const newsletter = groupShell({
    id: "newsletter", visual: "newsletter", title: "Newsletter signup. Grow your audience.", intro: "Collect subscribers through a clear, accessible signup form.",
    content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "newsletter", selected: state.newsletter, title: "Newsletter signup", description: "Collect and manage subscribers. Campaign sending is separate.", price: "$20–30" })}</div>${compareBlock("newsletter", "What's included?", "<p>Subscriber collection and dashboard management. Email campaign design and sending are separate. Selecting it adds one dashboard service integration.</p>")}`,
  });
  return sectionShell({ id: "customers", number: "03 · Customers & communication", title: "Build lasting relationships.", intro: "Give customers a secure place to return and simple ways to hear from you.", visual: "accounts", content: accounts + contact + blog + newsletter });
}

function renderManagingSection() {
  const search = groupShell({
    id: "search", visual: "search", title: "Search. Help people find what matters.", intro: "Add search across supported website pages and content.",
    content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "search", selected: state.search, title: "Website search", description: "Search input, results and supported content indexing.", price: "$30" })}</div>`,
  });
  const cms = groupShell({
    id: "cms", visual: "cms", title: "Website editor. How much control would you like?", intro: "Choose occasional editing or broad visual control through the dashboard.",
    content: `<div class="option-stack">${optionRow({ group: "cms", value: "none", selected: state.cms === "none", title: "No editor", description: "Content changes require developer assistance.", price: "Included" })}${optionRow({ group: "cms", value: "basic", selected: state.cms === "basic", title: "Basic editor", description: "Edit selected text and replace selected images.", price: "$35" })}${optionRow({ group: "cms", value: "full", selected: state.cms === "full", title: "Full visual editor", description: "Edit approximately 95% of text and replace all images.", price: "$145" })}</div>${compareBlock("cms", "Basic vs Full editor", "<p><strong>Basic — $35:</strong> edit selected text and images.</p><p><strong>Full — $145:</strong> edit nearly all website text, replace every image and manage content visually.</p><p>Choose Basic for occasional updates. Choose Full if you regularly change content and want more control.</p>")}`,
  });
  const dependencies = getDashboardDependencies(state);
  const dashboard = groupShell({
    id: "dashboard", visual: "dashboard", title: "Admin dashboard. Keep everything in one place.", intro: "A private control panel for content, messages and connected services.",
    content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "dashboardExplicit", selected: state.dashboardExplicit || dependencies.length > 0, title: dependencies.length ? "Admin dashboard — required" : "Admin dashboard", description: dependencies.length ? `Required by ${dependencies.length} selected service${dependencies.length === 1 ? "" : "s"}.` : "Select it independently for a private control panel.", price: dependencies.length ? `$60 + $${dependencies.length * 10}` : "$60", disabled: dependencies.length > 0 && !state.dashboardExplicit, reason: dependencies.length ? "It remains included while dependent services are selected." : "" })}</div><p class="option-note"><strong>Transparent pricing:</strong> $60 once, plus $10 for each selected service that needs dashboard integration.</p>`,
  });
  return sectionShell({ id: "managing", number: "04 · Managing your website", title: "Stay in control.", intro: "Give visitors better navigation and choose how you manage content after launch.", visual: "search", content: search + cms + dashboard });
}

function renderGrowthSection() {
  const seo = groupShell({
    id: "seo", visual: "seo", title: "SEO. Build a stronger search foundation.", intro: "Every website includes the essentials; professional optimisation goes deeper.",
    content: `<div class="option-stack">${optionRow({ group: "seo", value: "basic", selected: state.seo === "basic", title: "Basic SEO", description: "Titles, descriptions, semantic structure and accessibility.", price: "Included" })}${optionRow({ group: "seo", value: "professional", selected: state.seo === "professional", title: "Professional SEO", description: "Detailed metadata, keyword targeting and structured data where appropriate.", price: "$75" })}</div>${compareBlock("seo", "Why upgrade?", "<p>Professional SEO adds deeper optimisation and stronger visibility foundations. Search rankings and traffic cannot be guaranteed.</p>")}`,
  });
  const analytics = groupShell({
    id: "analytics", visual: "analytics", title: "Analytics. Understand what visitors do.", intro: "Choose clear essentials or add device and trend analysis.",
    content: `<div class="option-stack">${optionRow({ group: "analytics", value: "none", selected: state.analytics === "none", title: "No analytics", description: "No visitor analytics setup.", price: "Included" })}${optionRow({ group: "analytics", value: "standard", selected: state.analytics === "standard", title: "Standard analytics", description: "Views, sessions, popular pages and key statistics.", price: "$55" })}${optionRow({ group: "analytics", value: "advanced", selected: state.analytics === "advanced", title: "Advanced analytics & trends", description: "Adds devices, trends and deeper traffic breakdowns.", price: "$75" })}</div>${compareBlock("analytics", "Compare analytics options", "<p>Standard shows what is happening. Advanced helps explain how behaviour changes and which devices people use. Available data depends on the privacy-conscious provider.</p>")}`,
  });
  return sectionShell({ id: "growth", number: "05 · Growth & insights", title: "Create room to grow.", intro: "Improve search foundations and understand how people use your website.", visual: "seo", content: seo + analytics });
}

function renderFinishingSection() {
  const google = groupShell({
    id: "google-business", visual: "googleBusiness", title: "Google Business. Be easier to find locally.", intro: "Get help creating or configuring a profile for an eligible physical business.",
    content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "googleBusiness", selected: state.googleBusiness, title: "Google Business Profile setup", description: "Configuration assistance without promises of approval or placement.", price: "$30" })}</div>`,
  });
  const socialCount = Math.max(7, Number(state.socialCount) || 7);
  const social = groupShell({
    id: "social", visual: "social", title: "Social media. Start with the right footprint.", intro: "Choose how many accounts you would like help setting up.",
    content: `<div class="option-stack">${optionRow({ group: "social", value: "none", selected: state.social === "none", title: "No social setup", price: "Included" })}${optionRow({ group: "social", value: "3", selected: state.social === "3", title: "Up to 3 accounts", price: "$30" })}${optionRow({ group: "social", value: "6", selected: state.social === "6", title: "Up to 6 accounts", price: "$45" })}${optionRow({ group: "social", value: "more", selected: state.social === "more", title: "6 accounts + extras", description: "$50 base, then $5 per account beyond six.", price: state.social === "more" ? `$${50 + (socialCount - 6) * 5}` : "$50+" })}</div>${state.social === "more" ? `<div class="revealed-field"><label class="field-label" for="social-count">Total number of accounts</label><input id="social-count" type="number" min="7" max="50" value="${socialCount}" data-social-count /></div>` : ""}${compareBlock("social", "Compare social setup tiers", "<p>Choose the smallest tier that covers the accounts you plan to use. The 6+ tier charges $50 for six, then $5 for each additional account.</p>")}`,
  });
  const extras = groupShell({
    id: "project-extras", visual: "domainAssistance", title: "Anything else before launch?", intro: "Add domain assistance and tell us about special ideas or requirements.",
    content: `<div class="option-stack">${optionRow({ type: "checkbox", key: "domainAssistance", selected: state.domainAssistance, title: "Domain & hosting assistance", description: "Registration, renewal and third-party costs are separate.", price: "To confirm" })}</div><label class="field-label" for="project-notes">Anything else you'd like us to know?</label><textarea id="project-notes" data-notes placeholder="Tell us about any special features, ideas or requirements you have in mind...">${escapeHtml(state.notes)}</textarea>`,
  });
  return sectionShell({ id: "finishing", number: "06 · Finishing touches", title: "Get ready to launch.", intro: "A few thoughtful extras can make the finished website easier to find and manage.", visual: "googleBusiness", content: google + social + extras });
}

function githubLogo() {
  return `<span class="hosting-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 .7A11.3 11.3 0 0 0 8.4 22.8c.6.1.8-.3.8-.6v-2.2c-3.4.7-4.1-1.4-4.1-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2.8.9 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.3 11.3 0 0 0 12 .7Z"/></svg></span>`;
}

function firebaseLogo() {
  return `<span class="hosting-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#ffca28" d="m3 18 2.7-16 5.1 9.7L13.3 5 21 18l-9 5Z"/><path fill="#ffa000" d="m3 18 7.8-6.3L12 23Z"/><path fill="#f57c00" d="m12 23 9-5-10.2-6.3Z"/></svg></span>`;
}

function renderHostingSection() {
  const backend = requiresBackend(state);
  const rows = `${optionRow({ group: "hosting", value: "static", selected: state.hosting === "static", title: "Static website", logo: githubLogo(), description: "Powered by GitHub Pages. Free hosting, HTTPS and custom domains within platform limits.", price: "Free", disabled: backend, reason: backend ? "Your selected features need a backend, so GitHub Pages alone isn't suitable." : "" })}${optionRow({ group: "hosting", value: "firebase", selected: state.hosting === "firebase", title: "Interactive website", logo: firebaseLogo(), description: "Powered by Google Firebase for accounts, databases and interactive services.", price: "Free*" })}${optionRow({ group: "hosting", value: "byo", selected: state.hosting === "byo", title: "Bring your own hosting", description: "Use your preferred provider or self-host with basic linking assistance.", price: "$20" })}`;
  const byo = state.hosting === "byo" ? `<div class="revealed-field"><label class="field-label" for="byo-platform">Which hosting platform would you like to use?</label><input id="byo-platform" type="text" data-byo-platform value="${escapeHtml(state.byoPlatform)}" placeholder="e.g. Vercel, Netlify, Cloudflare, your own server..." maxlength="120" />${backend ? '<p class="option-note"><strong>Compatibility check needed:</strong> Your platform must support the selected backend services.</p>' : ""}</div>` : "";
  return sectionShell({
    id: "hosting", number: "07 · Hosting & ongoing costs", title: "Choose where your website lives.", intro: "A simple decision now, with transparent limits and possible future costs.", visual: "hosting",
    content: `${mobileVisual("hosting")}<div class="option-stack">${rows}</div>${byo}${compareBlock("hosting", "Hosting limits and ongoing costs", "<p><strong>GitHub Pages</strong> is free within published limits for static sites. <strong>Firebase</strong> offers eligible free allowances, but some services or usage may require the pay-as-you-go Blaze plan. <strong>Bring your own hosting</strong> has a $20 linking fee; subscriptions and advanced server work are separate.</p>")}`,
  });
}

function hostingName() {
  return state.hosting === "static" ? "Static website — GitHub Pages" : state.hosting === "firebase" ? "Interactive website — Google Firebase" : "Customer-provided hosting";
}

function reviewRows() {
  const features = getSelectedFeatureIds(state).map((id) => PRICE_CONFIG.features[id].name);
  if (state.dashboardExplicit || getDashboardDependencies(state).length) features.push("Admin dashboard");
  const services = [];
  if (state.googleBusiness) services.push("Google Business Profile setup");
  if (state.social !== "none") services.push(`Social media setup${state.social === "more" ? ` — ${Math.max(7, Number(state.socialCount) || 7)} accounts` : state.social === "6" ? " — up to 6 accounts" : " — up to 3 accounts"}`);
  if (state.domainAssistance) services.push("Domain & hosting assistance — to be confirmed");
  return [
    ["Pages", `${getPageCount(state)} selected`],
    ["Features", features.length ? `${features.length} selected` : "No optional features"],
    ["Finishing touches", services.length ? `${services.length} selected` : "No optional services"],
    ["Hosting", hostingName()],
    ["SEO", state.seo === "professional" ? "Professional SEO" : "Basic SEO included"],
  ];
}

function renderEstimateSection() {
  const rows = reviewRows().map(([label, value]) => `<div class="review-line"><strong>${label}</strong><span>${escapeHtml(value)}</span></div>`).join("");
  return sectionShell({
    id: "estimate", number: "08 · Your website estimate", title: "Your website, your way.", intro: "Everything you've chosen, all in one place.", visual: "hosting", extraClass: "estimate-section",
    content: `<div class="review-list">${rows}</div><div class="generate-panel"><h3>Ready to see the full breakdown?</h3><p>Generate a detailed estimate locally. Nothing is submitted and no account is required.</p><button class="generate-button" type="button" data-generate>Generate my estimate</button></div>${state.generated ? renderQuote() : ""}`,
  });
}

function renderQuote() {
  const estimate = calculateEstimate(state);
  const groups = [...new Set(estimate.lines.map((line) => line.group))];
  const groupHtml = groups.map((group) => `<section class="quote-group"><p class="quote-group-title">${group}</p>${estimate.lines.filter((line) => line.group === group).map((line) => `<div class="quote-line"><span>${escapeHtml(line.name)}</span><span>${line.included ? "Included" : displayPrice(line.price)}</span></div>`).join("")}</section>`).join("");
  const unpriced = estimate.unpriced.length ? `<section class="quote-group"><p class="quote-group-title">To be confirmed</p>${estimate.unpriced.map((item) => `<div class="quote-line"><span>${escapeHtml(item)}</span><span>To be confirmed</span></div>`).join("")}</section>` : "";
  const hostingDetails = state.hosting === "static"
    ? "Hosting setup: Included. Ongoing hosting: Free within GitHub Pages limits and abuse-prevention policies."
    : state.hosting === "firebase"
      ? "Hosting setup: Included. Initial hosting estimate: $0*. Free allowances may apply; usage-based Firebase charges may be payable separately."
      : `One-time linking fee: $20. Hosting subscription is paid separately by the customer.${requiresBackend(state) ? " Backend compatibility requires confirmation." : ""}`;
  const total = estimate.totals.min === estimate.totals.max ? `$${estimate.totals.min} AUD` : `$${estimate.totals.min}–${estimate.totals.max} AUD`;
  return `<article class="quote-panel" id="generated-quote" tabindex="-1"><header class="quote-header"><div><p class="section-number">BuiltByMatthew</p><h3>Indicative estimate</h3></div><p>${new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(new Date())}</p></header>${groupHtml}${unpriced}<section class="quote-group"><p class="quote-group-title">Hosting & ongoing costs</p><p>${hostingDetails}</p>${state.byoPlatform ? `<p>Preferred platform: ${escapeHtml(state.byoPlatform)}</p>` : ""}</section>${state.notes.trim() ? `<section class="quote-group"><p class="quote-group-title">Other requests</p><p>${escapeHtml(state.notes).replaceAll("\n", "<br>")}</p></section>` : ""}<div class="quote-total"><span>${estimate.unpriced.length ? "Priced subtotal" : "Estimated total"}</span><strong>${total}</strong></div>${estimate.unpriced.length ? '<p><strong>Complete total: Subject to confirmation.</strong></p>' : ""}<p class="quote-notice">This is an indicative estimate, not a final quote. Final pricing will be confirmed after reviewing your project requirements. Domain, hosting and third-party service fees may be additional.</p><div class="quote-actions"><button class="quote-action" type="button" data-copy>Copy estimate</button><button class="quote-action" type="button" data-edit>Edit selections</button><button class="quote-action" type="button" data-print>Print estimate</button><button class="quote-action" type="button" data-reset>Start again</button></div></article>`;
}

function captureOpenComparisons() {
  return new Set(Array.from(document.querySelectorAll("[data-comparison][open]"), (item) => item.dataset.comparison));
}

function restoreOpenComparisons(open) {
  open.forEach((id) => document.querySelector(`[data-comparison="${CSS.escape(id)}"]`)?.setAttribute("open", ""));
}

function renderAll({ preserveScroll = false, focusKey = "" } = {}) {
  const y = scrollY;
  const open = captureOpenComparisons();
  flow.innerHTML = [renderPagesSection(), renderSellingSection(), renderCustomersSection(), renderManagingSection(), renderGrowthSection(), renderFinishingSection(), renderHostingSection()].join("");
  estimateContainer.innerHTML = renderEstimateSection();
  restoreOpenComparisons(open);
  hydrateVisualImages();
  updateSummaryBar();
  initVisualObserver();
  if (!visualStage.children.length) setActiveVisual(activeVisual, true);
  if (preserveScroll) window.scrollTo({ top: y, behavior: "auto" });
  if (focusKey) requestAnimationFrame(() => {
    const target = focusKey === "last-extra"
      ? Array.from(document.querySelectorAll("[data-extra-name]")).at(-1)
      : document.querySelector(focusKey);
    target?.focus({ preventScroll: true });
  });
  window.__CONFIGURATOR_STATE__ = state;
  window.__CONFIGURATOR_ESTIMATE__ = calculateEstimate(state);
}

function updateSummaryBar() {
  const estimate = calculateEstimate(state);
  const featureCount = getSelectedFeatureIds(state).length + (state.dashboardExplicit || getDashboardDependencies(state).length ? 1 : 0);
  barSelection.textContent = `${getPageCount(state)} page${getPageCount(state) === 1 ? "" : "s"} · ${featureCount} feature${featureCount === 1 ? "" : "s"}`;
  barTotal.textContent = estimate.totals.min === estimate.totals.max ? `$${estimate.totals.min} AUD` : `$${estimate.totals.min}–${estimate.totals.max} AUD`;
  barTotal.animate?.([{ opacity: 0.45, transform: "translateY(2px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: reduceMotion.matches ? 1 : 180, easing: "ease-out" });
}

function mutate(mutator, noticeMessage = "", focusKey = "") {
  state.notice = "";
  mutator(state);
  state.generated = false;
  normaliseState(state);
  if (noticeMessage) state.notice = state.notice ? `${noticeMessage} ${state.notice}` : noticeMessage;
  renderAll({ preserveScroll: true, focusKey });
  if (state.notice) setNotice(state.notice);
}

function choosePages(value) {
  if (value === "custom") {
    mutate((draft) => {
      if (!draft.customInitialised) {
        const selectedPages = PRICE_CONFIG.presets[draft.preset].pages;
        Object.keys(draft.customPages).forEach((id) => { draft.customPages[id] = selectedPages.includes(id); });
        draft.customPages.home = true;
        draft.customInitialised = true;
      }
      draft.pagesMode = "custom";
    }, "", '[data-tier="pages"][value="custom"]');
  } else {
    mutate((draft) => { draft.pagesMode = "preset"; draft.preset = value; }, "", `[data-tier="pages"][value="${value}"]`);
  }
}

function handleTier(group, value) {
  if (group === "pages") return choosePages(value);
  if (group === "bookings") return mutate((draft) => { draft.bookings = value === "online"; }, "", `[data-tier="bookings"][value="${value}"]`);
  const dashboardTier = (group === "cms" && value !== "none") || (group === "analytics" && value !== "none") || (group === "accounts" && value === "full");
  mutate((draft) => {
    if (group === "rsvp") {
      const leavingMember = draft.rsvp === "member" && value !== "member";
      draft.rsvp = value;
      if (leavingMember && draft.accountsAutoAdded) {
        draft.accounts = "none";
        draft.accountsAutoAdded = false;
      }
    } else if (group === "hosting") {
      draft.hosting = value;
      draft.hostingWasChosen = true;
    } else {
      draft[group] = value;
      if (group === "accounts") draft.accountsAutoAdded = false;
    }
  }, dashboardTier ? "This selection includes the admin dashboard ($60 base) and one $10 service integration." : value === "byo" && requiresBackend(state) ? "We'll confirm that your hosting platform supports the selected backend features." : "", `[data-tier="${group}"][value="${value}"]`);
}

function toggleValue(key) {
  const dependencyNames = { contactForm: "contact form", blog: "blog", newsletter: "newsletter signup" };
  const willAdd = Boolean(dependencyNames[key] && !state[key]);
  mutate((draft) => {
    if (key === "dashboardExplicit" && getDashboardDependencies(draft).length && !draft.dashboardExplicit) return;
    draft[key] = !draft[key];
  }, willAdd ? `Your ${dependencyNames[key]} includes the admin dashboard ($60 base) and one $10 service integration.` : "", `[data-toggle="${key}"]`);
}

function generateQuoteText() {
  const estimate = calculateEstimate(state);
  const lines = ["BUILTBYMATTHEW — INDICATIVE ESTIMATE", ""];
  let group = "";
  estimate.lines.forEach((line) => {
    if (line.group !== group) { group = line.group; lines.push(group.toUpperCase()); }
    lines.push(`${line.name}: ${line.included ? "Included" : displayPrice(line.price)}`);
  });
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

document.addEventListener("change", (event) => {
  const input = event.target;
  if (input.matches("[data-tier]")) handleTier(input.dataset.tier, input.value);
  if (input.matches("[data-toggle]")) toggleValue(input.dataset.toggle);
  if (input.matches("[data-page]")) mutate((draft) => { draft.customInitialised = true; draft.customPages[input.dataset.page] = input.checked; }, "", `[data-page="${input.dataset.page}"]`);
  if (input.matches("[data-social-count]")) mutate((draft) => { draft.socialCount = Math.max(7, Math.min(50, Number(input.value) || 7)); }, "", "[data-social-count]");
});

document.addEventListener("input", (event) => {
  const input = event.target;
  if (input.matches("[data-extra-name]")) state.extraPages.find((item) => item.id === input.dataset.extraName).name = input.value;
  if (input.matches("[data-byo-platform]")) state.byoPlatform = input.value;
  if (input.matches("[data-notes]")) state.notes = input.value;
  state.generated = false;
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.hasAttribute("data-add-extra")) mutate((draft) => { draft.customInitialised = true; draft.extraPages.push({ id: crypto.randomUUID(), name: "" }); }, "", "last-extra");
  else if (button.dataset.removeExtra) mutate((draft) => { draft.extraPages = draft.extraPages.filter((page) => page.id !== button.dataset.removeExtra); });
  else if (button.hasAttribute("data-scroll-estimate")) document.querySelector("#estimate")?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
  else if (button.hasAttribute("data-generate")) {
    state.generated = true;
    estimateContainer.innerHTML = renderEstimateSection();
    requestAnimationFrame(() => document.querySelector("#generated-quote")?.focus());
  } else if (button.hasAttribute("data-copy")) {
    try {
      await navigator.clipboard.writeText(generateQuoteText());
      toast.textContent = "Estimate copied";
      toast.hidden = false;
      setTimeout(() => { toast.hidden = true; }, 2200);
    } catch {
      setNotice("Copying was blocked by your browser. You can select and copy the estimate manually.");
    }
  } else if (button.hasAttribute("data-print")) window.print();
  else if (button.hasAttribute("data-edit")) document.querySelector("#configuration")?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
  else if (button.hasAttribute("data-reset")) {
    state = createInitialState();
    activeVisual = "pages";
    renderAll();
    setActiveVisual("pages", true);
    document.querySelector("#configuration")?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
  }
});

preloadVisuals();
setActiveVisual("pages", true);
renderAll();
