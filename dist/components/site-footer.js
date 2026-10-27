import { footerMarkup } from "./site-footer-markup.mjs";

const componentUrl = new URL(import.meta.url);
const siteRoot = new URL("../", componentUrl);
const stylesheetUrl = new URL("./site-footer.css?v=1", componentUrl);

if (!document.querySelector('link[data-site-footer-styles]')) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = stylesheetUrl.href;
  stylesheet.dataset.siteFooterStyles = "";
  document.head.append(stylesheet);
}

class BuiltByMatthewFooter extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === "true") return;

    if (!this.querySelector(".editorial-footer")) {
      this.innerHTML = footerMarkup({ siteRoot });
    }
    this.dataset.ready = "true";
    this.querySelector("[data-footer-year]").textContent = new Date().getFullYear();

    if (document.querySelector(".estimate-bar")) {
      this.classList.add("has-fixed-estimate");
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealItems = [...this.querySelectorAll(".footer-reveal")];

    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    this.classList.add("site-footer--motion");
    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          this.revealObserver?.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6%" },
    );

    revealItems.forEach((item) => this.revealObserver.observe(item));
  }

  disconnectedCallback() {
    this.revealObserver?.disconnect();
    this.revealObserver = null;
  }
}

if (!customElements.get("builtbymatthew-footer")) {
  customElements.define("builtbymatthew-footer", BuiltByMatthewFooter);
}
