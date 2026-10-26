export const SCHEMA_VERSION = 1;
export const PRICING_VERSION = "2026.10";

export const PRICE_CONFIG = Object.freeze({
  currency: "AUD",
  pages: {
    home: { name: "Homepage / landing page", price: [50, 100] },
    about: { name: "About page", price: [40, 60] },
    contact: { name: "Contact page", price: [30, 50] },
    store: { name: "Store / catalogue page", price: [50, 80] },
    gallery: { name: "Photo / video / music gallery", price: [50, 50] },
    events: { name: "Events page", price: [40, 40] },
    faq: { name: "FAQ page", price: [15, 15] },
    testimonials: { name: "Testimonials / reviews page", price: [30, 30] },
    team: { name: "Team / staff page", price: [15, 15] },
    services: { name: "Services & pricing page", price: [40, 40] },
    menuImage: { name: "Image-only restaurant menu", price: [10, 10] },
    menuInteractive: { name: "Interactive restaurant menu", price: null },
    careers: { name: "Careers / jobs page", price: [40, 60] },
    donations: { name: "Donations / fundraising page", price: [30, 30] },
    helpBundle: { name: "FAQ + support articles bundle", price: [40, 40] },
    helpStandard: { name: "Standard support articles", price: [30, 30] },
    helpProfessional: { name: "Professional Help Centre", price: [70, 140], backend: true },
    courses: { name: "Courses / learning page", price: [150, 150], backend: true },
    custom: { name: "Additional custom page", price: [50, 70] },
  },
  features: {
    paymentLinks: { name: "Payment links", price: [20, 20] },
    professionalCheckout: { name: "Professional checkout", price: [90, 180], backend: true },
    publicRsvp: { name: "Events RSVP", price: [40, 80], backend: true },
    memberRsvp: { name: "Member-only events RSVP", price: [40, 80], backend: true },
    bookings: { name: "Online bookings", price: [70, 95], backend: true },
    standardAccounts: { name: "Standard customer accounts", price: [60, 95], backend: true },
    fullAccounts: { name: "Full accounts & login suite", price: [120, 200], backend: true, dashboard: true },
    contactForm: { name: "Contact form", price: [30, 50], backend: true, dashboard: true },
    blog: { name: "Blog, journal or news feed", price: [60, 90], backend: true, dashboard: true },
    newsletter: { name: "Newsletter signup", price: [20, 30], backend: true, dashboard: true },
    search: { name: "Website search", price: [30, 30] },
    basicCms: { name: "Basic editor", price: [35, 35], backend: true, dashboard: true },
    fullCms: { name: "Full visual editor", price: [145, 145], backend: true, dashboard: true },
    professionalSeo: { name: "Professional SEO", price: [75, 75] },
    standardAnalytics: { name: "Standard analytics", price: [55, 55], backend: true, dashboard: true },
    advancedAnalytics: { name: "Advanced analytics & trends", price: [75, 75], backend: true, dashboard: true },
    aiLiveChat: { name: "AI-powered live chat", price: [25, 25], backend: true },
    humanLiveChat: { name: "AI chat + human live chat", price: [45, 45], backend: true },
    manualReviews: { name: "Manually managed reviews", price: [30, 30], backend: true, dashboard: true },
    customerReviews: { name: "Customer-submitted reviews", price: [45, 45], backend: true, dashboard: true },
    loyalty: { name: "Loyalty points & rewards", price: [100, 180], backend: true, dashboard: true },
    giftCards: { name: "Gift cards", price: [70, 70], backend: true, dashboard: true },
    digitalDownloads: { name: "Digital downloads", price: [50, 50], backend: true, dashboard: true },
    automatedEmails: { name: "Automated emails", price: [40, 40], backend: true, dashboard: true },
    emailBuilder: { name: "Email builder", price: [35, 35], backend: true, dashboard: true },
    standardForms: { name: "Standard polls & community forms", price: [30, 30], backend: true, dashboard: true },
    advancedForms: { name: "Advanced polls & community forms", price: [60, 60], backend: true, dashboard: true },
  },
  services: {
    googleBusiness: { name: "Google Business Profile setup", price: [30, 30] },
    social3: { name: "Social media setup — up to 3 accounts", price: [30, 30] },
    social6: { name: "Social media setup — up to 6 accounts", price: [45, 45] },
    domainAssistance: { name: "Domain & hosting assistance", price: null },
    multilingual3: { name: "Multilingual website — up to 3 languages", price: [30, 30] },
    multilingual6: { name: "Multilingual website — up to 6 languages", price: [45, 45] },
    aiTranslation: { name: "AI-powered translation", price: [5, 5] },
    humanTranslation: { name: "Professional human translation", price: null },
    byoHosting: { name: "Bring your own hosting linking fee", price: [20, 20] },
  },
  dashboard: { base: [60, 60], integration: [10, 10] },
});

