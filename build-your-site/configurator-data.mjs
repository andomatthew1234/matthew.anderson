export const PRICE_CONFIG = Object.freeze({
  currency: "AUD",
  presets: {
    home: { name: "Just a homepage", price: [50, 100], pages: ["home"] },
    about: { name: "Home + About", price: [75, 120], pages: ["home", "about"] },
    contact: {
      name: "Home + About + Contact",
      price: [105, 170],
      pages: ["home", "about", "contact"],
    },
  },
  pages: {
    home: { name: "Homepage / landing page", price: [50, 100] },
    about: { name: "About page", price: [40, 60] },
    contact: { name: "Contact page", price: [30, 50] },
    store: { name: "Store / catalogue", price: [50, 80] },
    gallery: { name: "Photo / video / music gallery", price: [50, 50] },
    events: { name: "Events page", price: [40, 40] },
    custom: { name: "Additional custom page", price: [50, 70] },
  },
  features: {
    paymentLinks: { name: "Payment links", price: [20, 20], backend: false },
    professionalCheckout: {
      name: "Professional checkout",
      price: [90, 180],
      backend: true,
    },
    publicRsvp: { name: "Events RSVP", price: [40, 80], backend: true },
    memberRsvp: { name: "Member-only events RSVP", price: [40, 80], backend: true },
    bookings: { name: "Online bookings", price: [70, 95], backend: true },
    standardAccounts: {
      name: "Standard customer accounts",
      price: [60, 95],
      backend: true,
    },
    fullAccounts: {
      name: "Full accounts & login suite",
      price: [120, 200],
      backend: true,
      dashboard: true,
    },
    contactForm: {
      name: "Contact form",
      price: [30, 50],
      backend: true,
      dashboard: true,
    },
    blog: {
      name: "Blog, journal or news feed",
      price: [60, 90],
      backend: true,
      dashboard: true,
    },
    newsletter: {
      name: "Newsletter signup",
      price: [20, 30],
      backend: true,
      dashboard: true,
    },
    search: { name: "Website search", price: [30, 30], backend: false },
    basicCms: {
      name: "Basic editor",
      price: [35, 35],
      backend: true,
      dashboard: true,
    },
    fullCms: {
      name: "Full visual editor",
      price: [145, 145],
      backend: true,
      dashboard: true,
    },
    professionalSeo: { name: "Professional SEO", price: [75, 75], backend: false },
    standardAnalytics: {
      name: "Standard analytics",
      price: [55, 55],
      backend: true,
      dashboard: true,
    },
    advancedAnalytics: {
      name: "Advanced analytics & trends",
      price: [75, 75],
      backend: true,
      dashboard: true,
    },
  },
  services: {
    googleBusiness: { name: "Google Business Profile setup", price: [30, 30] },
    social3: { name: "Social media setup — up to 3 accounts", price: [30, 30] },
    social6: { name: "Social media setup — up to 6 accounts", price: [45, 45] },
    socialMore: { name: "Social media setup — 6+ accounts", price: [50, 50] },
    domainAssistance: { name: "Domain & hosting assistance", price: null },
    byoHosting: { name: "Bring your own hosting linking fee", price: [20, 20] },
  },
  dashboard: { base: [60, 60], integration: [10, 10] },
});

// Replace these files when final artwork is ready. The UI preloads each path and
// keeps a polished labelled placeholder in place whenever an asset is unavailable.
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
});

export function createInitialState() {
  return {
    pagesMode: "preset",
    preset: "contact",
    customPages: { home: true, about: true, contact: true, store: false, gallery: false, events: false },
    customInitialised: false,
    extraPages: [],
    payments: "none",
    rsvp: "none",
    bookings: false,
    accounts: "none",
    accountsAutoAdded: false,
    contactForm: false,
    blog: false,
    newsletter: false,
    search: false,
    cms: "none",
    dashboardExplicit: false,
    seo: "basic",
    analytics: "none",
    googleBusiness: false,
    social: "none",
    socialCount: 7,
    domainAssistance: false,
    hosting: "static",
    hostingWasChosen: false,
    byoPlatform: "",
    notes: "",
    generated: false,
    notice: "",
  };
}

export function getSelectedFeatureIds(state) {
  const ids = [];
  if (state.payments === "links") ids.push("paymentLinks");
  if (state.payments === "professional") ids.push("professionalCheckout");
  if (state.rsvp === "public") ids.push("publicRsvp");
  if (state.rsvp === "member") ids.push("memberRsvp");
  if (state.bookings) ids.push("bookings");
  if (state.accounts === "standard") ids.push("standardAccounts");
  if (state.accounts === "full") ids.push("fullAccounts");
  if (state.contactForm) ids.push("contactForm");
  if (state.blog) ids.push("blog");
  if (state.newsletter) ids.push("newsletter");
  if (state.search) ids.push("search");
  if (state.cms === "basic") ids.push("basicCms");
  if (state.cms === "full") ids.push("fullCms");
  if (state.seo === "professional") ids.push("professionalSeo");
  if (state.analytics === "standard") ids.push("standardAnalytics");
  if (state.analytics === "advanced") ids.push("advancedAnalytics");
  return ids;
}

