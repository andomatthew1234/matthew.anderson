const siteRoot = new URL("../", import.meta.url);
const link = (path = "") => new URL(path, siteRoot).href;

class BuiltByMatthewMobileNavigation extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === "true") return;
    this.dataset.ready = "true";
    this.parentElement?.classList.add("has-mobile-navigation");
    this.innerHTML = `
      <button class="mobile-nav__trigger" type="button" aria-expanded="false" aria-controls="mobile-nav-panel">
        <span>Menu</span><span class="mobile-nav__trigger-lines" aria-hidden="true"></span>
      </button>
      <div class="mobile-nav__panel" id="mobile-nav-panel" role="dialog" aria-modal="true" aria-label="Site menu" aria-hidden="true" inert>
        <div class="mobile-nav__top">
          <a class="mobile-nav__brand" href="${link()}">
            <img src="${link("favicon.png")}" alt="" aria-hidden="true" />
            <span>builtbymatthew</span>
          </a>
          <button class="mobile-nav__close" type="button" aria-label="Close menu"><span aria-hidden="true">×</span></button>
        </div>
        <nav class="mobile-nav__links" aria-label="Mobile menu">
          <a href="${link()}">Home</a>
          <a href="${link("#work")}">My work</a>
          <a class="mobile-nav__build" href="${link("build-your-site/")}">Build your site</a>
          <a href="${link("#contact")}">Contact</a>
        </nav>
        <div class="mobile-nav__meta">
          <a href="${link("terms/")}">Terms &amp; conditions</a>
          <span>Melbourne, Australia</span>
        </div>
      </div>`;

    this.trigger = this.querySelector(".mobile-nav__trigger");
    this.panel = this.querySelector(".mobile-nav__panel");
    this.closeButton = this.querySelector(".mobile-nav__close");
    this.focusable = [...this.panel.querySelectorAll("a, button")];
    this.trigger.addEventListener("click", () => this.open());
    this.closeButton.addEventListener("click", () => this.close(true));
    this.panel.addEventListener("click", (event) => {
      if (event.target.closest("a")) this.close(true);
    });
    this.keyHandler = (event) => this.onKeydown(event);
    window.addEventListener("keydown", this.keyHandler);
    this.media = window.matchMedia("(min-width: 901px)");
    this.mediaHandler = (event) => { if (event.matches) this.close(false); };
    this.media.addEventListener("change", this.mediaHandler);
  }

  disconnectedCallback() {
    document.documentElement.classList.remove("mobile-menu-open");
    this.parentElement?.classList.remove("has-mobile-navigation");
    window.removeEventListener("keydown", this.keyHandler);
    this.media?.removeEventListener("change", this.mediaHandler);
  }

  open() {
    this.trigger.setAttribute("aria-expanded", "true");
    this.panel.setAttribute("aria-hidden", "false");
    this.panel.removeAttribute("inert");
    this.panel.dataset.open = "true";
    document.documentElement.classList.add("mobile-menu-open");
    requestAnimationFrame(() => this.closeButton.focus());
  }

  close(restoreFocus = true) {
    if (this.trigger?.getAttribute("aria-expanded") !== "true") return;
    this.trigger.setAttribute("aria-expanded", "false");
    this.panel.setAttribute("aria-hidden", "true");
    this.panel.setAttribute("inert", "");
    delete this.panel.dataset.open;
    document.documentElement.classList.remove("mobile-menu-open");
    if (restoreFocus) this.trigger.focus();
  }

  onKeydown(event) {
    if (this.trigger?.getAttribute("aria-expanded") !== "true") return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.close(true);
      return;
    }
    if (event.key !== "Tab") return;
    const first = this.focusable[0];
    const last = this.focusable[this.focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

if (!customElements.get("builtbymatthew-mobile-nav")) {
  customElements.define("builtbymatthew-mobile-nav", BuiltByMatthewMobileNavigation);
}