export const PAGE_ORDER = Object.freeze(["home", "about", "contact", "store", "gallery", "events", "faq", "testimonials", "team", "services", "careers", "donations", "courses"]);

export const PRESET_CONFIG = Object.freeze({
  scratch: { name: "Continue without a preset", description: "Start with the required homepage and no optional features." },
  comingSoon: { name: "Coming soon", description: "A focused launch page for a business preparing to open." },
  smallBusiness: { name: "Small business", description: "A professional presence with key information and enquiries." },
  onlineStore: { name: "Online store", description: "A catalogue and professional checkout for selling products." },
  eventsCommunity: { name: "Events & community", description: "Promote events and accept public RSVPs." },
  portfolio: { name: "Portfolio", description: "Showcase work and make it easy to get in touch." },
  restaurant: { name: "Restaurant or café", description: "Share contact details and a responsive image menu." },
  onlineLearning: { name: "Online learning", description: "Courses, lessons and compatible customer accounts." },
});

export const VISUAL_CONFIG = Object.freeze({
  pages: { label: "Your website's pages", src: "../assets/configurator/pages-preview.webp" },
  paymentLinks: { label: "Payment links", src: "../assets/configurator/payment-links-preview.webp" },
  professionalPayments: { label: "Professional checkout", src: "../assets/configurator/professional-payments-preview.webp" },
  bookings: { label: "Online bookings", src: "../assets/configurator/bookings-preview.webp" },
  events: { label: "Events & RSVP", src: "../assets/configurator/events-preview.webp" },
  accounts: { label: "Customer accounts", src: "../assets/configurator/accounts-preview.webp" },
  contact: { label: "Contact form", src: "../assets/configurator/contact-preview.webp" },
  blog: { label: "Blog & news", src: "../assets/configurator/blog-preview.webp" },
  newsletter: { label: "Newsletter signup", src: "../assets/configurator/newsletter-preview.webp" },
  search: { label: "Website search", src: "../assets/configurator/search-preview.webp" },
  cms: { label: "Website editor", src: "../assets/configurator/cms-preview.webp" },
  dashboard: { label: "Admin dashboard", src: "../assets/configurator/dashboard-preview.webp" },
  analytics: { label: "Analytics & insights", src: "../assets/configurator/analytics-preview.webp" },
  seo: { label: "Search visibility", src: "../assets/configurator/seo-preview.webp" },
  googleBusiness: { label: "Google Business Profile", src: "../assets/configurator/google-business-preview.webp" },
  social: { label: "Social media accounts", src: "../assets/configurator/social-preview.webp" },
  domainAssistance: { label: "Domain & hosting assistance", src: "../assets/configurator/hosting-preview.webp" },
  hosting: { label: "Hosting & infrastructure", src: "../assets/configurator/hosting-preview.webp" },
  faq: { label: "FAQ page", src: "../assets/configurator/faq-preview.webp" },
  reviews: { label: "Reviews & testimonials", src: "../assets/configurator/reviews-preview.webp" },
  staff: { label: "Team & staff", src: "../assets/configurator/staff-preview.webp" },
  services: { label: "Services & pricing", src: "../assets/configurator/services-preview.webp" },
  menu: { label: "Restaurant menu", src: "../assets/configurator/menu-preview.webp" },
  careers: { label: "Careers & jobs", src: "../assets/configurator/careers-preview.webp" },
  donations: { label: "Donations & fundraising", src: "../assets/configurator/donations-preview.webp" },
  courses: { label: "Online courses", src: "../assets/configurator/courses-preview.webp" },
  multilingual: { label: "Multilingual website", src: "../assets/configurator/multilingual-preview.webp" },
  loyalty: { label: "Loyalty points & rewards", src: "../assets/configurator/loyalty-preview.webp" },
  giftCards: { label: "Gift cards", src: "../assets/configurator/gift-cards-preview.webp" },
  digitalDownloads: { label: "Digital downloads", src: "../assets/configurator/digital-downloads-preview.webp" },
  emailAutomation: { label: "Email builder & automated emails", src: "../assets/configurator/email-automation-preview.webp" },
  communityForms: { label: "Polls & community forms", src: "../assets/configurator/community-forms-preview.webp" },
});

const basePages = () => Object.fromEntries(PAGE_ORDER.map((id) => [id, id === "home"]));