export function getDashboardDependencies(state) {
  return getSelectedFeatureIds(state).filter((id) => PRICE_CONFIG.features[id].dashboard);
}

export function requiresBackend(state) {
  return getSelectedFeatureIds(state).some((id) => PRICE_CONFIG.features[id].backend);
}

export function normaliseState(state, changedKey = "") {
  const next = state;
  const addNotice = (message) => {
    next.notice = next.notice ? `${next.notice} ${message}` : message;
  };
  if (next.rsvp === "member" && next.accounts === "none") {
    next.accounts = "standard";
    next.accountsAutoAdded = true;
    addNotice("Standard customer accounts were added because member-only RSVPs need a secure login.");
  }

  const backend = requiresBackend(next);
  if (backend && next.hosting === "static") {
    next.hosting = "firebase";
    addNotice("Interactive hosting selected — your website needs additional services to support the features you've chosen.");
  }

  if (changedKey !== "notice" && !next.notice) next.notice = "";
  return next;
}

function addLine(lines, name, price, meta = {}) {
  lines.push({ name, price, ...meta });
}

export function calculateEstimate(state) {
  const lines = [];
  const unpriced = [];

  if (state.pagesMode === "preset") {
    const preset = PRICE_CONFIG.presets[state.preset];
    addLine(lines, `${preset.name} package`, preset.price, { group: "Pages" });
  } else {
    for (const [id, selected] of Object.entries(state.customPages)) {
      if (selected) addLine(lines, PRICE_CONFIG.pages[id].name, PRICE_CONFIG.pages[id].price, { group: "Pages" });
    }
    state.extraPages.forEach((page, index) => {
      addLine(lines, page.name.trim() || `Additional custom page ${index + 1}`, PRICE_CONFIG.pages.custom.price, {
        group: "Pages",
      });
    });
  }

  for (const id of getSelectedFeatureIds(state)) {
    const feature = PRICE_CONFIG.features[id];
    addLine(lines, feature.name, feature.price, { group: "Features" });
  }

  const dashboardDependencies = getDashboardDependencies(state);
  if (state.dashboardExplicit || dashboardDependencies.length) {
    addLine(lines, "Admin dashboard", PRICE_CONFIG.dashboard.base, { group: "Required services" });
    if (dashboardDependencies.length) {
      const count = dashboardDependencies.length;
      addLine(
        lines,
        `Dashboard integrations (${count})`,
        [PRICE_CONFIG.dashboard.integration[0] * count, PRICE_CONFIG.dashboard.integration[1] * count],
        { group: "Required services" },
      );
    }
  }

  if (state.googleBusiness) addLine(lines, PRICE_CONFIG.services.googleBusiness.name, PRICE_CONFIG.services.googleBusiness.price, { group: "Finishing touches" });
  if (state.social !== "none") {
    if (state.social === "3") addLine(lines, PRICE_CONFIG.services.social3.name, PRICE_CONFIG.services.social3.price, { group: "Finishing touches" });
    if (state.social === "6") addLine(lines, PRICE_CONFIG.services.social6.name, PRICE_CONFIG.services.social6.price, { group: "Finishing touches" });
    if (state.social === "more") {
      const count = Math.max(7, Number(state.socialCount) || 7);
      const total = 50 + (count - 6) * 5;
      addLine(lines, `Social media setup — ${count} accounts`, [total, total], { group: "Finishing touches" });
    }
  }
  if (state.domainAssistance) unpriced.push(PRICE_CONFIG.services.domainAssistance.name);
  if (state.hosting === "byo") addLine(lines, PRICE_CONFIG.services.byoHosting.name, PRICE_CONFIG.services.byoHosting.price, { group: "Hosting & ongoing costs" });

  addLine(lines, "Basic SEO", [0, 0], { group: "Included", included: true });

  const totals = lines.reduce(
    (sum, line) => {
      if (!line.included) {
        sum.min += line.price[0];
        sum.max += line.price[1];
      }
      return sum;
    },
    { min: 0, max: 0 },
  );

  return {
    lines,
    unpriced,
    totals,
    dashboardDependencies,
    backendRequired: requiresBackend(state),
  };
}

export function getPageCount(state) {
  if (state.pagesMode === "preset") return PRICE_CONFIG.presets[state.preset].pages.length;
  return Object.values(state.customPages).filter(Boolean).length + state.extraPages.length;
}

export function formatPrice(price) {
  if (!price) return "To be confirmed";
  if (price[0] === 0 && price[1] === 0) return "Included";
  if (price[0] === price[1]) return `$${price[0]}`;
  return `$${price[0]}–${price[1]}`;
}