export function createInitialState() {
  return {
    presetId: "scratch", pages: basePages(), menuTier: "none", helpTier: "none", customPageCount: 0, donationMethod: "external",
    payments: "none", rsvp: "none", bookings: false, accounts: "none", contactForm: false, blog: false, newsletter: false,
    liveChat: "none", reviews: "none", search: false, cms: "none", dashboardExplicit: false, seo: "basic", analytics: "none",
    multilingual: "none", languageCount: 7, translation: "google", loyalty: false, giftCards: false, digitalDownloads: false,
    paidDownloads: false, automatedEmails: false, emailBuilder: false, communityForms: "none", googleBusiness: false, social: "none",
    socialCount: 7, domainAssistance: false, hosting: "static", byoPlatform: "", notes: "", generated: false, notice: "",
  };
}

function selectPages(state, ids) {
  state.pages = basePages();
  ids.forEach((id) => { if (id in state.pages) state.pages[id] = true; });
}

export function applyPreset(id) {
  if (!PRESET_CONFIG[id]) throw new Error("Unknown preset");
  const state = createInitialState();
  state.presetId = id;
  if (id === "smallBusiness") { selectPages(state, ["home", "about", "contact"]); state.contactForm = true; state.hosting = "firebase"; }
  else if (id === "onlineStore") { selectPages(state, ["home", "store"]); state.payments = "professional"; state.hosting = "firebase"; }
  else if (id === "eventsCommunity") { selectPages(state, ["home", "events"]); state.rsvp = "public"; state.hosting = "firebase"; }
  else if (id === "portfolio") selectPages(state, ["home", "gallery", "contact"]);
  else if (id === "restaurant") { selectPages(state, ["home", "contact"]); state.menuTier = "image"; }
  else if (id === "onlineLearning") { selectPages(state, ["home", "courses"]); state.accounts = "standard"; state.hosting = "firebase"; }
  return normaliseState(state);
}

const tierRank = (value, order) => Math.max(0, order.indexOf(value));
const atLeastTier = (value, required, order) => order[Math.max(tierRank(value, order), tierRank(required, order))];

export function resolveDependencies(state) {
  const effective = { ...state, pages: { ...state.pages } };
  const dependencies = [];
  const requireTier = (field, required, order, owner, reason) => {
    const resolved = atLeastTier(effective[field], required, order);
    if (resolved !== effective[field]) { effective[field] = resolved; dependencies.push({ target: field, value: resolved, owner, reason }); }
  };
  if (effective.rsvp === "member") requireTier("accounts", "standard", ["none", "standard", "full"], "memberRsvp", "Member-only RSVP requires customer accounts.");
  if (effective.pages.courses) requireTier("accounts", "standard", ["none", "standard", "full"], "courses", "Courses require customer accounts.");
  if (effective.loyalty) {
    requireTier("accounts", "full", ["none", "standard", "full"], "loyalty", "Loyalty rewards require the Full accounts suite.");
    requireTier("payments", "professional", ["none", "links", "professional"], "loyalty", "Loyalty rewards require Professional checkout.");
  }
  if (effective.giftCards) requireTier("payments", "professional", ["none", "links", "professional"], "giftCards", "Gift cards require Professional checkout.");
  if (effective.digitalDownloads && effective.paidDownloads) requireTier("payments", "professional", ["none", "links", "professional"], "digitalDownloads", "Secure paid downloads require Professional checkout.");
  if (effective.pages.donations && effective.donationMethod === "checkout") requireTier("payments", "professional", ["none", "links", "professional"], "donations", "BuiltByMatthew donation checkout requires Professional checkout.");
  if (effective.emailBuilder && !effective.automatedEmails) { effective.automatedEmails = true; dependencies.push({ target: "automatedEmails", value: true, owner: "emailBuilder", reason: "Email Builder requires Automated emails." }); }
  const featureIds = getSelectedFeatureIds(effective, { resolved: true });
  const dashboardDependencies = featureIds.filter((id) => PRICE_CONFIG.features[id]?.dashboard);
  const backendReasons = featureIds.filter((id) => PRICE_CONFIG.features[id]?.backend);
  if (effective.pages.courses) backendReasons.push("courses");
  if (effective.helpTier === "professional") backendReasons.push("helpProfessional");
  return { effective, dependencies, dashboardDependencies: [...new Set(dashboardDependencies)], backendReasons: [...new Set(backendReasons)] };
}

export function normaliseState(state) {
  state.pages = { ...basePages(), ...(state.pages || {}), home: true };
  state.customPageCount = Math.max(0, Math.min(20, Number(state.customPageCount) || 0));
  state.languageCount = Math.max(7, Math.min(50, Number(state.languageCount) || 7));
  state.socialCount = Math.max(7, Math.min(50, Number(state.socialCount) || 7));
  if (resolveDependencies(state).backendReasons.length && state.hosting === "static") {
    state.hosting = "firebase";
    state.notice = "Interactive hosting selected — the features you chose need backend services.";
  }
  return state;
}

export function getSelectedFeatureIds(state, options = {}) {
  const source = options.resolved ? state : resolveDependencies(state).effective;
  const ids = [];
  if (source.payments === "links") ids.push("paymentLinks");
  if (source.payments === "professional") ids.push("professionalCheckout");
  if (source.rsvp === "public") ids.push("publicRsvp");
  if (source.rsvp === "member") ids.push("memberRsvp");
  if (source.bookings) ids.push("bookings");
  if (source.accounts === "standard") ids.push("standardAccounts");
  if (source.accounts === "full") ids.push("fullAccounts");
  if (source.contactForm) ids.push("contactForm");
  if (source.blog) ids.push("blog");
  if (source.newsletter) ids.push("newsletter");
  if (source.search) ids.push("search");
  if (source.cms === "basic") ids.push("basicCms");
  if (source.cms === "full") ids.push("fullCms");
  if (source.seo === "professional") ids.push("professionalSeo");
  if (source.analytics === "standard") ids.push("standardAnalytics");
  if (source.analytics === "advanced") ids.push("advancedAnalytics");
  if (source.liveChat === "ai") ids.push("aiLiveChat");
  if (source.liveChat === "human") ids.push("humanLiveChat");
  if (source.reviews === "manual") ids.push("manualReviews");
  if (source.reviews === "customer") ids.push("customerReviews");
  if (source.loyalty) ids.push("loyalty");
  if (source.giftCards) ids.push("giftCards");
  if (source.digitalDownloads) ids.push("digitalDownloads");
  if (source.automatedEmails) ids.push("automatedEmails");
  if (source.emailBuilder) ids.push("emailBuilder");
  if (source.communityForms === "standard") ids.push("standardForms");
  if (source.communityForms === "advanced") ids.push("advancedForms");
  return ids;
}

export const getDashboardDependencies = (state) => resolveDependencies(state).dashboardDependencies;
export const requiresBackend = (state) => resolveDependencies(state).backendReasons.length > 0;

function addLine(lines, name, price, meta = {}) { lines.push({ name, price: [...price], ...meta }); }

function addPageLines(state, lines, unpriced) {
  PAGE_ORDER.forEach((id) => { if (state.pages[id]) addLine(lines, PRICE_CONFIG.pages[id].name, PRICE_CONFIG.pages[id].price, { group: "Pages" }); });
  if (state.menuTier === "image") addLine(lines, PRICE_CONFIG.pages.menuImage.name, PRICE_CONFIG.pages.menuImage.price, { group: "Pages" });
  if (state.menuTier === "interactive") unpriced.push(PRICE_CONFIG.pages.menuInteractive.name);
  if (state.helpTier !== "none") {
    const key = state.helpTier === "bundle" ? "helpBundle" : state.helpTier === "standard" ? "helpStandard" : "helpProfessional";
    addLine(lines, PRICE_CONFIG.pages[key].name, PRICE_CONFIG.pages[key].price, { group: "Pages" });
  }
  if (state.customPageCount) addLine(lines, `Additional custom pages (${state.customPageCount})`, [PRICE_CONFIG.pages.custom.price[0] * state.customPageCount, PRICE_CONFIG.pages.custom.price[1] * state.customPageCount], { group: "Pages", quantity: state.customPageCount });
}

export function calculateEstimate(state) {
  const resolved = resolveDependencies(state);
  const effective = resolved.effective;
  const lines = [];
  const unpriced = [];
  const ongoingCharges = [];
  addPageLines(effective, lines, unpriced);
  const autoTargets = new Set(resolved.dependencies.map((item) => item.target));
  const featureTargets = { professionalCheckout: "payments", standardAccounts: "accounts", fullAccounts: "accounts", automatedEmails: "automatedEmails" };
  for (const id of getSelectedFeatureIds(effective, { resolved: true })) {
    const feature = PRICE_CONFIG.features[id];
    addLine(lines, feature.name, feature.price, { group: "Features", autoAdded: autoTargets.has(featureTargets[id] || id) });
  }
  if (effective.multilingual !== "none") {
    if (effective.multilingual === "3") addLine(lines, PRICE_CONFIG.services.multilingual3.name, PRICE_CONFIG.services.multilingual3.price, { group: "Languages" });
    if (effective.multilingual === "6") addLine(lines, PRICE_CONFIG.services.multilingual6.name, PRICE_CONFIG.services.multilingual6.price, { group: "Languages" });
    if (effective.multilingual === "more") { const total = 50 + (effective.languageCount - 6) * 2; addLine(lines, `Multilingual website — ${effective.languageCount} languages`, [total, total], { group: "Languages", quantity: effective.languageCount }); }
    if (effective.translation === "ai") addLine(lines, PRICE_CONFIG.services.aiTranslation.name, PRICE_CONFIG.services.aiTranslation.price, { group: "Languages" });
    if (effective.translation === "human") unpriced.push(PRICE_CONFIG.services.humanTranslation.name);
  }
  if (effective.dashboardExplicit || resolved.dashboardDependencies.length) {
    addLine(lines, "Admin dashboard", PRICE_CONFIG.dashboard.base, { group: "Required services" });
    if (resolved.dashboardDependencies.length) {
      const count = resolved.dashboardDependencies.length;
      addLine(lines, `Dashboard integrations (${count})`, [10 * count, 10 * count], { group: "Required services", quantity: count });
    }
  }
  if (effective.googleBusiness) addLine(lines, PRICE_CONFIG.services.googleBusiness.name, PRICE_CONFIG.services.googleBusiness.price, { group: "Finishing touches" });
  if (effective.social === "3") addLine(lines, PRICE_CONFIG.services.social3.name, PRICE_CONFIG.services.social3.price, { group: "Finishing touches" });
  if (effective.social === "6") addLine(lines, PRICE_CONFIG.services.social6.name, PRICE_CONFIG.services.social6.price, { group: "Finishing touches" });
  if (effective.social === "more") { const total = 50 + (effective.socialCount - 6) * 5; addLine(lines, `Social media setup — ${effective.socialCount} accounts`, [total, total], { group: "Finishing touches", quantity: effective.socialCount }); }
  if (effective.domainAssistance) unpriced.push(PRICE_CONFIG.services.domainAssistance.name);
  if (effective.hosting === "byo") addLine(lines, PRICE_CONFIG.services.byoHosting.name, PRICE_CONFIG.services.byoHosting.price, { group: "Hosting & ongoing costs" });
  addLine(lines, "Basic SEO", [0, 0], { group: "Included", included: true });
  if (["ai", "human"].includes(effective.liveChat)) ongoingCharges.push("AI provider and chat-service charges may apply.");
  if (effective.translation === "ai") ongoingCharges.push("AI translation provider charges may apply; automatic translations should be reviewed.");
  if (effective.automatedEmails) ongoingCharges.push("Email delivery-provider charges are separate.");
  if (effective.helpTier === "professional") ongoingCharges.push("AI provider usage for the Professional Help Centre is separate.");
  if (effective.hosting === "firebase") ongoingCharges.push("Firebase free allowances may apply; usage-based charges are possible.");
  if (effective.hosting === "byo") ongoingCharges.push("Customer-provided hosting subscriptions are paid separately.");
  const totals = lines.reduce((sum, line) => {
    if (!line.included) { sum.min += line.price[0]; sum.max += line.price[1]; }
    return sum;
  }, { min: 0, max: 0 });
  return { lines, unpriced, totals, dependencies: resolved.dependencies, dashboardDependencies: resolved.dashboardDependencies, backendRequired: resolved.backendReasons.length > 0, backendReasons: resolved.backendReasons, ongoingCharges: [...new Set(ongoingCharges)] };
}

export function getPageCount(state) {
  return PAGE_ORDER.filter((id) => state.pages?.[id]).length + (state.menuTier !== "none" ? 1 : 0) + (state.helpTier !== "none" ? 1 : 0) + (Number(state.customPageCount) || 0);
}

export function formatPrice(price) {
  if (!price) return "To be confirmed";
  if (price[0] === 0 && price[1] === 0) return "Included";
  return price[0] === price[1] ? `$${price[0]}` : `$${price[0]}–${price[1]}`;
}

export function serialisableState(state) {
  const clean = createInitialState();
  Object.keys(clean).forEach((key) => {
    if (["generated", "notice", "notes"].includes(key)) return;
    if (key === "pages") clean.pages = { ...basePages(), ...(state.pages || {}), home: true };
    else if (Object.hasOwn(state, key)) clean[key] = state[key];
  });
  clean.generated = false; clean.notice = ""; clean.notes = "";
  return normaliseState(clean);
}
